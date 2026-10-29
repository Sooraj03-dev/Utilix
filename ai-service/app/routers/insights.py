"""GET /insights - Campus resource fairness metrics and recommendations."""
from typing import Dict, List, Optional
from fastapi import APIRouter, Query
from app.schemas import InsightsResponse

router = APIRouter()

def calculate_gini(values: List[float]) -> float:
    """Calculate Gini coefficient for resource distribution equality."""
    if not values or len(values) <= 1:
        return 0.0
    sorted_vals = sorted(values)
    n = len(sorted_vals)
    total = sum(sorted_vals)
    if total == 0:
        return 0.0
    numerator = sum((2 * (i + 1) - n - 1) * val for i, val in enumerate(sorted_vals))
    return round(numerator / (n * total), 4)

def calculate_jain_index(values: List[float]) -> float:
    """Jain's Fairness Index: (sum(x))^2 / (n * sum(x^2))."""
    if not values:
        return 1.0
    n = len(values)
    sum_vals = sum(values)
    sum_sq = sum(v * v for v in values)
    if sum_sq == 0:
        return 1.0
    return round((sum_vals * sum_vals) / (n * sum_sq), 4)

@router.get("/insights", response_model=InsightsResponse)
async def get_insights(demo: bool = Query(True, description="Return live or demo telemetry")) -> InsightsResponse:
    # Utilization and contention data
    utilization: Dict[str, float] = {
        "res-3d-printer-1": 0.88,
        "res-vr-lab-1": 0.42,
        "res-recording-studio": 0.95,
        "res-arduino-kit-lab": 0.35,
        "res-laser-cutter": 0.80,
    }

    contention: Dict[str, float] = {
        "res-3d-printer-1": 3.4,
        "res-vr-lab-1": 1.1,
        "res-recording-studio": 4.8,
        "res-arduino-kit-lab": 0.8,
        "res-laser-cutter": 2.6,
    }

    department_allocations = [42.0, 38.0, 15.0, 29.0, 31.0]
    gini = calculate_gini(department_allocations)
    jain = calculate_jain_index(department_allocations)

    recommendations: List[Dict[str, str]] = [
        {
            "resource": "Recording Studio (res-recording-studio)",
            "action": "Increase credit cost or shorten slot duration to 1 hour to alleviate 4.8x contention.",
            "urgency": "HIGH",
        },
        {
            "resource": "Arduino Kit Lab (res-arduino-kit-lab)",
            "action": "Lower credit barrier or promote to Mechanical/Civil engineering cohorts to improve 35% utilization.",
            "urgency": "MEDIUM",
        },
        {
            "resource": "3D Printer Lab (res-3d-printer-1)",
            "action": "Activate quota reservation for first-time project teams to preserve equity under high demand.",
            "urgency": "HIGH",
        },
    ]

    narrative: List[str] = [
        f"Campus allocation engine maintained high fairness (Jain's Index: {jain}, Gini: {gini}).",
        "Severe slot contention observed in Recording Studio (4.8x) and 3D Printers (3.4x) during peak evening windows.",
        "Underutilized resources (Arduino Kit Lab at 35%) can absorb overflow demand through inter-departmental projects.",
    ]

    return InsightsResponse(
        equipmentUtilization=utilization,
        contentionRate=contention,
        giniCoefficient=gini,
        jainFairnessIndex=jain,
        recommendations=recommendations,
        narrative=narrative,
    )
