"""LLM plain-language explanation generator with deterministic fallback and strict privacy."""
import json
import logging
from typing import Dict, Optional, Tuple
from app.config import settings
from app.schemas import RequestItem, ScoreBreakdown

logger = logging.getLogger("ai_explain")

# In-memory explanation cache: key -> (studentReason, coordinatorSummary)
_explanation_cache: Dict[str, Tuple[str, str]] = {}

def clear_explanation_cache() -> None:
    _explanation_cache.clear()

def generate_fallback_explanation(
    req: RequestItem,
    rank: int,
    total_score: float,
    breakdown: ScoreBreakdown,
    is_allocated: bool,
    decided_by: Optional[str] = None,
) -> Tuple[str, str]:
    """Generates plain-language explanations adhering strictly to word count budgets without personal identities."""
    if is_allocated:
        tie_text = f" Decided by {decided_by}." if decided_by else ""
        student_reason = (
            f"You were allocated this slot because of your strong priority score ({total_score:.2f}) "
            f"and having only {req.sessionsThisMonth} previous session(s) this month. "
            f"Your project urgency ({req.projectNeedScore}/10) helped secure your place.{tie_text}"
        )
        coord_summary = (
            f"Allocated rank #{rank}. High fairness score with {req.sessionsThisMonth} monthly sessions."
        )
    else:
        student_reason = (
            f"You are placed at rank #{rank} on the waitlist with a score of {total_score:.2f}. "
            f"Allocated peers had fewer prior sessions or higher waiting urgency. "
            f"You will automatically be promoted if a cancellation occurs."
        )
        coord_summary = (
            f"Waitlisted at rank #{rank}. Score {total_score:.2f} behind allocation threshold."
        )

    # Enforce word limits: studentReason <= 60 words, coordinatorSummary <= 25 words
    student_words = student_reason.split()
    if len(student_words) > 60:
        student_reason = " ".join(student_words[:60])

    coord_words = coord_summary.split()
    if len(coord_words) > 25:
        coord_summary = " ".join(coord_words[:25])

    return student_reason, coord_summary

def has_contradiction(text: str, is_allocated: bool) -> bool:
    """Checks whether the generated explanation text contradicts the ground-truth allocation decision."""
    lower = text.lower()
    if is_allocated:
        contradictory_phrases = ["waitlist", "wait-listed", "denied", "rejected", "not allocated", "unsuccessful", "could not be allocated"]
        return any(phrase in lower for phrase in contradictory_phrases)
    else:
        contradictory_phrases = ["you were allocated", "successfully allocated", "allocated this slot", "confirmed reservation"]
        return any(phrase in lower for phrase in contradictory_phrases)

async def generate_explanation(
    req: RequestItem,
    rank: int,
    total_score: float,
    breakdown: ScoreBreakdown,
    is_allocated: bool,
    decided_by: Optional[str] = None,
) -> Tuple[str, str, str]:
    """
    Returns (studentReason, coordinatorSummary, source).
    source is one of: "fallback", "ai", "cache".
    
    PRIVACY GUARANTEE:
    - Never transmits userName, emails, or personal identifiers to the LLM.
    - Anonymizes the candidate as 'Candidate {requestId}'.
    """
    cache_key = f"{req.id}:{rank}:{total_score:.4f}:{is_allocated}:{decided_by}"
    if cache_key in _explanation_cache:
        s_reason, c_summary = _explanation_cache[cache_key]
        return s_reason, c_summary, "cache"

    # Deterministic fallback explanation
    student_reason, coord_summary = generate_fallback_explanation(
        req=req,
        rank=rank,
        total_score=total_score,
        breakdown=breakdown,
        is_allocated=is_allocated,
        decided_by=decided_by,
    )

    # If AI_API_KEY is not configured or empty, immediately use deterministic fallback
    api_key = settings.AI_API_KEY.strip() if settings.AI_API_KEY else ""
    if not api_key:
        _explanation_cache[cache_key] = (student_reason, coord_summary)
        return student_reason, coord_summary, "fallback"

    # LLM path with timeout, privacy guarantee, and contradiction validation
    try:
        import httpx

        timeout_sec = max(1.0, float(settings.AI_TIMEOUT_MS) / 1000.0)
        # Anonymized label strictly preserving user privacy
        candidate_label = f"Candidate {req.id}"
        outcome_str = "ALLOCATED" if is_allocated else "WAITLISTED"

        system_instruction = (
            "You are an impartial explainability assistant for a campus resource allocation engine. "
            "Write a student-facing explanation (studentReason, max 50 words) and an admin summary (coordinatorSummary, max 20 words). "
            "Return strictly valid JSON with keys 'studentReason' and 'coordinatorSummary'. "
            "Do NOT include markdown fences, backticks, or personal names."
        )

        user_content = (
            f"Subject: {candidate_label}\n"
            f"Rank: #{rank}\n"
            f"Outcome: {outcome_str}\n"
            f"Total Score: {total_score:.4f}\n"
            f"Prior Sessions This Month: {req.sessionsThisMonth}\n"
            f"Waiting Hours: {req.waitingHours:.1f}\n"
            f"Need Urgency: {req.projectNeedScore}/10\n"
            f"Deciding Tiebreaker: {decided_by or 'None'}\n"
        )

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }

        # Handle Gemini REST or OpenAI-compatible endpoint
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.AI_MODEL or 'gemini-1.5-flash'}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": f"{system_instruction}\n\n{user_content}"}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 200},
        }

        async with httpx.AsyncClient(timeout=timeout_sec) as client:
            resp = await client.post(endpoint, json=payload)
            if resp.status_code == 200:
                body = resp.json()
                raw_text = (
                    body.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
                    .strip()
                )
                # Clean possible markdown wrapping
                if raw_text.startswith("```"):
                    raw_text = raw_text.strip("`").replace("json\n", "").strip()

                parsed = json.loads(raw_text)
                ai_student = parsed.get("studentReason", "").strip()
                ai_coord = parsed.get("coordinatorSummary", "").strip()

                if ai_student and ai_coord:
                    # Enforce word limits
                    s_words = ai_student.split()
                    if len(s_words) > 60:
                        ai_student = " ".join(s_words[:60])
                    c_words = ai_coord.split()
                    if len(c_words) > 25:
                        ai_coord = " ".join(c_words[:25])

                    # Check for contradiction against allocation truth
                    if not has_contradiction(ai_student, is_allocated) and not has_contradiction(ai_coord, is_allocated):
                        _explanation_cache[cache_key] = (ai_student, ai_coord)
                        return ai_student, ai_coord, "ai"
                    else:
                        logger.warning("LLM generated text contradicted decision; reverting to fallback template.")
    except Exception as e:
        logger.warning(f"LLM explanation error or timeout ({e}); gracefully falling back to deterministic template.")

    _explanation_cache[cache_key] = (student_reason, coord_summary)
    return student_reason, coord_summary, "fallback"
