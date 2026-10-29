import { checkConstraints } from "./constraints.js";
import { computeCounterfactual } from "./counterfactual.js";
import { mergePolicy } from "./policy.js";
import { computeScoreComponents, scoreRequest } from "./scoring.js";
import {
  formatCoordinatorAllocatedSummary,
  formatCoordinatorWaitlistedSummary,
  formatStudentAllocatedReason,
  formatStudentWaitlistedReason,
} from "./templates.js";
import { sortAndResolveTies } from "./tiebreak.js";
import type {
  AllocateData,
  AllocateRequest,
  ExcludedRequest,
  RankedRequest,
} from "./types.js";

export function allocateRequests(
  input: AllocateRequest,
  source: "ai" | "fallback" = "fallback"
): AllocateData {
  const policy = mergePolicy(input.policy);
  const slot = input.slot;
  const capacity = slot.capacity ?? 1;
  const seed = input.seed ?? `${slot.id}:${policy.version}`;

  const excluded: ExcludedRequest[] = [];
  const validCandidates: Array<{
    request: (typeof input.requests)[number];
    creditCharge: number;
    score: number;
  }> = [];

  // 1. Hard constraints check before scoring
  for (const req of input.requests) {
    const check = checkConstraints(req, slot, policy);
    if (!check.valid && check.exclusion) {
      excluded.push(check.exclusion);
    } else {
      const { score } = scoreRequest(req, policy);
      validCandidates.push({
        request: req,
        creditCharge: check.creditCharge,
        score,
      });
    }
  }

  // 2. Sort candidates & resolve ties deterministically
  const { sorted, tieBreakInfo } = sortAndResolveTies(
    validCandidates,
    policy,
    seed
  );

  // 3. Determine lowest allocated score for counterfactual calculations
  const allocatedCount = Math.min(sorted.length, capacity);
  const lowestAllocatedScore =
    allocatedCount > 0 ? sorted[allocatedCount - 1].score : 0;

  // 4. Build ranking list
  const ranking: RankedRequest[] = [];
  let waitlistPos = 1;

  for (let i = 0; i < sorted.length; i++) {
    const candidate = sorted[i];
    const rank = i + 1;
    const isAllocated = rank <= capacity;
    const components = computeScoreComponents(candidate.request, policy);
    const requiresApproval = isAllocated ? slot.restricted : false;
    const waitlistPosition = isAllocated ? null : waitlistPos++;

    const counterfactual = isAllocated
      ? null
      : computeCounterfactual(
          candidate.request,
          lowestAllocatedScore,
          policy,
          capacity
        );

    const studentReason = isAllocated
      ? formatStudentAllocatedReason(slot.resourceName, requiresApproval, tieBreakInfo)
      : formatStudentWaitlistedReason(
          slot.resourceName,
          waitlistPosition!,
          counterfactual,
          tieBreakInfo
        );

    const coordinatorSummary = isAllocated
      ? formatCoordinatorAllocatedSummary(
          candidate.request.requestId,
          candidate.score,
          requiresApproval,
          tieBreakInfo
        )
      : formatCoordinatorWaitlistedSummary(
          candidate.request.requestId,
          waitlistPosition!,
          candidate.score
        );

    ranking.push({
      requestId: candidate.request.requestId,
      rank,
      score: candidate.score,
      components,
      decision: isAllocated ? "allocated" : "waitlisted",
      creditCharge: candidate.creditCharge,
      requiresCoordinatorApproval: requiresApproval,
      waitlistPosition,
      studentReason,
      coordinatorSummary,
      counterfactual,
    });
  }

  // 5. Construct audit record
  const auditResults = [
    ...ranking.map((r) => ({
      requestId: r.requestId,
      decision: r.decision,
      rank: r.rank as number | null,
      score: r.score as number | null,
    })),
    ...excluded.map((e) => ({
      requestId: e.requestId,
      decision: e.decision,
      rank: null,
      score: null,
    })),
  ];

  return {
    slotId: slot.id,
    ranking,
    excluded,
    tieBreak: tieBreakInfo,
    audit: {
      action: "ALLOCATION_DECISION",
      ruleVersion: policy.version,
      slotId: slot.id,
      seed,
      results: auditResults,
      source,
    },
  };
}
