"""Deterministic tie-breaker pipeline."""
from typing import Any, Callable, Dict, List, Optional, Tuple
from app.schemas import RequestItem

def string_to_seed(s: str) -> int:
    """Hash string into a 32-bit integer."""
    h = 2166136261
    for char in s:
        h = ((h ^ ord(char)) * 16777619) & 0xFFFFFFFF
    return h

def mulberry32(seed_int: int) -> Callable[[], float]:
    """32-bit PRNG generator yielding floats in [0, 1)."""
    current = seed_int & 0xFFFFFFFF

    def next_val() -> float:
        nonlocal current
        current = (current + 0x6D2B79F5) & 0xFFFFFFFF
        t = (current ^ (current >> 15)) * (1 | current)
        t = t & 0xFFFFFFFF
        t = (t + ((t ^ (t >> 7)) * (61 | t))) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0

    return next_val

def resolve_tie(
    items: List[Tuple[RequestItem, float, Any]],
    tie_breaker_order: List[str],
    seed: str,
) -> Tuple[List[Tuple[RequestItem, float, Any]], Dict[str, str]]:
    """
    Deterministically sorts items that share equal or epsilon-close scores.
    Returns the sorted list and a dictionary mapping requestId -> decider name.
    """
    if len(items) <= 1:
        return items, {}

    decided_by: Dict[str, str] = {}

    def get_lottery_val(req_id: str) -> float:
        rng = mulberry32(string_to_seed(f"{seed}:{req_id}"))
        return rng()

    for criterion in tie_breaker_order:
        if criterion == "fewestSessionsThisMonth":
            # Check if this criterion distinguishes between all or any items
            sessions = [it[0].sessionsThisMonth for it in items]
            if len(set(sessions)) > 1:
                # Can differentiate! Sort ascending
                sorted_items = sorted(items, key=lambda x: x[0].sessionsThisMonth)
                for it in sorted_items:
                    if it[0].id not in decided_by:
                        decided_by[it[0].id] = "fewestSessionsThisMonth"
                return sorted_items, decided_by

        elif criterion == "earliestRequest":
            times = [it[0].submittedAt for it in items]
            if len(set(times)) > 1:
                # Differentiates! Sort ascending
                sorted_items = sorted(items, key=lambda x: x[0].submittedAt)
                for it in sorted_items:
                    if it[0].id not in decided_by:
                        decided_by[it[0].id] = "earliestRequest"
                return sorted_items, decided_by

        elif criterion == "seededLottery":
            # Seeded lottery always breaks ties cleanly
            sorted_items = sorted(items, key=lambda x: get_lottery_val(x[0].id), reverse=True)
            for it in sorted_items:
                if it[0].id not in decided_by:
                    decided_by[it[0].id] = "seededLottery"
            return sorted_items, decided_by

    # Fallback to requestId if everything else is equal
    sorted_items = sorted(items, key=lambda x: x[0].id)
    return sorted_items, decided_by
