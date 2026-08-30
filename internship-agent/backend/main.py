import os
import json
import re
import base64
import asyncio
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from datetime import datetime
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

import firebase_admin
from firebase_admin import credentials, auth as firebase_auth

load_dotenv(".env")

# Initialize Firebase Admin
try:
    if not firebase_admin._apps:
        cred = credentials.Certificate("fourth-splice-506406-p8-firebase-adminsdk-fbsvc-2bcbc288f7.json")
        firebase_admin.initialize_app(cred)
except Exception as e:
    print(f"Failed to initialize Firebase Admin: {e}")
    # Allow app to start without it for local dev, but auth will fail

from tools.firestore_state import (
    _client, save_application, update_status, get_due_followups, get_application,
    record_agent_autofill_result, record_candidate_form_completion, current_uid, _app_collection
)
from agent import root_agent

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part
from firebase_admin import firestore
from google import genai

app = FastAPI(title="Internship Agent Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

session_service = InMemorySessionService()
runner = Runner(agent=root_agent, app_name="internship_agent", session_service=session_service)

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        decoded_token = firebase_auth.verify_id_token(token, clock_skew_seconds=60)
        uid = decoded_token['uid']
        current_uid.set(uid) # Set contextvar for firestore_state
        return uid
    except Exception as e:
        print(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")


class CandidateProfile(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: str
    linkedin_url: str
    github_url: str
    education: str
    skills: List[str]
    projects: List[Dict[str, Any]]
    base_resume_text: str

class StreamRequest(BaseModel):
    session_id: str
    message: str

class AddLinkRequest(BaseModel):
    job_url: str

class SendEmailRequest(BaseModel):
    subject: str
    body: str

class ConfirmSubmissionRequest(BaseModel):
    candidate_filled_fields: List[str] = []
    confirmed_submitted: bool = False

def _profile_ref(uid: str):
    return _client().collection("users").document(uid).collection("profile").document("default")


@app.get("/profile")
async def get_profile(uid: str = Depends(get_current_user)):
    doc = _profile_ref(uid).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Candidate profile not found.")
    return doc.to_dict()

@app.post("/onboard")
async def onboard(profile: CandidateProfile, uid: str = Depends(get_current_user)):
    _profile_ref(uid).set(profile.model_dump())
    return {"status": "success"}

@app.patch("/profile")
async def update_profile(profile_updates: dict, uid: str = Depends(get_current_user)):
    _profile_ref(uid).update(profile_updates)
    return {"status": "success"}


async def _stream_agent_response(uid: str, session_id: str, message: str):
    current_uid.set(uid)
    existing = await session_service.get_session(
        app_name="internship_agent",
        user_id=uid,
        session_id=session_id
    )
    if existing is None:
        await session_service.create_session(
            app_name="internship_agent",
            user_id=uid,
            session_id=session_id
        )

    new_message = Content(role="user", parts=[Part(text=message)])

    async for event in runner.run_async(
        user_id=uid,
        session_id=session_id,
        new_message=new_message,
    ):
        calls = event.get_function_calls()
        responses = event.get_function_responses()
        
        if calls:
            for call in calls:
                event_data = {
                    "type": "tool_call",
                    "name": call.name,
                    "args": call.args
                }
                yield f"data: {json.dumps(event_data)}\n\n"
        elif responses:
            event_data = {
                "type": "tool_result"
            }
            yield f"data: {json.dumps(event_data)}\n\n"
        elif event.is_final_response() and event.content and event.content.parts:
            text = "".join([p.text for p in event.content.parts if p.text])
            if text:
                event_data = {
                    "type": "agent_message",
                    "text": text
                }
                yield f"data: {json.dumps(event_data)}\n\n"

@app.post("/applications/stream")
async def stream_application(req: StreamRequest, uid: str = Depends(get_current_user)):
    return StreamingResponse(
        _stream_agent_response(uid, req.session_id, req.message), 
        media_type="text/event-stream"
    )

@app.post("/chat/stream")
async def chat_stream(req: StreamRequest, uid: str = Depends(get_current_user)):
    return StreamingResponse(
        _stream_agent_response(uid, req.session_id, req.message), 
        media_type="text/event-stream"
    )


@app.post("/applications/{id}/add-link")
async def add_link(id: str, req: AddLinkRequest, uid: str = Depends(get_current_user)):
    app_data = get_application(id)
    if "error" in app_data:
        raise HTTPException(status_code=404, detail="Application not found")
        
    _app_collection().document(id).update({
        "job_url": req.job_url,
        "updated_at": datetime.utcnow()
    })
    return {"status": "success", "job_url": req.job_url, "can_autofill": True}

@app.post("/applications/{id}/autofill")
async def manual_autofill(id: str, uid: str = Depends(get_current_user)):
    app_data = get_application(id)
    if "error" in app_data:
        raise HTTPException(status_code=404, detail="Application not found")
        
    job_url = app_data.get("job_url")
    if not job_url:
        raise HTTPException(status_code=400, detail="No job URL attached to this application")
        
    profile_doc = _profile_ref(uid).get()
    if not profile_doc.exists:
        raise HTTPException(status_code=400, detail="Candidate profile not found")
    profile = profile_doc.to_dict()
    
    import tempfile
    resume_path = os.path.join(tempfile.gettempdir(), f"resume_{uid}.txt")
    with open(resume_path, "w") as f:
        f.write(profile.get("base_resume_text", "Candidate Resume"))
        
    from tools.autofill_greenhouse import autofill_greenhouse_form
    result = await autofill_greenhouse_form(job_url, profile, resume_path)
    
    screenshot_path = result.get("screenshot_path")
    screenshot_b64 = None
    if screenshot_path and os.path.exists(screenshot_path):
        with open(screenshot_path, "rb") as f:
            screenshot_b64 = base64.b64encode(f.read()).decode('utf-8')
    
    result["screenshot_base64"] = screenshot_b64
    return result


@app.post("/applications/{id}/confirm-submission")
async def confirm_submission(id: str, req: ConfirmSubmissionRequest, uid: str = Depends(get_current_user)):
    return record_candidate_form_completion(
        application_id=id,
        candidate_filled_fields=req.candidate_filled_fields,
        confirmed_submitted=req.confirmed_submitted
    )

@app.get("/applications")
async def list_applications(uid: str = Depends(get_current_user)):
    docs = _app_collection().stream()
    apps = [doc.to_dict() | {"application_id": doc.id} for doc in docs]
    
    def get_sort_key(app):
        dt = app.get("updated_at")
        if not dt:
            return 0
        if hasattr(dt, "timestamp"):
            return dt.timestamp()
        if isinstance(dt, str):
            # Very basic string fallback sort
            return 1  # Or parse it, but at least it won't crash
        return 0
        
    apps.sort(key=get_sort_key, reverse=True)
    return apps

@app.get("/applications/{id}")
async def get_single_application(id: str, uid: str = Depends(get_current_user)):
    return get_application(id)


@app.post("/followups/check")
async def check_followups():
    due = get_due_followups()
    updates = []
    
    STATUS_MAP = {
        "interview": "interview", 
        "rejection": "rejected",
        "info_request": "awaiting_reply", 
        "unclear": "awaiting_reply"
    }
    
    for app_rec in due:
        thread_id = app_rec.get("email", {}).get("thread_id")
        if thread_id:
            reply = check_thread_for_reply(thread_id)
            if reply.get("has_reply"):
                classification = reply.get("classification", "unclear")
                new_status = STATUS_MAP.get(classification, "awaiting_reply")
                update_status(app_rec["application_id"], status=new_status)
                updates.append({"id": app_rec["application_id"], "new_status": new_status})
    return {"updates": updates}

class OutreachSendRequest(BaseModel):
    subject: str
    body: str

@app.post("/applications/{id}/outreach/draft")
async def generate_outreach_draft(id: str, uid: str = Depends(get_current_user)):
    app_doc = get_application(id)
    if "error" in app_doc:
        raise HTTPException(status_code=404, detail="Application not found")
        
    from tools.firestore_state import get_candidate_profile
    profile = get_candidate_profile()
    if "error" in profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    prompt = f"""
    Draft an outreach email to a recruiter for the {app_doc.get('role')} role at {app_doc.get('company')}.
    Candidate details:
    Name: {profile.get('first_name')} {profile.get('last_name')}
    Skills: {', '.join(profile.get('skills', []))}
    Keep it concise, polite, and under 150 words.
    Return JSON format exactly like: {{"subject": "...", "body": "..."}}
    """
    client = genai.Client(http_options={'api_version': 'v1alpha'})
    response = await client.aio.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt,
        config=genai.types.GenerateContentConfig(response_mime_type="application/json")
    )
    return json.loads(response.text)

@app.post("/applications/{id}/outreach/send")
async def send_outreach(id: str, req: OutreachSendRequest, uid: str = Depends(get_current_user)):
    from tools.firestore_state import get_candidate_profile
    from tools.gmail_tools import send_outreach_email
    import asyncio
    
    profile = get_candidate_profile()
    # In a real app we'd fetch the company email. For the hackathon, send to the user's own email.
    to_email = profile.get("email") or "test@example.com"
    
    try:
        result = await asyncio.to_thread(send_outreach_email, to_email, req.subject, req.body)
        update_status(id, "awaiting_reply", follow_up_in_days=6, email_thread_id=result.get("thread_id"))
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

