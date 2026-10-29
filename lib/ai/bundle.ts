import type {
  BundleData,
  BundleRequest,
  CandidateSlot,
  WantedResource,
} from "./types.js";

interface MatchedSlot {
  resourceId: string;
  resourceName: string;
  slotId: string;
  startsAt: string;
  endsAt: string;
  creditCost: number;
}

export function planBundle(input: BundleRequest): BundleData {
  const { teamId, creditsAvailable, wantedResources } = input;

  // Generate combinations of windows across subsets of resources
  // First attempt: check if all resources can share an overlapping window
  const fullPlan = findCommonWindow(wantedResources, creditsAvailable);
  if (fullPlan) {
    const totalCost = fullPlan.reduce((acc, p) => acc + p.creditCost, 0);
    return {
      teamId,
      plan: fullPlan,
      unmet: [],
      totalCreditCost: totalCost,
      explanation: `Successfully scheduled all ${fullPlan.length} requested resources in a synchronized time window.`,
    };
  }

  // If not all can be synchronized, search largest subset down to 1
  const sortedSubsets = generateSubsets(wantedResources).sort(
    (a, b) => b.length - a.length
  );

  for (const subset of sortedSubsets) {
    if (subset.length === 0) continue;
    const partial = findCommonWindow(subset, creditsAvailable);
    if (partial) {
      const scheduledIds = new Set(partial.map((p) => p.resourceId));
      const unmet = wantedResources
        .filter((r) => !scheduledIds.has(r.resourceId))
        .map((r) => {
          const reason =
            r.candidateWindows.length === 0
              ? `No available slots in the target period for ${r.resourceName}.`
              : `Could not synchronize ${r.resourceName} with the selected team session window.`;

          const alternatives: CandidateSlot[] = r.candidateWindows.map((cw) => ({
            slotId: cw.slotId,
            resourceId: r.resourceId,
            resourceName: r.resourceName,
            resourceType: r.resourceType,
            department: "General",
            startsAt: cw.startsAt,
            endsAt: cw.endsAt,
            slotType: cw.creditCost > 0 ? "credit" : "free",
            creditCost: cw.creditCost,
          }));

          return {
            resourceId: r.resourceId,
            resourceName: r.resourceName,
            reason,
            alternatives,
          };
        });

      const totalCost = partial.reduce((acc, p) => acc + p.creditCost, 0);
      return {
        teamId,
        plan: partial,
        unmet,
        totalCreditCost: totalCost,
        explanation: `Scheduled partial bundle of ${partial.length} of ${wantedResources.length} resources. ${unmet.length} resource(s) could not be synchronized and are listed with alternatives.`,
      };
    }
  }

  // Fallback if no window could be found even for single resources
  const unmet = wantedResources.map((r) => ({
    resourceId: r.resourceId,
    resourceName: r.resourceName,
    reason: `Insufficient credits or no viable open slots for ${r.resourceName}.`,
  }));

  return {
    teamId,
    plan: [],
    unmet,
    totalCreditCost: 0,
    explanation: "No synchronized bundle slots could be formed within credit constraints.",
  };
}

function findCommonWindow(
  resources: WantedResource[],
  maxCredits: number
): MatchedSlot[] | null {
  if (resources.length === 0) return null;

  // Cartesian product over candidate windows
  const combinations = cartesianProduct(resources.map((r) => r.candidateWindows));

  for (const combo of combinations) {
    if (combo.length !== resources.length) continue;

    // Check credit cost
    const cost = combo.reduce((acc, c) => acc + c.creditCost, 0);
    if (cost > maxCredits) continue;

    // Check intersection: max(startsAt) < min(endsAt)
    let maxStart = new Date(combo[0].startsAt).getTime();
    let minEnd = new Date(combo[0].endsAt).getTime();

    let valid = true;
    for (let i = 1; i < combo.length; i++) {
      const s = new Date(combo[i].startsAt).getTime();
      const e = new Date(combo[i].endsAt).getTime();
      if (s > maxStart) maxStart = s;
      if (e < minEnd) minEnd = e;
      if (maxStart >= minEnd) {
        valid = false;
        break;
      }
    }

    if (valid) {
      return resources.map((r, idx) => ({
        resourceId: r.resourceId,
        resourceName: r.resourceName,
        slotId: combo[idx].slotId,
        startsAt: combo[idx].startsAt,
        endsAt: combo[idx].endsAt,
        creditCost: combo[idx].creditCost,
      }));
    }
  }

  return null;
}

function generateSubsets<T>(array: T[]): T[][] {
  const result: T[][] = [[]];
  for (const element of array) {
    const len = result.length;
    for (let i = 0; i < len; i++) {
      result.push([...result[i], element]);
    }
  }
  return result;
}

function cartesianProduct<T>(arrays: T[][]): T[][] {
  return arrays.reduce<T[][]>(
    (acc, curr) => {
      const res: T[][] = [];
      for (const a of acc) {
        for (const c of curr) {
          res.push([...a, c]);
        }
      }
      return res;
    },
    [[]]
  );
}
