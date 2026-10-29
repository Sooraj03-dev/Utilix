"""POST /bundle - Multi-resource synchronous team scheduling."""
from typing import Dict, List, Optional
from fastapi import APIRouter
from app.schemas import BundleRequest, BundleResponse, Slot

router = APIRouter()

@router.post("/bundle", response_model=BundleResponse)
async def schedule_bundle(payload: BundleRequest) -> BundleResponse:
    resource_ids = payload.resourceIds
    slots_by_res = payload.slotsByResource
    preferred = payload.preferredStart

    if not resource_ids:
        return BundleResponse(
            bundleSlots=[],
            isComplete=False,
            reason="No resources requested in bundle.",
        )

    # Find common overlapping slot intervals
    # Group slots by their (startTime, endTime)
    time_map: Dict[str, Dict[str, Slot]] = {}

    for res_id in resource_ids:
        available = slots_by_res.get(res_id, [])
        for slot in available:
            interval_key = f"{slot.startTime}_{slot.endTime}"
            if interval_key not in time_map:
                time_map[interval_key] = {}
            time_map[interval_key][res_id] = slot

    # Look for interval containing all resources
    chosen_interval: Optional[str] = None
    all_res_set = set(resource_ids)

    # If preferred start is given, prioritize intervals matching preferred start
    for key, res_dict in time_map.items():
        if set(res_dict.keys()) == all_res_set:
            if preferred and key.startswith(preferred):
                chosen_interval = key
                break
            if not chosen_interval:
                chosen_interval = key

    if chosen_interval:
        bundle = list(time_map[chosen_interval].values())
        return BundleResponse(
            bundleSlots=bundle,
            isComplete=True,
            reason="Synchronous slot found for all requested resources.",
        )

    # Fallback: largest subset of synchronous resources
    best_subset_key: Optional[str] = None
    best_subset_count = 0

    for key, res_dict in time_map.items():
        if len(res_dict) > best_subset_count:
            best_subset_count = len(res_dict)
            best_subset_key = key

    if best_subset_key and best_subset_count > 0:
        partial_bundle = list(time_map[best_subset_key].values())
        missing = list(all_res_set - set(time_map[best_subset_key].keys()))
        return BundleResponse(
            bundleSlots=partial_bundle,
            isComplete=False,
            reason=f"Partial bundle matched {best_subset_count}/{len(resource_ids)} resources. Missing: {', '.join(missing)}.",
        )

    return BundleResponse(
        bundleSlots=[],
        isComplete=False,
        reason="No overlapping available slots found for the requested equipment.",
    )
