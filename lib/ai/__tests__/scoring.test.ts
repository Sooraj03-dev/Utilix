import { describe, expect, it } from "vitest";
import { DEFAULT_POLICY, normaliseWeights } from "../policy.js";
import { computeScoreComponents, computeWeightedScore, scoreRequest } from "../scoring.js";
import type { StudentRequest } from "../types.js";

const baseRequest: StudentRequest = {
  requestId: "req-1",
  requestedAt: "2026-10-29T10:00:00Z",
  sessionsLast30d: 2,
  sessionsThisMonth: 1,
  waitingHours: 24,
  deadlineDays: 3,
  departmentsInTeam: 2,
  creditsAvailable: 10,
  freeSessionsLeft: 2,
  constraints: {
    trainingOk: true,
    withinBookingLimit: true,
    resourceAvailable: true,
    noOverlap: true,
  },
};

describe("scoring.ts", () => {
  it("computes all components in 0..1 range", () => {
    const components = computeScoreComponents(baseRequest, DEFAULT_POLICY);
    expect(components.usage).toBeGreaterThanOrEqual(0);
    expect(components.usage).toBeLessThanOrEqual(1);
    expect(components.waiting).toBeGreaterThanOrEqual(0);
    expect(components.waiting).toBeLessThanOrEqual(1);
    expect(components.need).toBeGreaterThanOrEqual(0);
    expect(components.need).toBeLessThanOrEqual(1);
    expect(components.diversity).toBeGreaterThanOrEqual(0);
    expect(components.diversity).toBeLessThanOrEqual(1);
  });

  it("satisfies usage monotonicity: more sessions never raises score", () => {
    const lowUsageReq = { ...baseRequest, sessionsLast30d: 1 };
    const highUsageReq = { ...baseRequest, sessionsLast30d: 5 };
    const scoreLow = scoreRequest(lowUsageReq, DEFAULT_POLICY).score;
    const scoreHigh = scoreRequest(highUsageReq, DEFAULT_POLICY).score;
    expect(scoreLow).toBeGreaterThan(scoreHigh);
  });

  it("satisfies waiting monotonicity: more waiting hours never lowers score", () => {
    const lowWait = { ...baseRequest, waitingHours: 5 };
    const highWait = { ...baseRequest, waitingHours: 40 };
    const scoreLow = scoreRequest(lowWait, DEFAULT_POLICY).score;
    const scoreHigh = scoreRequest(highWait, DEFAULT_POLICY).score;
    expect(highWaitScore(scoreHigh, scoreLow)).toBe(true);
  });

  it("handles deadline edge cases properly", () => {
    const noDeadline = { ...baseRequest, deadlineDays: null };
    expect(computeScoreComponents(noDeadline, DEFAULT_POLICY).need).toBe(0);

    const farDeadline = { ...baseRequest, deadlineDays: 14 }; // > needWindowDays (7)
    expect(computeScoreComponents(farDeadline, DEFAULT_POLICY).need).toBe(0);

    const urgentDeadline = { ...baseRequest, deadlineDays: 0 };
    expect(computeScoreComponents(urgentDeadline, DEFAULT_POLICY).need).toBe(1);
  });

  it("normalises weights if they do not sum to 1", () => {
    const unnormalised = { usage: 2, waiting: 1, need: 1, diversity: 0 };
    const normalised = normaliseWeights(unnormalised);
    const sum =
      normalised.usage + normalised.waiting + normalised.need + normalised.diversity;
    expect(Math.abs(sum - 1.0)).toBeLessThan(1e-4);
  });
});

function highWaitScore(high: number, low: number): boolean {
  return high >= low;
}
