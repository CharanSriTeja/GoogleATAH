# Internship Application Agent — Taskmaster Track

An autonomous agent that takes a job posting (URL or JD text), tailors your resume,
autofills the application where possible, sends outreach email, tracks status via
Gmail, and re-triggers itself for follow-ups — all with a human confirming only the
irreversible steps (submit application, send email).

## Architecture

```
Candidate (one-time onboarding: skills, base resume)
        │
        ▼
   Cloud Run (ADK Agent) ───► Gemini API (parse JD, tailor resume, classify replies)
        │
        ├──► Firestore (application state: company, role, status, follow_up_date)
        │
        ├──► Playwright headless browser (autofill Greenhouse/Lever forms)
        │
        ├──► Gmail API (send outreach, watch inbox for replies)
        │
        └──► Cloud Scheduler / Pub/Sub (async re-trigger for follow-ups)
```

## Local setup

1. **Python 3.11+** recommended.

```bash
cd agent
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
```

2. **Get a Gemini API key** from Google AI Studio → put it in `agent/.env`:

```
GOOGLE_API_KEY=your_key_here
GOOGLE_CLOUD_PROJECT=your_gcp_project_id
FIRESTORE_DATABASE=(default)
```

3. **Google Cloud setup**
   - Create a GCP project, enable: Vertex AI API, Firestore API, Cloud Run API, Gmail API, Cloud Scheduler API.
   - Create a Firestore database (Native mode).
   - Run `gcloud auth application-default login` locally so Firestore/Gmail clients can authenticate.
   - For Gmail API: create OAuth credentials (Desktop app type) in Google Cloud Console →
     download `credentials.json` into `agent/`. First run will open a browser to authorize.

4. **Run locally (Full Stack)**

We have consolidated the project. The agent and server now live entirely in the `backend/` directory, while the React UI lives in `frontend/`.

**Terminal 1 (Backend):**
```bash
cd backend
venv\Scripts\activate
python -m uvicorn main:app --reload
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

This opens the React Dashboard, where you can view your applications, chat with the agent, and manually confirm actions like submitting forms and sending emails.

5. **Run as a script**

```bash
python -m agent.main
```

## Deploy to Cloud Run

```bash
gcloud run deploy internship-agent \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT=your_gcp_project_id
```

## Project layout

```
agent/
  main.py                 # entrypoint, wires the root agent
  root_agent.py            # ADK Agent definition + tool list
  tools/
    parse_jd.py             # JD parsing (Gemini)
    tailor_resume.py         # resume tailoring + gap-flagging (Gemini)
    firestore_state.py        # application CRUD in Firestore
    autofill_greenhouse.py     # Playwright autofill for Greenhouse forms
    gmail_tools.py               # send outreach, watch inbox, classify replies
    job_search.py                 # (stretch) search jobs via Adzuna/Remotive APIs
  requirements.txt
  Dockerfile
frontend/
  (thin React UI — paste JD, see agent output, see Firestore status)
```

## Current build status

- [ ] JD parsing + resume tailoring
- [ ] Firestore state tracking
- [ ] Greenhouse autofill (Playwright)
- [ ] Gmail send + inbox watch
- [ ] Cloud Scheduler follow-up trigger
- [ ] Job search stretch feature
- [ ] Frontend
- [ ] Deployed to Cloud Run
- [ ] Architecture diagram
- [ ] Demo video
