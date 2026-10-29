import type { ExclusionCode, TieBreakInfo } from "./types.js";

export function formatStudentAllocatedReason(
  resourceName: string,
  requiresApproval: boolean,
  tieBreak?: TieBreakInfo
): string {
  const tieNote =
    tieBreak?.used && tieBreak.decidedBy
      ? ` Tie resolved fairly via ${tieBreak.decidedBy}.`
      : "";
  if (requiresApproval) {
    return `Your slot for ${resourceName} is tentatively allocated pending coordinator approval.${tieNote} Please monitor your notifications.`;
  }
  return `Your reservation for ${resourceName} is confirmed! You ranked top based on lower recent usage and wait time.${tieNote}`;
}

export function formatCoordinatorAllocatedSummary(
  requestId: string,
  score: number,
  requiresApproval: boolean,
  tieBreak?: TieBreakInfo
): string {
  const tieNote = tieBreak?.used ? ` (tie-broken via ${tieBreak.decidedBy})` : "";
  const approvalNote = requiresApproval ? " [Approval required]" : "";
  return `Allocated ${requestId} with score ${score.toFixed(4)}${tieNote}.${approvalNote}`;
}

export function formatStudentWaitlistedReason(
  resourceName: string,
  position: number,
  counterfactual: string | null,
  tieBreak?: TieBreakInfo
): string {
  const tieNote =
    tieBreak?.used && tieBreak.decidedBy
      ? ` Tie broken by ${tieBreak.decidedBy}.`
      : "";
  const cfNote = counterfactual ? ` Tip: ${counterfactual}.` : "";
  return `You are currently waitlisted at position #${position} for ${resourceName}.${tieNote}${cfNote}`;
}

export function formatCoordinatorWaitlistedSummary(
  requestId: string,
  position: number,
  score: number
): string {
  return `Waitlisted ${requestId} at position #${position} with score ${score.toFixed(4)}.`;
}

export function formatExclusionStudentReason(
  code: ExclusionCode,
  resourceName: string,
  charge = 0,
  available = 0
): string {
  switch (code) {
    case "TRAINING_MISSING":
      return `Safety certification missing for ${resourceName}. Please complete the required lab workshop before reserving.`;
    case "LIMIT_REACHED":
      return `Active reservation limit reached. Release an existing booking or wait until your active slot completes.`;
    case "RESOURCE_UNAVAILABLE":
      return `${resourceName} is unavailable during this time window due to maintenance or department reservation.`;
    case "OVERLAP":
      return `You have an existing conflicting reservation during this slot timeframe.`;
    case "INSUFFICIENT_CREDITS":
      return `Insufficient credits: requires ${charge} credits but you have ${available}. Consider choosing an off-peak free slot or wait for replenishment.`;
  }
}

export function formatExclusionCoordinatorSummary(
  requestId: string,
  code: ExclusionCode
): string {
  return `Excluded ${requestId}: failed constraint ${code}.`;
}
