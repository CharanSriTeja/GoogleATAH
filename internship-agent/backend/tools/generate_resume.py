import os
import tempfile
import base64
from fpdf import FPDF
from tools.firestore_state import _app_collection

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
        # Very rough fallback for base text
        lines = candidate_profile.get("base_resume_text").split("\n")
        # Just grab project-looking lines
        for line in lines[10:30]:
            if line.strip().startswith("•") or line.strip().startswith("-"):
                pdf.bullet_point(line.strip()[1:].strip())

    # Save to temp file
    temp_dir = tempfile.gettempdir()
    pdf_path = os.path.join(temp_dir, f"resume_{application_id}.pdf")
    # For Playwright, it also expects "generated_resume.pdf" in some fallback, but we will return the real path
    pdf.output(pdf_path)
    
    # Also save as base64 in Firestore for download
    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()
    
    b64_string = base64.b64encode(pdf_bytes).decode("utf-8")
    
    _app_collection().document(application_id).update({
        "resume_pdf_base64": b64_string,
        "resume_variant_path": pdf_path
    })
    
    return {
        "success": True,
        "resume_pdf_path": pdf_path
    }
