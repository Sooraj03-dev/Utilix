import {
  type PartialPolicy,
  type Policy,
  PolicySchema,
  type PolicyWeights,
} from "./types.js";

export const DEFAULT_POLICY: Policy = {
  version: "v1",
  freeSessionsPerWeek: 2,
  monthlyCredits: 10,
  defaultCreditCost: 2,
  maxActiveBookings: 3,
  weights: {
    usage: 0.5,
    waiting: 0.25,
    need: 0.2,
    diversity: 0.05,
  },
  usageCap: 10,
  waitCap: 72,
  needWindowDays: 7,
  epsilon: 0.0001,
  tieBreakOrder: ["fewestSessionsThisMonth", "earliestRequest", "seededLottery"],
};

export function normaliseWeights(weights: PolicyWeights): PolicyWeights {
  const sum = weights.usage + weights.waiting + weights.need + weights.diversity;
  if (Math.abs(sum - 1.0) < 1e-6) {
    return { ...weights };
  }
  if (sum <= 0) {
    return { ...DEFAULT_POLICY.weights };
  }
  const usage = Math.round((weights.usage / sum) * 10000) / 10000;
  const waiting = Math.round((weights.waiting / sum) * 10000) / 10000;
  const need = Math.round((weights.need / sum) * 10000) / 10000;
  // Adjust diversity so the sum is exactly 1.0
  const diversity = Math.round((1.0 - (usage + waiting + need)) * 10000) / 10000;

  return {
    usage,
    waiting,
    need,
    diversity,
  };
}

export function mergePolicy(partial?: PartialPolicy): Policy {
  if (!partial) {
    return { ...DEFAULT_POLICY, weights: { ...DEFAULT_POLICY.weights } };
  }

  const merged = {
    ...DEFAULT_POLICY,
    ...partial,
    weights: {
      ...DEFAULT_POLICY.weights,
      ...(partial.weights ?? {}),
    },
    tieBreakOrder: partial.tieBreakOrder ?? [...DEFAULT_POLICY.tieBreakOrder],
  };

  merged.weights = normaliseWeights(merged.weights);

  return PolicySchema.parse(merged);
}
