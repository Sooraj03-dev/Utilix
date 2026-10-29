import { describe, expect, it } from "vitest";
import { computeCounterfactual } from "../counterfactual.js";
import { DEFAULT_POLICY } from "../policy.js";
import type { StudentRequest } from "../types.js";

const makeRequest = (sessions: number, waitHours: number): StudentRequest => ({
  requestId: "req-test",
  requestedAt: "2026-10-29T10:00:00Z",
  sessionsLast30d: sessions,
  sessionsThisMonth: sessions,
  waitingHours: waitHours,
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
});

describe("counterfactual.ts", () => {
  it("suggests fewer sessions in last 30 days when user has prior sessions", () => {
    const req = makeRequest(5, 10);
    const targetScore = 0.40;
    const advice = computeCounterfactual(req, targetScore, DEFAULT_POLICY, 1);
    expect(advice).not.toBeNull();
    expect(advice).toContain("fewer session");
    expect(advice).toContain("ranked first");
  });

  it("suggests waiting more hours when sessions cannot bridge the gap", () => {
    // 0 sessions already (max usage score), but low wait hours
    const req = makeRequest(0, 5);
    const targetScore = 0.55;
    const advice = computeCounterfactual(req, targetScore, DEFAULT_POLICY, 1);
    expect(advice).not.toBeNull();
    expect(advice).toContain("Waiting");
    expect(advice).toContain("more hour");
  });

  it("returns null if gap is already zero or negative", () => {
    const req = makeRequest(0, 50);
    const targetScore = 0.30;
    const advice = computeCounterfactual(req, targetScore, DEFAULT_POLICY, 1);
    expect(advice).toBeNull();
  });
});
