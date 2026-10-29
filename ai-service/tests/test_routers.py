import asyncio
from app.routers.alternatives import find_alternatives
from app.routers.bundle import schedule_bundle
from app.routers.insights import calculate_gini, calculate_jain_index, get_insights
from app.schemas import AlternativesRequest, BundleRequest, RequestItem, Slot

def test_alternatives_filtering():
    target = Slot(
        id="s-target", resourceId="cam-1", resourceName="DSLR Camera",
        department="Media", startTime="2026-10-29T10:00:00Z",
        endTime="2026-10-29T12:00:00Z", capacity=1, slotType="credit", creditCost=3
    )
    s_alt1 = Slot(
        id="s-alt1", resourceId="cam-1", resourceName="DSLR Camera",
        department="Media", startTime="2026-10-29T14:00:00Z",
        endTime="2026-10-29T16:00:00Z", capacity=1, slotType="credit", creditCost=3
    )
    s_alt2 = Slot(
        id="s-alt2", resourceId="cam-2", resourceName="GoPro Kit",
        department="Media", startTime="2026-10-29T10:00:00Z",
        endTime="2026-10-29T12:00:00Z", capacity=1, slotType="free", creditCost=0
    )
    user = RequestItem(
        id="u1", userId="usr-1", userName="Alice", department="Media",
        requestedSlotId="s-target", currentCreditBalance=5, freeSessionsLeft=2,
        submittedAt="2026-10-29T08:00:00Z"
    )

    resp = asyncio.run(
        find_alternatives(
            AlternativesRequest(
                requestedSlot=target,
                availableSlots=[s_alt1, s_alt2],
                userRequest=user,
                limit=2,
            )
        )
    )
    assert len(resp.alternatives) == 2

def test_bundle_scheduler():
    s_printer = Slot(
        id="s-p", resourceId="printer-1", resourceName="3D Printer",
        department="Eng", startTime="2026-10-29T14:00:00Z",
        endTime="2026-10-29T16:00:00Z", capacity=1
    )
    s_vr = Slot(
        id="s-v", resourceId="vr-1", resourceName="VR Headset",
        department="Eng", startTime="2026-10-29T14:00:00Z",
        endTime="2026-10-29T16:00:00Z", capacity=1
    )
    user = RequestItem(
        id="team-req", userId="team-1", userName="Robotics Club", department="Eng",
        requestedSlotId="bundle", submittedAt="2026-10-29T08:00:00Z"
    )

    resp = asyncio.run(
        schedule_bundle(
            BundleRequest(
                resourceIds=["printer-1", "vr-1"],
                slotsByResource={
                    "printer-1": [s_printer],
                    "vr-1": [s_vr],
                },
                teamRequest=user,
                preferredStart="2026-10-29T14:00:00Z",
            )
        )
    )
    assert resp.isComplete is True
    assert len(resp.bundleSlots) == 2

def test_gini_and_jain_metrics():
    equal_allocations = [10.0, 10.0, 10.0, 10.0]
    assert calculate_gini(equal_allocations) == 0.0
    assert calculate_jain_index(equal_allocations) == 1.0

    unequal = [100.0, 0.0, 0.0, 0.0]
    assert calculate_jain_index(unequal) == 0.25
