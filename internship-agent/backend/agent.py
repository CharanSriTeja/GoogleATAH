"""
Root agent definition. This is the "brain" -- it decides which tools to call
and in what order based on the instruction below. Each tool is a plain
Python function (see tools/); ADK generates the function-calling schema
automatically from type hints and docstrings.

Human-in-the-loop design (see README): the agent stops and returns control
to the user before any irreversible action -- submitting an application or
sending an email. Those are represented as separate confirm_* tool calls
that the frontend only invokes after explicit user approval, rather than
being bundled inside the drafting tools themselves.
"""

# pyrefly: ignore [missing-import]
from google.adk import Agent

from tools.parse_jd import fetch_jd_text, parse_jd
from tools.tailor_resume import tailor_resume
from tools.firestore_state import (
    save_application,
    update_status,
    get_due_followups,
    get_application,
    find_applications,
    get_candidate_profile,
)
from tools.autofill_greenhouse import autofill_greenhouse_form
from tools.generate_resume import generate_resume_pdf
from tools.gmail_tools import send_outreach_email, check_thread_for_reply


INSTRUCTION = """You are an autonomous internship/job application agent.

Given a job posting (as raw JD text or a URL), you:

0. Call get_candidate_profile to load the candidate's stored profile (skills, base resume, contact info). Use these details exclusively; never hallucinate candidate details.
1. If given a URL, call fetch_jd_text first, then parse_jd on the result.
   If given raw JD text, call parse_jd directly.
2. Call tailor_resume with the candidate profile and the parsed JD.
   NEVER claim the candidate has a skill they don't -- always surface real
   skill_gaps instead.
3. Call save_application to record this application in Firestore with
   status "drafted". This returns the application_id.
4. Call generate_resume_pdf using the application_id, candidate profile, and tailored bullets to generate the PDF resume.
5. If the JD included a Greenhouse application URL, call
   autofill_greenhouse_form to fill in what you can, passing the resume_pdf_path returned by generate_resume_pdf. Report back exactly
   which fields were filled and which need the candidate's manual input --
   do NOT claim the form was submitted; it never is automatically.
6. Draft an outreach email (do not send it yet) and present it to the user
   for confirmation. Only call send_outreach_email after the user has
   explicitly approved the draft in this conversation.
7. After sending, call update_status with status "submitted" or
   "awaiting_reply" and a follow_up_in_days value (default 6) so the agent
   can autonomously check back later.

When re-invoked later (e.g. by the follow-up scheduler) with an
application_id, call get_application to load context, then
check_thread_for_reply to see if the candidate got a response. If there's a
reply, classify it and update_status accordingly. If there's no reply and
the follow-up date has passed, draft a polite follow-up email for the user
to approve -- again, never send without confirmation.

Always be explicit and honest in your summaries: state what you did
autonomously, what you're asking the user to confirm, and any skill gaps or
form fields you could not fill.

When the candidate refers to an application by company or role name
rather than an application_id, call find_applications first to
resolve it. If more than one match is returned, ask the candidate to
clarify before taking any action on it.
"""

root_agent = Agent(
    name="internship_application_agent",
    model="gemini-3.5-flash-lite",
    description="Autonomous agent that tailors resumes, fills applications, "
    "sends outreach, and tracks status for job/internship applications.",
    instruction=INSTRUCTION,
    tools=[
        get_candidate_profile,
        fetch_jd_text,
        parse_jd,
        tailor_resume,
        save_application,
        update_status,
        get_due_followups,
        get_application,
        find_applications,
        generate_resume_pdf,
        autofill_greenhouse_form,
        send_outreach_email,
        check_thread_for_reply,
    ],
)
