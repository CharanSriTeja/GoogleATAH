import os
import tempfile
import base64
import datetime
from fpdf import FPDF
import shutil
from google import genai
from tools.firestore_state import _app_collection, current_uid

def save_local_pdf(local_path: str, destination_file_name: str) -> str:
    """Save a file to the local uploads directory and return its local URL."""
    dest_path = os.path.join("uploads", "resumes", destination_file_name)
    shutil.copy2(local_path, dest_path)
    url = f"http://localhost:8000/uploads/resumes/{destination_file_name}"
    return url

def extract_bullets_from_resume_text(base_resume_text: str) -> list[str]:
    """Use Gemini to extract genuine experience/project bullet points from raw extracted resume text."""
    prompt = f"Extract the experience/project bullet points from this resume text as a JSON list of strings, using only what's written -- do not add or embellish anything: {base_resume_text}"
    client = genai.Client(http_options={'api_version': 'v1alpha'})
    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt,
        config=genai.types.GenerateContentConfig(response_mime_type="application/json")
    )
    import json
    try:
        return json.loads(response.text)
    except:
        return []

def generate_resume_pdf(application_id: str, candidate_profile: dict, tailored_bullets: list[str] = None) -> dict:
    """Generate a PDF resume in Jake's format and save it to the application.
    
    Args:
        application_id: The ID of the application in Firestore.
        candidate_profile: The candidate's profile dictionary.
        tailored_bullets: A list of tailored bullet points (optional). If not provided, it uses base profile info.
        
    Returns:
        dict with `resume_pdf_path` (local file path) and `success` status.
    """
    
    def clean(t: str) -> str:
        if not t: return ""
        return t.encode("ascii", "ignore").decode("ascii")

    class JakesResume(FPDF):
        def header(self):
            # Name
            self.set_font("Times", "B", 24)
            name = candidate_profile.get("name") or candidate_profile.get("first_name", "") + " " + candidate_profile.get("last_name", "")
            self.cell(190, 10, clean(name), 0, 1, "C")
            
            # Contact Info
            self.set_font("Times", "", 11)
            contact_info = []
            if candidate_profile.get("phone"):
                contact_info.append(clean(candidate_profile.get("phone")))
            if candidate_profile.get("email"):
                contact_info.append(clean(candidate_profile.get("email")))
            if candidate_profile.get("linkedin_url"):
                linkedin = candidate_profile.get("linkedin_url").replace("https://", "")
                contact_info.append(clean(linkedin))
            if candidate_profile.get("github_url"):
                github = candidate_profile.get("github_url").replace("https://", "")
                contact_info.append(clean(github))
                
            self.cell(190, 5, " | ".join(contact_info), 0, 1, "C")
            self.ln(3)

        def section_title(self, title):
            self.set_font("Times", "B", 14)
            self.cell(190, 6, clean(title), 0, 1, "L")
            self.line(self.get_x(), self.get_y(), self.get_x() + 190, self.get_y())
            self.ln(2)

        def bullet_point(self, text):
            self.set_font("Times", "", 11)
            self.multi_cell(190, 5, "- " + clean(text))

    pdf = JakesResume()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Education Section
    if candidate_profile.get("education"):
        pdf.section_title("Education")
        pdf.set_font("Times", "", 11)
        pdf.multi_cell(190, 5, clean(candidate_profile.get("education")))
        pdf.ln(3)
        
    # Technical Skills Section
    if candidate_profile.get("skills"):
        pdf.section_title("Technical Skills")
        pdf.set_font("Times", "", 11)
        skills_text = ", ".join(candidate_profile.get("skills"))
        pdf.multi_cell(190, 5, clean(skills_text))
        pdf.ln(3)

    # Experience / Projects (Tailored)
    pdf.section_title("Relevant Experience & Projects")
    if tailored_bullets:
        for bullet in tailored_bullets:
            pdf.bullet_point(bullet)
    elif candidate_profile.get("projects"):
        for proj in candidate_profile.get("projects", []):
            pdf.set_font("Times", "B", 11)
            pdf.cell(190, 5, clean(proj.get("title", "")), 0, 1)
            if proj.get("description"):
                pdf.bullet_point(proj.get("description"))
            if proj.get("tech"):
                pdf.bullet_point("Technologies: " + ", ".join(proj.get("tech")))
            pdf.ln(2)
    elif candidate_profile.get("base_resume_text"):
        # Use Gemini to extract bullets from unstructured text
        bullets = extract_bullets_from_resume_text(candidate_profile.get("base_resume_text"))
        for bullet in bullets:
            pdf.bullet_point(bullet)

    # Save to temp file
    temp_dir = tempfile.gettempdir()
    pdf_path = os.path.join(temp_dir, f"resume_{application_id}.pdf")
    # For Playwright, it also expects "generated_resume.pdf" in some fallback, but we will return the real path
    pdf.output(pdf_path)
    
    # Save locally
    uid = current_uid.get()
    file_name = f"{uid}_{application_id}.pdf"
    local_url = save_local_pdf(pdf_path, file_name)
    
    # Clean up temp file
    if os.path.exists(pdf_path):
        os.remove(pdf_path)
    
    _app_collection().document(application_id).update({
        "resume_pdf_url": local_url
    })
    
    return {
        "success": True,
        "resume_pdf_url": local_url
    }
