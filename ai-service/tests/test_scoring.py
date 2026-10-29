from app.schemas import PolicyWeights, RequestItem
from app.scoring import (
    calculate_score_breakdown,
    calculate_total_score,
    normalise_weights,
    score_diversity,
    score_need,
    score_usage,
    score_waiting,
)

def test_usage_monotonic_decrease():
    assert score_usage(0) == 1.0
    assert score_usage(1) == 0.5
    assert score_usage(3) == 0.25
    assert score_usage(0) > score_usage(1) > score_usage(5)

def test_waiting_saturation():
    assert score_waiting(0.0) == 0.0
    assert round(score_waiting(36.0), 4) == 0.5
    assert score_waiting(72.0) == 1.0
    assert score_waiting(100.0) == 1.0

def test_need_score_clamping():
    assert score_need(0.0) == 0.0
    assert score_need(5.0) == 0.5
    assert score_need(10.0) == 1.0
    assert score_need(15.0) == 1.0

def test_diversity_scoring():
    d_regular = score_diversity("CS", is_priority_group=False, dep_sessions=0)
    d_priority = score_diversity("CS", is_priority_group=True, dep_sessions=0)
    assert d_priority > d_regular

def test_weight_normalisation():
    unnorm = PolicyWeights(usage=1.0, waiting=1.0, need=1.0, diversity=1.0)
    norm = normalise_weights(unnorm)
    assert norm.usage == 0.25
    assert norm.waiting == 0.25
    assert round(norm.usage + norm.waiting + norm.need + norm.diversity, 6) == 1.0
