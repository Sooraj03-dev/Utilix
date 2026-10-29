"""POST /alternatives - Smart alternative slot recommendations."""
from typing import List
from fastapi import APIRouter
from app.schemas import AlternativeOption, AlternativesRequest, AlternativesResponse, Slot

router = APIRouter()

@router.post("/alternatives", response_model=AlternativesResponse)
async def find_alternatives(payload: AlternativesRequest) -> AlternativesResponse:
    target = payload.requestedSlot
    req = payload.userRequest
    slots = payload.availableSlots
    limit = max(1, payload.limit)

    scored_alternatives: List[AlternativeOption] = []

    for slot in slots:
        if slot.id == target.id:
            continue

        # Check eligibility
        if slot.slotType == "credit" and req.currentCreditBalance < slot.creditCost:
            continue
        if slot.slotType == "free" and req.freeSessionsLeft <= 0:
            continue

        # Similarity metrics
        same_resource = slot.resourceId == target.resourceId
        same_department = slot.department == target.department
        
        diff = 0.0
        reasons = []

        if same_resource:
            diff += 0.1
            reasons.append("Same equipment")
        elif same_department:
            diff += 0.25
            reasons.append("Same department")
        else:
            diff += 0.5
            reasons.append("Different department")

        if slot.slotType == "free":
            reasons.append("Free access quota")
        else:
            reasons.append(f"Requires {slot.creditCost} credits")

        scored_alternatives.append(
            AlternativeOption(
                slot=slot,
                scoreDiff=round(diff, 2),
                reason=", ".join(reasons),
            )
        )

    # Sort by closest match (lowest diff) and then start time
    scored_alternatives.sort(key=lambda x: (x.scoreDiff, x.slot.startTime))

    return AlternativesResponse(alternatives=scored_alternatives[:limit])
