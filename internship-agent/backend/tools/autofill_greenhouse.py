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
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        page.goto(job_url, wait_until="networkidle", timeout=30000)

        for field_key, patterns in FIELD_PATTERNS.items():
            value = values.get(field_key, "")
            if not value:
                unfilled.append(field_key)
                continue
            located = False
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

        resume_input = page.locator('input[type="file"][name*="resume" i]')
        if resume_input.count() > 0:
            resume_input.first.set_input_files(resume_pdf_path)
            filled.append("resume_upload")
        else:
            unfilled.append("resume_upload")

        page.screenshot(path=screenshot_path, full_page=True)
        
        page.evaluate("alert('I have filled out what I could! Please review the form, submit it, and then CLOSE this browser window to continue the agent chat.')")
        
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
