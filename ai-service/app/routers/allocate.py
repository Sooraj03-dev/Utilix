"""POST /allocate - Deterministic Fair Allocation Engine."""
import time
from typing import Dict, List, Tuple
from fastapi import APIRouter
from app.config import settings
from app.explain import generate_fallback_explanation
from app.schemas import (
    AllocateRequest,
    AllocateResponse,
    AuditInfo,
    ExcludedItem,
    Policy,
    RankingItem,
    RequestItem,
    ScoreBreakdown,
    TieBreakInfo,
)
from app.scoring import calculate_score_breakdown, calculate_total_score
from app.tiebreak import resolve_tie

router = APIRouter()

@router.post("/allocate", response_model=AllocateResponse)
async def allocate(payload: AllocateRequest) -> AllocateResponse:
    start_time = time.perf_counter()
    slot = payload.slot
    requests = payload.requests
    policy = payload.policy or Policy()
    seed = payload.seed or policy.seed or settings.DEFAULT_TIEBREAK_SEED

    allocated: List[RankingItem] = []
    waitlist: List[RankingItem] = []
    excluded: List[ExcludedItem] = []

    # 1. Hard constraint validation
    eligible_requests: List[RequestItem] = []
    for req in requests:
        if not req.trainingVerified:
            excluded.append(
                ExcludedItem(
                    requestId=req.id,
                    userId=req.userId,
                    reason="Mandatory safety & equipment training is not verified for this resource.",
                    code="TRAINING_MISSING",
                )
            )
            continue

        if slot.slotType == "free":
            if req.freeSessionsLeft <= 0:
                excluded.append(
                    ExcludedItem(
                        requestId=req.id,
                        userId=req.userId,
                        reason="You have used all your free sessions for this week. Free quota resets every Monday.",
                        code="INSUFFICIENT_CREDITS",
                    )
                )
                continue
        elif slot.slotType == "credit":
            required_credits = slot.creditCost or policy.defaultCreditCost
            if req.currentCreditBalance < required_credits:
                excluded.append(
                    ExcludedItem(
                        requestId=req.id,
                        userId=req.userId,
                        reason=f"Insufficient credits for this slot. Required: {required_credits}, balance: {req.currentCreditBalance}.",
                        code="INSUFFICIENT_CREDITS",
                    )
                )
                continue

        eligible_requests.append(req)

    # 2. Score calculation
    scored_items: List[Tuple[RequestItem, float, ScoreBreakdown]] = []
    for req in eligible_requests:
        breakdown = calculate_score_breakdown(req)
        total_score = calculate_total_score(breakdown, policy.weights)
        scored_items.append((req, total_score, breakdown))

    # Sort descending by score initially
    scored_items.sort(key=lambda x: x[1], reverse=True)

    # 3. Contiguous tie detection and resolution
    epsilon = policy.epsilon
    decided_by_map: Dict[str, str] = {}
    tied_with_map: Dict[str, List[str]] = {}
    tie_groups_count = 0
    total_tied_requests = 0
    ties_decided_records: List[Dict[str, object]] = []

    final_ordered_items: List[Tuple[RequestItem, float, ScoreBreakdown]] = []
    idx = 0
    n = len(scored_items)

    while idx < n:
        group = [scored_items[idx]]
        j = idx + 1
        while j < n and abs(scored_items[idx][1] - scored_items[j][1]) <= epsilon:
            group.append(scored_items[j])
            j += 1

        if len(group) > 1:
            tie_groups_count += 1
            total_tied_requests += len(group)
            group_ids = [it[0].id for it in group]

            for req_id in group_ids:
                tied_with_map[req_id] = [other for other in group_ids if other != req_id]

            resolved_group, group_decided_by = resolve_tie(group, policy.tieBreakerOrder, seed)
            decided_by_map.update(group_decided_by)

            ties_decided_records.append({
                "tiedRequestIds": group_ids,
                "decidedBy": list(group_decided_by.values())[0] if group_decided_by else "tiebreak",
            })
            final_ordered_items.extend(resolved_group)
        else:
            final_ordered_items.append(group[0])

        idx = j

    # 4. Rank assignment and explanation generation
    for rank_idx, (req, score, breakdown) in enumerate(final_ordered_items):
        rank = rank_idx + 1
        is_alloc = rank <= slot.capacity
        decided_by = decided_by_map.get(req.id)
        tied_with = tied_with_map.get(req.id, [])

        student_reason, coord_summary = generate_fallback_explanation(
            req=req,
            rank=rank,
            total_score=score,
            breakdown=breakdown,
            is_allocated=is_alloc,
            decided_by=decided_by,
        )

        item = RankingItem(
            requestId=req.id,
            userId=req.userId,
            rank=rank,
            totalScore=score,
            scoreBreakdown=breakdown,
            studentReason=student_reason,
            coordinatorSummary=coord_summary,
            decidedBy=decided_by,
            tiedWith=tied_with,
        )

        if is_alloc:
            allocated.append(item)
        else:
            waitlist.append(item)

    execution_time_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

    audit = AuditInfo(
        totalRequests=len(requests),
        eligibleRequests=len(eligible_requests),
        excludedRequests=len(excluded),
        capacity=slot.capacity,
        policyUsed=policy,
        tieBreakInfo=TieBreakInfo(
            tiedGroupsCount=tie_groups_count,
            totalTiedRequests=total_tied_requests,
            tiesDecided=ties_decided_records,
        ),
        executionTimeMs=execution_time_ms,
    )

    return AllocateResponse(
        allocated=allocated,
        waitlist=waitlist,
        excluded=excluded,
        audit=audit,
    )
