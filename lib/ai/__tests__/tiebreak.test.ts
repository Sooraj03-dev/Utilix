import { describe, expect, it } from "vitest";
import { DEFAULT_POLICY } from "../policy.js";
import { type ScoredCandidate, sortAndResolveTies } from "../tiebreak.js";
import type { StudentRequest } from "../types.js";

const makeCandidate = (
  id: string,
  score: number,
  sessionsThisMonth: number,
  requestedAt: string
): ScoredCandidate => ({
  request: {
    requestId: id,
    requestedAt,
    sessionsLast30d: sessionsThisMonth,
    sessionsThisMonth,
    waitingHours: 10,
    deadlineDays: null,
    departmentsInTeam: 1,
    creditsAvailable: 10,
    freeSessionsLeft: 2,
    constraints: {
      trainingOk: true,
      withinBookingLimit: true,
      resourceAvailable: true,
      noOverlap: true,
    },
  },
  score,
  creditCharge: 0,
});

describe("tiebreak.ts", () => {
  it("resolves tie using fewestSessionsThisMonth", () => {
    const c1 = makeCandidate("req-A", 0.75, 3, "2026-10-29T10:00:00Z");
    const c2 = makeCandidate("req-B", 0.75, 1, "2026-10-29T11:00:00Z");

    const result = sortAndResolveTies([c1, c2], DEFAULT_POLICY, "seed-1");
    expect(result.tieBreakInfo.used).toBe(true);
    expect(result.tieBreakInfo.decidedBy).toBe("fewestSessionsThisMonth");
    expect(result.sorted[0].request.requestId).toBe("req-B");
  });

  it("resolves tie using earliestRequest when sessionsThisMonth are equal", () => {
    const c1 = makeCandidate("req-A", 0.75, 2, "2026-10-29T12:00:00Z");
    const c2 = makeCandidate("req-B", 0.75, 2, "2026-10-29T09:00:00Z");

    const result = sortAndResolveTies([c1, c2], DEFAULT_POLICY, "seed-1");
    expect(result.tieBreakInfo.used).toBe(true);
    expect(result.tieBreakInfo.decidedBy).toBe("earliestRequest");
    expect(result.sorted[0].request.requestId).toBe("req-B");
  });

  it("is strictly deterministic: identical input and seed yield identical result", () => {
    const c1 = makeCandidate("req-A", 0.80, 2, "2026-10-29T10:00:00Z");
    const c2 = makeCandidate("req-B", 0.80, 2, "2026-10-29T10:00:00Z");

    const run1 = sortAndResolveTies([c1, c2], DEFAULT_POLICY, "fixed-seed-42");
    const run2 = sortAndResolveTies([c1, c2], DEFAULT_POLICY, "fixed-seed-42");

    expect(run1.sorted[0].request.requestId).toBe(run2.sorted[0].request.requestId);
    expect(run1.tieBreakInfo.decidedBy).toBe("seededLottery");
    expect(run1.tieBreakInfo.seed).toBe("fixed-seed-42");
  });
});
