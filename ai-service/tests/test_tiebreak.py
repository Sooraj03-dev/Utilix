from app.schemas import RequestItem
from app.tiebreak import mulberry32, resolve_tie, string_to_seed

def test_mulberry32_determinism():
    seed = string_to_seed("utilix-seed-123")
    rng1 = mulberry32(seed)
    rng2 = mulberry32(seed)

    seq1 = [rng1() for _ in range(5)]
    seq2 = [rng2() for _ in range(5)]
    assert seq1 == seq2

def test_fewest_sessions_tiebreaker():
    r1 = RequestItem(
        id="req-1", userId="u1", userName="Alice", department="CS",
        requestedSlotId="s1", sessionsThisMonth=1, submittedAt="2026-10-29T10:00:00Z"
    )
    r2 = RequestItem(
        id="req-2", userId="u2", userName="Bob", department="CS",
        requestedSlotId="s1", sessionsThisMonth=3, submittedAt="2026-10-29T09:00:00Z"
    )

    items = [(r1, 0.75, None), (r2, 0.75, None)]
    sorted_items, decided_by = resolve_tie(
        items,
        tie_breaker_order=["fewestSessionsThisMonth", "earliestRequest"],
        seed="test-seed"
    )

    assert sorted_items[0][0].id == "req-1"
    assert decided_by["req-1"] == "fewestSessionsThisMonth"

def test_earliest_request_tiebreaker():
    r1 = RequestItem(
        id="req-1", userId="u1", userName="Alice", department="CS",
        requestedSlotId="s1", sessionsThisMonth=2, submittedAt="2026-10-29T10:00:00Z"
    )
    r2 = RequestItem(
        id="req-2", userId="u2", userName="Bob", department="CS",
        requestedSlotId="s1", sessionsThisMonth=2, submittedAt="2026-10-29T09:00:00Z"
    )

    items = [(r1, 0.75, None), (r2, 0.75, None)]
    sorted_items, decided_by = resolve_tie(
        items,
        tie_breaker_order=["fewestSessionsThisMonth", "earliestRequest"],
        seed="test-seed"
    )

    # Bob submitted earlier
    assert sorted_items[0][0].id == "req-2"
    assert decided_by["req-2"] == "earliestRequest"
