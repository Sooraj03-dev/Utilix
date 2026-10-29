import type { Policy, ScoreComponents, StudentRequest } from "./types.js";

export function computeScoreComponents(
  request: StudentRequest,
  policy: Policy
): ScoreComponents {
  // Usage component: rewards lower recent usage (0..1)
  const usageRatio = Math.min(request.sessionsLast30d / policy.usageCap, 1);
  const usage = Math.max(0, 1 - usageRatio);

  // Waiting component: rewards longer queue wait (0..1)
  const waitingRatio = Math.min(request.waitingHours / policy.waitCap, 1);
  const waiting = Math.max(0, waitingRatio);

  // Need component: rewards imminent academic deadlines (0..1)
  let need = 0;
  if (request.deadlineDays !== null && request.deadlineDays <= policy.needWindowDays) {
    const clampedDeadline = Math.max(request.deadlineDays, 0);
    need = 1 - clampedDeadline / policy.needWindowDays;
  }

  // Diversity component: rewards cross-department collaboration (0..1)
  // 1 department -> 0.0, 2 departments -> 0.5, 3+ departments -> 1.0
  const deptCount = Math.max(request.departmentsInTeam, 1);
  const diversity = Math.min(Math.max(deptCount - 1, 0), 2) / 2;

  return {
    usage: Math.round(usage * 10000) / 10000,
    waiting: Math.round(waiting * 10000) / 10000,
    need: Math.round(need * 10000) / 10000,
    diversity: Math.round(diversity * 10000) / 10000,
  };
}

export function computeWeightedScore(
  components: ScoreComponents,
  policy: Policy
): number {
  const { weights } = policy;
  const rawScore =
    components.usage * weights.usage +
    components.waiting * weights.waiting +
    components.need * weights.need +
    components.diversity * weights.diversity;

  return Math.round(rawScore * 10000) / 10000;
}

export function scoreRequest(
  request: StudentRequest,
  policy: Policy
): { score: number; components: ScoreComponents } {
  const components = computeScoreComponents(request, policy);
  const score = computeWeightedScore(components, policy);
  return { score, components };
}
