"""Fair-allocation scoring formulas (weights from Policy).

SOURCE OF TRUTH:
These scoring formulas are the deterministic source of truth for CampusShare
allocation ranking. All component scores are strictly clamped to the range [0.0, 1.0]
and weighted by a normalized policy to prevent bias, starvation, or numerical drift.
"""
import math
from app.schemas import PolicyWeights, RequestItem, ScoreBreakdown

def score_usage(sessions: int) -> float:
    """Usage score inversely scales with confirmed sessions this month.
    
    Formula: 1.0 / (1.0 + max(0, sessions))
    
    Rationale:
    - 0 sessions yields maximum score 1.0.
    - Decreases monotonically (1 session -> 0.5, 3 sessions -> 0.25).
    - Prevents resource monopolization by prioritizing first-time or infrequent requesters.
    - Clamped to [0.0, 1.0] to guarantee stability.
    """
    clean_sessions = max(0, int(sessions))
    val = 1.0 / (1.0 + clean_sessions)
    return max(0.0, min(1.0, val))

def score_waiting(hours: float) -> float:
    """Waiting score linearly scales from 0 to 72 hours, clamped at 1.0.
    
    Formula: min(1.0, max(0.0, hours / 72.0))
    
    Rationale:
    - 0 hours waiting gives 0.0.
    - Linearly rewards students who have been waiting in queue (e.g. 36 hours -> 0.5).
    - Fully saturates at 72 hours (3 days) to prevent backlog starvation.
    """
    clean_hours = max(0.0, float(hours)) if not math.isnan(hours) else 0.0
    val = clean_hours / 72.0
    return max(0.0, min(1.0, val))

def score_need(need_score: float) -> float:
    """Project need urgency score mapped from a 1-10 scale to [0.0, 1.0].
    
    Formula: min(1.0, max(0.0, need_score / 10.0))
    
    Rationale:
    - Standardizes self-reported capstone, research, or course urgency.
    - Clamped strictly between 0.0 and 1.0 to guard against out-of-bounds input.
    """
    clean_need = max(0.0, float(need_score)) if not math.isnan(need_score) else 0.0
    val = clean_need / 10.0
    return max(0.0, min(1.0, val))

def score_diversity(department: str, is_priority_group: bool, dep_sessions: int = 0) -> float:
    """Diversity score encouraging inter-departmental balance and priority inclusion.
    
    Formula: min(1.0, base (0.5) + priority_bonus (0.3) + dep_factor (0.2 / (1 + dep_sessions)))
    
    Rationale:
    - Base baseline of 0.5 for all valid applicants.
    - Adds +0.3 for verified priority groups (e.g., student-led research initiatives).
    - Adds up to +0.2 for departments with lower historical session counts on this equipment.
    """
    base = 0.5
    priority_bonus = 0.3 if is_priority_group else 0.0
    clean_dep_sessions = max(0, int(dep_sessions))
    dep_factor = 0.2 / (1.0 + clean_dep_sessions)
    val = base + priority_bonus + dep_factor
    return max(0.0, min(1.0, val))

def normalise_weights(w: PolicyWeights) -> PolicyWeights:
    """Ensure policy weights sum strictly to 1.0 and contain no negative weights."""
    u = max(0.0, w.usage)
    wt = max(0.0, w.waiting)
    n = max(0.0, w.need)
    d = max(0.0, w.diversity)

    total = u + wt + n + d
    if total <= 0.0:
        # Default equal split if all zero or invalid
        return PolicyWeights(usage=0.25, waiting=0.25, need=0.25, diversity=0.25)

    return PolicyWeights(
        usage=round(u / total, 6),
        waiting=round(wt / total, 6),
        need=round(n / total, 6),
        diversity=round(d / total, 6),
    )

def calculate_score_breakdown(req: RequestItem) -> ScoreBreakdown:
    """Calculates non-negative clamped component scores for an applicant."""
    return ScoreBreakdown(
        usage=round(score_usage(req.sessionsThisMonth), 4),
        waiting=round(score_waiting(req.waitingHours), 4),
        need=round(score_need(req.projectNeedScore), 4),
        diversity=round(score_diversity(req.department, req.isPriorityGroup), 4),
    )

def calculate_total_score(breakdown: ScoreBreakdown, weights: PolicyWeights) -> float:
    """Computes final weighted fairness score, strictly clamped to [0.0, 1.0]."""
    w = normalise_weights(weights)
    score = (
        breakdown.usage * w.usage
        + breakdown.waiting * w.waiting
        + breakdown.need * w.need
        + breakdown.diversity * w.diversity
    )
    if math.isnan(score):
        score = 0.0
    clamped_score = max(0.0, min(1.0, score))
    return round(clamped_score, 6)
