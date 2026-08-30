"""
Gmail API tools: send outreach email, and check for replies on tracked
application threads so the agent can update status autonomously.

Auth: uses a local OAuth flow (credentials.json + token.json) for the
hackathon demo. In a production deploy this would move to a service
account with domain-wide delegation, but user-consent OAuth is the
correct, honest choice for "send email as the candidate."
"""

import base64
import json
import os
import re
from email.mime.text import MIMEText

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
]
TOKEN_PATH = "token.json"
CREDS_PATH = "credentials.json"


def _get_service():
    creds = None
    if os.path.exists(TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CREDS_PATH, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_PATH, "w") as f:
            f.write(creds.to_json())
    return build("gmail", "v1", credentials=creds)


def send_outreach_email(to: str, subject: str, body: str) -> dict:
    """Send an outreach email on the candidate's behalf.

    IMPORTANT: the calling agent should have already surfaced this draft to
    the candidate for confirmation before invoking this tool -- sending
    email is an irreversible action per the project's human-in-the-loop design.

    Args:
        to: Recipient email address.
        subject: Email subject line.
        body: Email body text.

    Returns:
        dict with the Gmail thread_id, for tracking replies against this
        application.
    """
    service = _get_service()
    message = MIMEText(body)
    message["to"] = to
    message["subject"] = subject
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    sent = service.users().messages().send(userId="me", body={"raw": raw}).execute()
    return {"message_id": sent["id"], "thread_id": sent["threadId"]}


def check_thread_for_reply(thread_id: str) -> dict:
    """Check a Gmail thread for new replies and classify them.

    Args:
        thread_id: Gmail thread id returned by send_outreach_email.

    Returns:
        dict with "has_reply": bool, and if true, "classification":
        one of "interview" | "rejection" | "info_request" | "unclear",
        plus "snippet" of the reply.
    """
    service = _get_service()
    thread = service.users().threads().get(userId="me", id=thread_id).execute()
    messages = thread.get("messages", [])
    if len(messages) <= 1:
        return {"has_reply": False}

    latest = messages[-1]
    snippet = latest.get("snippet", "")
    classification = _classify_reply(snippet)
    return {"has_reply": True, "classification": classification, "snippet": snippet}


def _classify_reply(snippet: str) -> str:
    """Classify a reply snippet using Gemini. Kept simple/keyword-first with
    an LLM fallback so this doesn't burn a model call on obvious cases."""
    lowered = snippet.lower()
    if any(w in lowered for w in ["interview", "schedule a call", "next steps"]):
        return "interview"
    if any(w in lowered for w in ["unfortunately", "not moving forward", "other candidates"]):
        return "rejection"

    from google import genai

    client = genai.Client()
    prompt = (
        "Classify this email reply snippet as exactly one word: "
        "interview, rejection, info_request, or unclear.\n\n"
        f"Snippet: {snippet}"
    )
    response = client.models.generate_content(model="gemini-1.5-flash", contents=prompt)
    label = response.text.strip().lower()
    return label if label in {"interview", "rejection", "info_request", "unclear"} else "unclear"
