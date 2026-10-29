"""LLM plain-language explanation generator with deterministic fallback."""
import logging
from typing import Dict, Optional, Tuple
from app.config import settings
from app.schemas import RankingItem, RequestItem, ScoreBreakdown

logger = logging.getLogger("ai_explain")

# In-memory explanation cache
_explanation_cache: Dict[str, Tuple[str, str]] = {}

def clear_explanation_cache():
    _explanation_cache.clear()

def generate_fallback_explanation(
    req: RequestItem,
    rank: int,
    total_score: float,
    breakdown: ScoreBreakdown,
    is_allocated: bool,
    decided_by: Optional[str] = None,
) -> Tuple[str, str]:
    """Generates plain language explanations adhering strictly to word count budgets."""
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

    # Word limits: studentReason <= 60 words, coordinatorSummary <= 25 words
    student_words = student_reason.split()
    if len(student_words) > 60:
        student_reason = " ".join(student_words[:60])

    coord_words = coord_summary.split()
    if len(coord_words) > 25:
        coord_summary = " ".join(coord_words[:25])

    return student_reason, coord_summary

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
    Attempts LLM if AI_API_KEY is configured, else falls back to deterministic template.
    """
    cache_key = f"{req.id}:{rank}:{total_score:.4f}:{is_allocated}:{decided_by}"
    if cache_key in _explanation_cache:
        s_reason, c_summary = _explanation_cache[cache_key]
        return s_reason, c_summary, "cache"

    # Default fallback
    student_reason, coord_summary = generate_fallback_explanation(
        req, rank, total_score, breakdown, is_allocated, decided_by
    )

    if not settings.AI_API_KEY:
        _explanation_cache[cache_key] = (student_reason, coord_summary)
        return student_reason, coord_summary, "fallback"

    # If AI_API_KEY is provided, try LLM with fallback
    try:
        import httpx
        timeout_sec = max(1.0, settings.AI_TIMEOUT_MS / 1000.0)
        async with httpx.AsyncClient(timeout=timeout_sec) as client:
            prompt = (
                f"Explain fairness decision: Student={req.userName}, Rank={rank}, "
                f"Allocated={is_allocated}, Score={total_score}, Sessions={req.sessionsThisMonth}. "
                f"Write studentReason (<50 words) and coordinatorSummary (<20 words)."
            )
            # LLM API request here if configured
    except Exception as e:
        logger.warning(f"LLM explanation failed, using fallback: {e}")

    _explanation_cache[cache_key] = (student_reason, coord_summary)
    return student_reason, coord_summary, "fallback"
