import type {
  AlternativeItem,
  AlternativesData,
  AlternativesRequest,
  CandidateSlot,
} from "./types.js";

export function findTopAlternatives(
  input: AlternativesRequest
): AlternativesData {
  const { request, targetSlot, candidateSlots } = input;
  const targetDept = targetSlot.department || "";

  // Filter out slots that would exceed credits if slot requires credits
  const viable = candidateSlots.filter((slot) => {
    if (slot.slotType === "credit" && slot.creditCost > request.creditsAvailable) {
      return false;
    }
    return true;
  });

  // Deterministically sort top candidates:
  // 1. Soonest start
  // 2. Lower credit cost
  // 3. Same department as target slot
  const sorted = [...viable].sort((a, b) => {
    const timeA = new Date(a.startsAt).getTime();
    const timeB = new Date(b.startsAt).getTime();
    if (timeA !== timeB) return timeA - timeB;

    if (a.creditCost !== b.creditCost) {
      return a.creditCost - b.creditCost;
    }

    const sameDeptA = a.department === targetDept ? 1 : 0;
    const sameDeptB = b.department === targetDept ? 1 : 0;
    if (sameDeptA !== sameDeptB) return sameDeptB - sameDeptA;

    return a.slotId.localeCompare(b.slotId);
  });

  const top3 = sorted.slice(0, 3);

  const alternatives: AlternativeItem[] = top3.map((slot, index) => {
    const rank = index + 1;
    const costText = slot.slotType === "free" ? "Free access" : `${slot.creditCost} credits`;
    const deptText =
      slot.department === targetDept
        ? `in your home department (${slot.department})`
        : `in ${slot.department}`;
    const startTime = new Date(slot.startsAt).toUTCString().replace(" GMT", " UTC");

    let reason = `${slot.resourceName} (${deptText}): ${costText}, starting ${startTime}.`;
    if (slot.slotType === "free" && request.creditsAvailable === 0) {
      reason += " Great off-peak choice requiring zero credits.";
    }

    return {
      slot,
      rank,
      reason,
    };
  });

  return {
    requestId: request.requestId,
    alternatives,
  };
}
