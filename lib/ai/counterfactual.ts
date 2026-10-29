import { computeScoreComponents, computeWeightedScore } from "./scoring.js";
import type { Policy, StudentRequest } from "./types.js";

export function computeCounterfactual(
  request: StudentRequest,
  targetScore: number,
  policy: Policy,
  capacity = 1
): string | null {
  const currentComponents = computeScoreComponents(request, policy);
  const currentScore = computeWeightedScore(currentComponents, policy);
  const neededScore = targetScore + policy.epsilon;

  const scoreGap = neededScore - currentScore;
  if (scoreGap <= 0) {
    return null;
  }

  const rankLabel = capacity === 1 ? "ranked first" : "been allocated";

  // 1. Try reducing sessions in last 30 days
  if (policy.weights.usage > 0 && request.sessionsLast30d > 0) {
    const usageDeltaNeeded = scoreGap / policy.weights.usage;
    const currentUsage = currentComponents.usage;
    const targetUsage = currentUsage + usageDeltaNeeded;

    if (targetUsage <= 1.0) {
      const maxSessionsAllowed = (1 - targetUsage) * policy.usageCap;
      const fewerSessions = Math.ceil(request.sessionsLast30d - maxSessionsAllowed);
      if (fewerSessions > 0 && fewerSessions <= request.sessionsLast30d) {
        const plural = fewerSessions === 1 ? "session" : "sessions";
        return `If you had used ${fewerSessions} fewer ${plural} in the last 30 days you would have ${rankLabel}`;
      }
    }
  }

  // 2. Try increasing waiting hours
  if (policy.weights.waiting > 0) {
    const waitDeltaNeeded = scoreGap / policy.weights.waiting;
    const currentWait = currentComponents.waiting;
    const targetWait = currentWait + waitDeltaNeeded;

    if (targetWait <= 1.0) {
      const targetWaitHours = targetWait * policy.waitCap;
      const moreHours = Math.ceil(targetWaitHours - request.waitingHours);
      if (moreHours > 0) {
        const plural = moreHours === 1 ? "hour" : "hours";
        return `Waiting ${moreHours} more ${plural} in the queue would have helped you qualify for allocation`;
      }
    }
  }

  return null;
}
