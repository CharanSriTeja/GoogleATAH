"""
Firestore-backed application state tracking.

Schema (collection: "applications", doc id = auto-generated):
{
  "company": str,
  "role": str,
  "jd_summary": str,
  "match_score": float,        # 0-1, how well candidate skills fit the JD
  "skill_gaps": list[str],     # honest gaps, never fabricated
  "status": str,                # "drafted" | "submitted" | "awaiting_reply"
                                 # | "interview" | "rejected" | "no_response"
  "job_url": str | None,
  "resume_variant_path": str | None,
  "created_at": datetime,
  "updated_at": datetime,
  "follow_up_date": datetime | None,
  "email_thread_id": str | None,   # Gmail thread id, for reply tracking
}

This module is intentionally framework-agnostic (plain functions) so it can be
passed straight into an ADK Agent's `tools=[...]` list — ADK builds the tool
schema from type hints + docstring.
"""

from datetime import datetime, timedelta
from typing import Optional

import contextvars
from firebase_admin import firestore

_db = None

current_uid: contextvars.ContextVar[str] = contextvars.ContextVar("current_uid", default="default")

def _client():
    global _db
    if _db is None:
        _db = firestore.client()
    return _db

def _app_collection():
    return _client().collection("users").document(current_uid.get()).collection("applications")


def save_application(
    company: str,
    role: str,
    jd_summary: str,
    match_score: float,
    skill_gaps: list[str],
    job_url: Optional[str] = None,
) -> dict:
    """Create a new application record in Firestore with status 'drafted'.

    Args:
        company: Company name.
        role: Job/internship title.
        jd_summary: Short summary of the JD (2-3 sentences).
        match_score: 0-1 score of how well the candidate's skills fit.
        skill_gaps: List of skills the JD wants that the candidate doesn't have.
        job_url: Original posting URL, if any.

    Returns:
        dict with the new application's id and status.
    """
    now = datetime.utcnow()
    doc_ref = _app_collection().document()
    doc_ref.set(
        {
            "company": company,
            "role": role,
            "jd_summary": jd_summary,
            "match_score": match_score,
            "skill_gaps": skill_gaps,
            "status": "drafted",
            "job_url": job_url,
            "resume_pdf_url": None,
            "created_at": now,
            "updated_at": now,
            "follow_up_date": None,
            "email": {
                "sent": False,
                "thread_id": None
            },
            "form": {
                "platform": None,
                "agent_filled_fields": [],
                "agent_unfilled_fields": [],
                "candidate_filled_fields": [],
                "candidate_confirmed_submitted": False,
                "screenshot_path": None
            }
        }
    )
    return {"application_id": doc_ref.id, "status": "drafted"}


def update_status(
    application_id: str,
    status: str,
    follow_up_in_days: Optional[int] = None,
    email_thread_id: Optional[str] = None,
) -> dict:
    """Update an application's status, optionally scheduling a follow-up.

    Args:
        application_id: Firestore document id of the application.
        status: New status, e.g. "submitted", "awaiting_reply", "interview",
            "rejected", "no_response".
        follow_up_in_days: If set, schedules a follow-up N days from now.
        email_thread_id: Gmail thread id to associate for reply tracking.

    Returns:
        dict confirming the update.
    """
    updates = {"status": status, "updated_at": datetime.utcnow()}
    if follow_up_in_days is not None:
        updates["follow_up_date"] = datetime.utcnow() + timedelta(days=follow_up_in_days)
    if email_thread_id is not None:
        updates["email.thread_id"] = email_thread_id
        updates["email.sent"] = True

    _app_collection().document(application_id).update(updates)
    return {"application_id": application_id, "updated": updates}

def record_agent_autofill_result(
    application_id: str,
    platform: str,
    agent_filled_fields: list[str],
    agent_unfilled_fields: list[str],
    screenshot_path: Optional[str] = None
) -> dict:
    updates = {
        "status": "form_in_progress",
        "updated_at": datetime.utcnow(),
        "form.platform": platform,
        "form.agent_filled_fields": agent_filled_fields,
        "form.agent_unfilled_fields": agent_unfilled_fields,
        "form.screenshot_path": screenshot_path,
    }
    _app_collection().document(application_id).update(updates)
    return {"application_id": application_id, "status": "form_in_progress"}

def record_candidate_form_completion(
    application_id: str,
    candidate_filled_fields: list[str],
    confirmed_submitted: bool
) -> dict:
    updates = {
        "updated_at": datetime.utcnow(),
        "form.candidate_filled_fields": candidate_filled_fields,
        "form.candidate_confirmed_submitted": confirmed_submitted,
    }
    if confirmed_submitted:
        updates["status"] = "submitted"
        
    _app_collection().document(application_id).update(updates)
    return {"application_id": application_id, "updated": updates}


def get_due_followups() -> list[dict]:
    """Return all applications whose follow_up_date has passed and are still open.

    Used by the Cloud Scheduler-triggered job to find applications that need
    an autonomous follow-up drafted, without the candidate asking.

    Returns:
        List of application records (dicts, including their Firestore id).
    """
    now = datetime.utcnow()
    open_statuses = {"submitted", "awaiting_reply"}
    results = []
    docs = (
        _app_collection()
        .where("follow_up_date", "<=", now)
        .stream()
    )
    for doc in docs:
        data = doc.to_dict()
        if data.get("status") in open_statuses:
            data["application_id"] = doc.id
            results.append(data)
    return results


def get_application(application_id: str) -> dict:
    """Fetch a single application record by id.

    Args:
        application_id: Firestore document id.

    Returns:
        The application record as a dict, or an error dict if not found.
    """
    doc = _app_collection().document(application_id).get()
    if not doc.exists:
        return {"error": f"No application found with id {application_id}"}
    data = doc.to_dict()
    data["application_id"] = doc.id
    return data

def find_applications(company: str = None, role: str = None) -> list[dict]:
    """Search the candidate's existing applications by company
    and/or role name (case-insensitive partial match) so the agent
    can resolve a natural-language reference like 'my Sezzle
    application' to a specific application_id. Returns a list of
    matching application summaries (application_id, company, role,
    status) -- if multiple match, the agent should ask the
    candidate to clarify which one before acting.
    """
    results = []
    # Fetch all applications for the user since Firestore doesn't support
    # case-insensitive substring queries natively. We filter locally.
    docs = _app_collection().stream()
    for doc in docs:
        data = doc.to_dict()
        match = True
        if company and company.lower() not in data.get("company", "").lower():
            match = False
        if role and role.lower() not in data.get("role", "").lower():
            match = False
        if match:
            created_at_val = data.get("created_at")
            results.append({
                "application_id": doc.id,
                "company": data.get("company"),
                "role": data.get("role"),
                "status": data.get("status"),
                "created_at": created_at_val.isoformat() if created_at_val else None
            })
    return results

def get_candidate_profile() -> dict:
    """Fetch the current candidate's stored profile, including their skills, contact info, and base resume text.
    You MUST call this tool when you need to know the candidate's details for tailoring a resume, filling a form, or answering profile questions.
    """
    doc = _client().collection("users").document(current_uid.get()).collection("profile").document("default").get()
    if not doc.exists:
        return {"error": "Profile not found."}
    return doc.to_dict()
