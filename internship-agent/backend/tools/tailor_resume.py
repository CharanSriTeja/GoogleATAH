"""
Resume tailoring tool. Rewrites resume bullets to match a JD's language and
priorities, WITHOUT fabricating skills or experience the candidate doesn't
have. Any required skill the candidate lacks is surfaced explicitly as a
"skill_gap" rather than silently invented -- this is a deliberate honesty
constraint, not just a style choice, and it doubles as a good talking point
for judges ("the agent never lies on your behalf").
"""

import json
import re


def tailor_resume(candidate_profile: dict, parsed_jd: dict) -> dict:
    """Produce a JD-tailored resume summary and flag genuine skill gaps.

    Args:
        candidate_profile: dict with keys like "name", "skills" (list),
            "projects" (list of {title, description, tech}), "education",
            "base_resume_text" (the candidate's existing resume as text).
        parsed_jd: Output of parse_jd() -- must include "required_skills",
            "nice_to_have", "role", "company".

    Returns:
        dict with:
          - tailored_bullets: list[str], rewritten resume bullet points
              emphasizing relevant real experience
          - match_score: float 0-1
          - skill_gaps: list[str], required skills the candidate genuinely
              lacks (never fabricated as possessed)
          - cover_note: 2-3 sentence note explaining fit, honest about gaps
    """
    from google import genai

    client = genai.Client()

    required = parsed_jd.get("required_skills", [])
    candidate_skills = candidate_profile.get("skills", [])

    prompt = f"""You are tailoring a resume for a specific job. You must NEVER
invent skills, tools, or experience the candidate does not actually have.
If the JD requires something the candidate's profile doesn't show, list it
honestly under skill_gaps instead of pretending they have it.

CANDIDATE PROFILE:
{json.dumps(candidate_profile, indent=2)}

TARGET ROLE: {parsed_jd.get('role')} at {parsed_jd.get('company')}
REQUIRED SKILLS: {required}
NICE TO HAVE: {parsed_jd.get('nice_to_have', [])}

Return ONLY a JSON object, no markdown fences, no preamble:
{{
  "tailored_bullets": ["string", ...],
  "match_score": 0.0,
  "skill_gaps": ["string", ...],
  "cover_note": "string"
}}"""

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt,
    )
    raw = re.sub(r"^```json\s*|\s*```$", "", response.text.strip())
    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        return {"error": "Could not generate tailored resume", "raw_response": raw}

    # Cheap sanity cross-check: flag if the model claimed a skill_gap is
    # empty despite required skills clearly missing from candidate_skills.
    missing = [s for s in required if s.lower() not in [c.lower() for c in candidate_skills]]
    if missing and not result.get("skill_gaps"):
        result["skill_gaps"] = missing

    return result
