"""Fair-allocation scoring formulas (weights from Policy)."""
from app.schemas import PolicyWeights, RequestItem, ScoreBreakdown

def score_usage(sessions: int) -> float:
    """Usage score inversely scales with sessions this month. Max 1.0 for 0 sessions."""
    return 1.0 / (1.0 + max(0, sessions))

def score_waiting(hours: float) -> float:
    """Waiting score linearly scales from 0 to 72 hours, clamped at 1.0."""
    return min(1.0, max(0.0, hours / 72.0))

def score_need(need_score: float) -> float:
    """Project need score on a 1-10 scale mapped to [0.0, 1.0]."""
    return min(1.0, max(0.0, need_score / 10.0))

def score_diversity(department: str, is_priority_group: bool, dep_sessions: int = 0) -> float:
    """Encourages cross-department and priority group inclusion."""
    base = 0.5
    priority_bonus = 0.3 if is_priority_group else 0.0
    dep_factor = 0.2 / (1.0 + max(0, dep_sessions))
    return min(1.0, base + priority_bonus + dep_factor)

def normalise_weights(w: PolicyWeights) -> PolicyWeights:
    """Ensure weights sum strictly to 1.0."""
    total = w.usage + w.waiting + w.need + w.diversity
    if total <= 0:
        return PolicyWeights(usage=0.25, waiting=0.25, need=0.25, diversity=0.25)
    return PolicyWeights(
        usage=w.usage / total,
        waiting=w.waiting / total,
        need=w.need / total,
        diversity=w.diversity / total,
    )

def calculate_score_breakdown(req: RequestItem) -> ScoreBreakdown:
    return ScoreBreakdown(
        usage=round(score_usage(req.sessionsThisMonth), 4),
        waiting=round(score_waiting(req.waitingHours), 4),
        need=round(score_need(req.projectNeedScore), 4),
        diversity=round(score_diversity(req.department, req.isPriorityGroup), 4),
    )

def calculate_total_score(breakdown: ScoreBreakdown, weights: PolicyWeights) -> float:
    w = normalise_weights(weights)
    score = (
        breakdown.usage * w.usage
        + breakdown.waiting * w.waiting
        + breakdown.need * w.need
        + breakdown.diversity * w.diversity
    )
    return round(score, 6)
