import asyncio
from app.explain import clear_explanation_cache, generate_explanation, generate_fallback_explanation, has_contradiction
from app.schemas import RequestItem, ScoreBreakdown

def test_fallback_explanation_word_limits_and_no_names():
    req = RequestItem(
        id="req-99", userId="u99", userName="Secret Student Name",
        department="Robotics", requestedSlotId="s1",
        sessionsThisMonth=0, waitingHours=36.0, projectNeedScore=9.0,
        submittedAt="2026-10-29T10:00:00Z"
    )
    breakdown = ScoreBreakdown(usage=1.0, waiting=0.5, need=0.9, diversity=0.8)

    s_reason, c_summary = generate_fallback_explanation(
        req=req, rank=1, total_score=0.85, breakdown=breakdown, is_allocated=True
    )

    # Check word budgets
    assert len(s_reason.split()) <= 60
    assert len(c_summary.split()) <= 25

    # Check that private name is NOT included
    assert "Secret Student Name" not in s_reason
    assert "Secret Student Name" not in c_summary

def test_contradiction_detection():
    # If allocated, claiming waitlisted/denied is a contradiction
    assert has_contradiction("You have been placed on the waitlist.", is_allocated=True) is True
    assert has_contradiction("Your request was denied due to capacity.", is_allocated=True) is True
    assert has_contradiction("You were allocated this slot.", is_allocated=True) is False

    # If waitlisted, claiming allocated is a contradiction
    assert has_contradiction("You were allocated this slot successfully.", is_allocated=False) is True
    assert has_contradiction("You are placed at rank #2 on the waitlist.", is_allocated=False) is False

def test_generate_explanation_fallback_source():
    clear_explanation_cache()
    req = RequestItem(
        id="req-77", userId="u77", userName="John Doe",
        department="Bio", requestedSlotId="s1",
        submittedAt="2026-10-29T10:00:00Z"
    )
    breakdown = ScoreBreakdown(usage=1.0, waiting=0.0, need=0.5, diversity=0.5)

    s_reason, c_summary, source = asyncio.run(
        generate_explanation(
            req=req, rank=1, total_score=0.75, breakdown=breakdown, is_allocated=True
        )
    )
    assert source == "fallback"
    assert "John Doe" not in s_reason
    assert len(s_reason.split()) <= 60
