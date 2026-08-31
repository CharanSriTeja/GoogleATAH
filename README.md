🤖 AI Internship Application Agent
An autonomous AI agent designed to streamline the internship application process. This platform automatically tailors your resume using Google Gemini, autofills Greenhouse job applications via Playwright, drafts personalized outreach emails, and stores application states using Firebase and Cloudinary.
Built for the Google AI Hackathon.
✨ Key Features
🔹 Job Description Analysis – Extracts important requirements, skills, qualifications, and responsibilities.
🔹 Profile Matching – Compares job requirements with the student's profile and resume.
🔹 Resume Optimization – Generates a job-specific resume by highlighting relevant skills and experience.
🔹 Skill Gap Analysis – Identifies missing skills to improve the candidate's profile.
🔹 Job Match Score – Provides an estimated match score between the candidate and internship.
🔹 Application Assistance – Automates repetitive application form filling.
🔹 Application Tracking – Tracks applied, pending, shortlisted, rejected, and other application statuses.
🔹 Personalized Outreach – Drafts personalized emails for recruiters or hiring managers.
🛠️ Tech Stack
Frontend: React, Vite, Tailwind CSS, Axios
Backend: Python, FastAPI, Uvicorn, Docker
AI/LLM: Google Gemini (`google-genai`), Model Context Protocol (MCP)
Browser Automation: Playwright (Headless Chromium)
Database & Auth: Firebase Authentication, Google Cloud Firestore
Storage: Cloudinary (for resumes and generated PDFs)
---
💻 Local Development Setup
Prerequisites
Before you begin, ensure you have the following installed:
Node.js (v18 or higher)
Python (v3.10 or higher)
Git
1. Clone the Repository
```bash
git clone https://github.com/YourUsername/GoogleATAH.git
cd GoogleATAH/internship-agent
```
2. Backend Setup (FastAPI)
```bash
cd backend
python -m venv .venv
```
Windows
```bash
.\.venv\Scripts\activate
```
Mac/Linux
```bash
source .venv/bin/activate
```
Install dependencies:
```bash
pip install -r requirements.txt
```
Install the Playwright Chromium browser:
```bash
playwright install chromium
```
3. Frontend Setup (React/Vite)
Open a new terminal:
```bash
cd frontend
npm install
```
---
🔑 Environment Variables & Secrets
You will need API keys and configuration files for Google, Firebase, and Cloudinary.
Backend — `backend/.env`
Create a `.env` file inside the `backend` folder:
```env
GOOGLE_API_KEY=your_gemini_api_key_here
GOOGLE_CLOUD_PROJECT=your_google_cloud_project_id
FIRESTORE_DATABASE=(default)
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
```
Required JSON Files
Place the required Firebase Admin SDK and Google Auth JSON files inside the `backend` directory.
> ⚠️ **Never commit credentials or secret keys to GitHub.** Make sure these files are included in `.gitignore`.
Required files may include:
`credentials.json`
`token.json`
`firebase-adminsdk.json` (the exact filename depends on your Firebase project)
Frontend — `frontend/.env`
Create a `.env` file inside the `frontend` folder:
```env
VITE_API_URL=http://localhost:8000
```
If testing locally, the application can use `http://localhost:8000` as the backend URL by default.
---
🚀 Running the App Locally
Start the Backend
```bash
cd backend
.\.venv\Scripts\activate
uvicorn main:app --reload
```
Start the Frontend
In another terminal:
```bash
cd frontend
npm run dev
```
Open the application at:
```text
http://localhost:5173
```
---
🌍 Deployment Guide
The project is configured to deploy:
Backend → Render
Frontend → Vercel
Deploying the Backend — Render
Because Playwright requires OS-level dependencies, the backend uses the provided `Dockerfile`.
Open the Render Dashboard and create a New Web Service.
Connect your GitHub repository.
Configure the service:
Root Directory: `backend`
Environment: `Docker`
Instance Type: Free or higher
Add the required environment variables:
`GOOGLE_API_KEY`
`GOOGLE_CLOUD_PROJECT`
`FIRESTORE_DATABASE=(default)`
`CLOUDINARY_URL`
Add the required credential files through Secret Files.
Deploy the service.
Copy the generated backend URL.
Example:
```text
https://internship-agent-backend.onrender.com
```
Deploying the Frontend — Vercel
Open the Vercel Dashboard and create a New Project.
Import the GitHub repository.
Configure:
Framework Preset: `Vite`
Root Directory: `frontend`
Add the environment variable:
```env
VITE_API_URL=https://internship-agent-backend.onrender.com
```
Replace the URL with your actual Render backend URL.
Deploy.
Vercel will automatically build and host the frontend.
---
💡 How It Works
1. Profile Setup
Users create their profile and upload their base resume.
The resume is stored securely using Cloudinary, while user/application information is stored in Firebase Firestore.
2. Job Tracking
The user provides a Greenhouse internship/job application URL.
The system extracts and analyzes the relevant job information.
3. Job & Profile Analysis
Google Gemini analyzes the job description and identifies:
Required skills
Qualifications
Responsibilities
Relevant technologies
Experience requirements
The agent then compares these requirements with the user's profile.
4. Resume Tailoring
Gemini dynamically rewrites relevant resume bullets based on the job requirements and generates a tailored PDF resume.
5. Autofill Agent
A Playwright-based browser automation agent opens the Greenhouse application page and automatically fills available application fields using the user's profile information.
6. Personalized Outreach
Gemini generates a personalized outreach email based on the job description and candidate profile.
7. Application Tracking
Application information and status are stored so users can keep track of their internship applications in one place.
---
🧠 AI & Agent Concepts
This project explores:
Artificial Intelligence
AI Agents
Large Language Models (LLMs)
Google Gemini
Model Context Protocol (MCP)
Natural Language Processing
Resume Parsing
Job Description Analysis
Skill Gap Detection
Profile & Job Matching
Browser Automation
Full-Stack Development
Database & Authentication
---
🎯 Problem Statement
Students often spend hours applying for internships manually.
Each application may require:
Understanding a new job description
Modifying the resume
Identifying missing skills
Filling repetitive application forms
Writing personalized recruiter messages
Tracking application status
This project aims to provide a single AI-powered internship assistant that understands a student's profile and helps streamline the internship application workflow.
---
🔮 Future Improvements
Planned improvements include:
🤖 Multi-agent architecture
🔎 Automatic internship discovery
📄 More advanced resume optimization
🎤 Job-specific interview preparation
📚 Personalized learning roadmaps
📊 Application analytics
📧 Email and notification integration
🎯 Smarter internship recommendations
🔐 Improved security and credential management
🌐 Support for additional application platforms
---
🏆 Hackathon
Built for the Google AI Hackathon, exploring how AI agents and automation can reduce repetitive work and help students apply to internships more efficiently.
---
📌 Project Goal
> **Help students spend less time on repetitive internship applications and more time preparing for the opportunities that matter.**
---
⚠️ Disclaimer
This project is intended as an educational and productivity tool. Automated application behavior should be used responsibly and in accordance with the terms, policies, and requirements of each job platform and employer.
---
👨‍💻 Author
Your Name
If you found this project useful or interesting, consider giving the repository a ⭐ and following the project for future updates.
Tags
`AI` `AI Agents` `Google Gemini` `Internship` `Automation` `FastAPI` `React` `Playwright` `Firebase` `Cloudinary` `MCP` `LLM` `Generative AI` `Full Stack` `Student Projects`
