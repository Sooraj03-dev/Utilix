import asyncio
from app.routers.allocate import allocate
from app.schemas import AllocateRequest, Policy, RequestItem, Slot

def test_training_unverified_exclusion():
    slot = Slot(
        id="slot-1", resourceId="printer-1", resourceName="3D Printer",
        department="Engineering", startTime="2026-10-29T14:00:00Z",
        endTime="2026-10-29T16:00:00Z", capacity=1, slotType="free"
    )
    req = RequestItem(
        id="req-1", userId="u1", userName="Alice", department="CS",
        requestedSlotId="slot-1", trainingVerified=False, submittedAt="2026-10-29T10:00:00Z"
    )

    resp = asyncio.run(allocate(AllocateRequest(slot=slot, requests=[req])))
    assert len(resp.allocated) == 0
    assert len(resp.excluded) == 1
    assert resp.excluded[0].code == "TRAINING_MISSING"

def test_free_slot_exhaustion_exclusion():
    slot = Slot(
        id="slot-1", resourceId="printer-1", resourceName="3D Printer",
        department="Engineering", startTime="2026-10-29T14:00:00Z",
        endTime="2026-10-29T16:00:00Z", capacity=1, slotType="free"
    )
    req = RequestItem(
        id="req-1", userId="u1", userName="Alice", department="CS",
        requestedSlotId="slot-1", freeSessionsLeft=0, currentCreditBalance=50,
        trainingVerified=True, submittedAt="2026-10-29T10:00:00Z"
    )

    resp = asyncio.run(allocate(AllocateRequest(slot=slot, requests=[req])))
    assert len(resp.allocated) == 0
    assert len(resp.excluded) == 1
    assert resp.excluded[0].code == "INSUFFICIENT_CREDITS"
    assert "used all your free sessions" in resp.excluded[0].reason

def test_credit_slot_insufficient_credits():
    slot = Slot(
        id="slot-1", resourceId="studio-1", resourceName="Recording Studio",
        department="Arts", startTime="2026-10-29T14:00:00Z",
        endTime="2026-10-29T16:00:00Z", capacity=1, slotType="credit", creditCost=5
    )
    req = RequestItem(
        id="req-1", userId="u1", userName="Alice", department="Music",
        requestedSlotId="slot-1", currentCreditBalance=2,
        trainingVerified=True, submittedAt="2026-10-29T10:00:00Z"
    )

    resp = asyncio.run(allocate(AllocateRequest(slot=slot, requests=[req])))
    assert len(resp.allocated) == 0
    assert len(resp.excluded) == 1
    assert resp.excluded[0].code == "INSUFFICIENT_CREDITS"
    assert "Required: 5" in resp.excluded[0].reason

def test_fair_allocation_and_capacity():
    slot = Slot(
        id="slot-1", resourceId="lab-1", resourceName="AR/VR Lab",
        department="CS", startTime="2026-10-29T14:00:00Z",
        endTime="2026-10-29T16:00:00Z", capacity=2, slotType="free"
    )
    r1 = RequestItem(
        id="req-1", userId="u1", userName="Alice", department="CS",
        requestedSlotId="slot-1", sessionsThisMonth=0, waitingHours=48.0,
        projectNeedScore=9.0, trainingVerified=True, freeSessionsLeft=3,
        submittedAt="2026-10-29T09:00:00Z"
    )
    r2 = RequestItem(
        id="req-2", userId="u2", userName="Bob", department="CS",
        requestedSlotId="slot-1", sessionsThisMonth=1, waitingHours=24.0,
        projectNeedScore=7.0, trainingVerified=True, freeSessionsLeft=2,
        submittedAt="2026-10-29T10:00:00Z"
    )
    r3 = RequestItem(
        id="req-3", userId="u3", userName="Charlie", department="CS",
        requestedSlotId="slot-1", sessionsThisMonth=5, waitingHours=2.0,
        projectNeedScore=4.0, trainingVerified=True, freeSessionsLeft=1,
        submittedAt="2026-10-29T11:00:00Z"
    )

    resp = asyncio.run(allocate(AllocateRequest(slot=slot, requests=[r1, r2, r3])))
    assert len(resp.allocated) == 2
    assert resp.allocated[0].requestId == "req-1"
    assert resp.allocated[1].requestId == "req-2"
    assert len(resp.waitlist) == 1
    assert resp.waitlist[0].requestId == "req-3"
    assert resp.audit.capacity == 2
    assert resp.audit.eligibleRequests == 3
