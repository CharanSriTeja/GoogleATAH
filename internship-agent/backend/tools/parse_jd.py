"""
JD parsing tool. Extracts structured info from a job description, whether
passed as raw text or a URL to fetch.

Kept separate from resume tailoring so each tool call is a small, auditable
unit of work -- easier to trace in the ADK dev UI and easier to test.
"""

import json
import re
import urllib.request


def fetch_jd_text(url: str) -> str:
    """Fetch and roughly clean the visible text from a job posting URL.

    Args:
        url: URL of the job posting page.

    Returns:
        Extracted text content (HTML tags stripped, best-effort).
    """
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        html = resp.read().decode("utf-8", errors="ignore")

    # Best-effort strip: remove script/style, then tags. For production,
    # swap this for BeautifulSoup or trafilatura for cleaner extraction.
    html = re.sub(r"<script.*?</script>", " ", html, flags=re.DOTALL)
    html = re.sub(r"<style.*?</style>", " ", html, flags=re.DOTALL)
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text).strip()

    print(text)
    return text[:20000]  # cap length fed to the model


def parse_jd(jd_text: str, company_hint: str = "") -> dict:
    """Extract structured fields from a job description using Gemini.

    Note: this function issues its own Gemini call rather than relying on
    the calling agent's LLM turn, so it can be unit-tested independently
    and reused outside the agent loop (e.g. by the job-search stretch
    feature, which parses many JDs in a batch).

    Args:
        jd_text: Raw job description text.
        company_hint: Company name if already known (e.g. from the URL/site),
            to help disambiguate when the JD text itself doesn't state it clearly.

    Returns:
        dict with keys: company, role, required_skills (list), nice_to_have (list),
        seniority, location, summary (2-3 sentences).
    """
    from google import genai

    client = genai.Client()
    prompt = f"""Extract structured information from this job description.
Company hint (may be empty): {company_hint}

JOB DESCRIPTION:
{jd_text}

Return ONLY a JSON object with these exact keys, no markdown fences, no preamble:
{{
  "company": "string",
  "role": "string",
  "required_skills": ["string", ...],
  "nice_to_have": ["string", ...],
  "seniority": "string (e.g. Intern, Entry-level, Mid, Senior)",
  "location": "string (e.g. Remote, Hyderabad India, etc.)",
  "summary": "2-3 sentence summary of the role"
}}"""

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt,
    )
    raw = response.text.strip()
    raw = re.sub(r"^```json\s*|\s*```$", "", raw.strip())
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"error": "Could not parse JD", "raw_response": raw}
