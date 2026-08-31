"""
Autofill for Greenhouse-hosted application forms (boards.greenhouse.io/...).

Greenhouse is a good first target because its embed structure is fairly
consistent across companies -- form fields use predictable `name`/`id`
patterns rather than being fully custom per-company like a bespoke career page.

Design principle: fill everything the agent can confidently map from the
candidate profile, leave everything else untouched, and NEVER click submit.
The agent reports back exactly what it filled and what it couldn't, so the
candidate finishes the remaining fields and reviews before submitting.
"""

import os
import tempfile
import asyncio
from playwright.sync_api import sync_playwright

FIELD_PATTERNS = {
    "first_name": ["first_name", "first name"],
    "last_name": ["last_name", "last name"],
    "email": ["email"],
    "phone": ["phone"],
    "linkedin": ["linkedin", "linkedin_profile"],
    "github": ["github", "website"],
}

def _do_autofill_sync(job_url: str, candidate_profile: dict, resume_pdf_path: str) -> dict:
    filled, unfilled = [], []
    screenshot_path = os.path.join(tempfile.gettempdir(), "greenhouse_review.png")

    values = {
        "first_name": candidate_profile.get("first_name", ""),
        "last_name": candidate_profile.get("last_name", ""),
        "email": candidate_profile.get("email", ""),
        "phone": candidate_profile.get("phone", ""),
        "linkedin": candidate_profile.get("linkedin_url", ""),
        "github": candidate_profile.get("github_url", ""),
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(job_url, wait_until="domcontentloaded", timeout=30000)  # Changed from networkidle
        
        # IMPROVEMENT 1: Use getByLabel instead of CSS selectors
        label_mappings = {
            "first_name": ["First Name", "First name", "Given Name"],
            "last_name": ["Last Name", "Last name", "Family Name", "Surname"],
            "email": ["Email", "Email Address", "E-mail"],
            "phone": ["Phone", "Phone Number", "Mobile", "Cell Phone"],
            "linkedin": ["LinkedIn", "LinkedIn Profile", "LinkedIn URL"],
            "github": ["GitHub", "Github", "GitHub Profile", "Website", "Portfolio"],
        }
        
        for field_key, label_options in label_mappings.items():
            value = values.get(field_key, "")
            if not value:
                unfilled.append(field_key)
                continue
            
            located = False
            for label_text in label_options:
                try:
                    # Try getByLabel first (most reliable)
                    locator = page.get_by_label(label_text, exact=False)
                    if locator.count() > 0:
                        locator.first.fill(value)
                        filled.append(field_key)
                        located = True
                        break
                except Exception:
                    continue
            
            # Fallback to your original CSS selectors
            if not located:
                patterns = FIELD_PATTERNS[field_key]
                for pattern in patterns:
                    for selector in [
                        f'input[name*="{pattern}" i]',
                        f'input[id*="{pattern}" i]',
                    ]:
                        locator = page.locator(selector)
                        if locator.count() > 0:
                            locator.first.fill(value)
                            filled.append(field_key)
                            located = True
                            break
                    if located:
                        break
            
            if not located:
                unfilled.append(field_key)

        # IMPROVEMENT 2: Better resume upload detection
        resume_selectors = [
            'input[type="file"][name*="resume" i]',
            'input[type="file"][name*="document" i]',
            'input[type="file"][id*="resume" i]',
            'input[type="file"]',  # Last resort - any file input
        ]
        
        resume_uploaded = False
        for selector in resume_selectors:
            resume_input = page.locator(selector)
            if resume_input.count() > 0:
                resume_input.first.set_input_files(resume_pdf_path)
                filled.append("resume_upload")
                resume_uploaded = True
                break
        
        if not resume_uploaded:
            unfilled.append("resume_upload")

        # IMPROVEMENT 3: Wait for form to stabilize before screenshot
        page.wait_for_timeout(2000)  # Let any validation messages appear
        page.screenshot(path=screenshot_path, full_page=True)
        
        # IMPROVEMENT 4: Better UX message
        page.evaluate("""
            alert('✅ I filled: ' + '{filled}' + '\\n❌ Could not find: ' + '{unfilled}' + '\\n\\nPlease review, complete missing fields, and submit. Then close this window.')
        """.format(
            filled=", ".join(filled),
            unfilled=", ".join(unfilled)
        ))
        
        try:
            page.wait_for_event("close", timeout=0)
        except Exception:
            pass
            
        browser.close()

    return {
        "filled_fields": filled,
        "unfilled_fields": unfilled,
        "screenshot_path": screenshot_path,
        "ready_for_review": True,
    }

async def autofill_greenhouse_form(job_url: str, candidate_profile: dict, resume_pdf_path: str) -> dict:
    # Run the synchronous Playwright code in a separate background thread
    # This avoids both the "Sync API inside asyncio loop" error AND the Windows NotImplementedError for asyncio subprocesses!
    return await asyncio.to_thread(_do_autofill_sync, job_url, candidate_profile, resume_pdf_path)
