import { describe, expect, it, vi } from "vitest";
import { allocateRequests } from "../allocate.js";
import { planBundle } from "../bundle.js";
import { explainRanking } from "../explain.js";
import * as llmModule from "../llm.js";
import { DEFAULT_POLICY } from "../policy.js";
import type { AllocateRequest, BundleRequest, Slot, StudentRequest } from "../types.js";

const printerSlot: Slot = {
  id: "slot-printer-scenarios", resourceId: "printer-3d-mk4", resourceName: "Prusa MK4 3D Printer",
  resourceType: "3d-printer", startsAt: "2026-11-05T10:00:00Z", endsAt: "2026-11-05T12:00:00Z",
  slotType: "free", creditCost: 0, capacity: 1, restricted: false,
};

const makeStudent = (id: string, overrides: Partial<StudentRequest> = {}): StudentRequest => ({
  requestId: id, requestedAt: "2026-10-29T10:00:00Z", sessionsLast30d: 0, sessionsThisMonth: 0,
  waitingHours: 1, deadlineDays: null, departmentsInTeam: 1, creditsAvailable: 10, freeSessionsLeft: 2,
  constraints: { trainingOk: true, withinBookingLimit: true, resourceAvailable: true, noOverlap: true },
  ...overrides,
});

describe("The 10 Required Hackathon Scenarios", () => {
  it("Scenario 1: Team B (0 sessions) beats Team A (4 sessions) for 3D printer slot", () => {
    const res = allocateRequests({
      slot: printerSlot, mode: "new_requests",
      requests: [makeStudent("req-team-A", { sessionsLast30d: 4, sessionsThisMonth: 4 }), makeStudent("req-team-B", { sessionsLast30d: 0, sessionsThisMonth: 0 })],
    });
    expect(res.ranking[0].requestId).toBe("req-team-B");
    expect(res.ranking[0].rank).toBe(1);
    expect(res.ranking[0].decision).toBe("allocated");
    expect(res.ranking[1].requestId).toBe("req-team-A");
    expect(res.ranking[1].decision).toBe("waitlisted");
  });

  it("Scenario 2: 0 credits, free slot, freeSessionsLeft > 0 -> allocated with credit charge 0", () => {
    const res = allocateRequests({
      slot: printerSlot, mode: "new_requests",
      requests: [makeStudent("req-student-free", { creditsAvailable: 0, freeSessionsLeft: 1 })],
    });
    expect(res.ranking.length).toBe(1);
    expect(res.ranking[0].decision).toBe("allocated");
    expect(res.ranking[0].creditCharge).toBe(0);
  });

  it("Scenario 3: 0 credits, peak credit slot -> excluded with INSUFFICIENT_CREDITS and off-peak suggestion", () => {
    const res = allocateRequests({
      slot: { ...printerSlot, slotType: "credit", creditCost: 3 }, mode: "new_requests",
      requests: [makeStudent("req-student-broke", { creditsAvailable: 0, freeSessionsLeft: 0 })],
    });
    expect(res.ranking.length).toBe(0);
    expect(res.excluded.length).toBe(1);
    expect(res.excluded[0].code).toBe("INSUFFICIENT_CREDITS");
    expect(res.excluded[0].studentReason).toContain("off-peak");
  });

  it("Scenario 4: trainingOk false -> excluded with TRAINING_MISSING before scoring", () => {
    const res = allocateRequests({
      slot: printerSlot, mode: "new_requests",
      requests: [makeStudent("req-student-untrained", { constraints: { trainingOk: false, withinBookingLimit: true, resourceAvailable: true, noOverlap: true } })],
    });
    expect(res.ranking.length).toBe(0);
    expect(res.excluded.length).toBe(1);
    expect(res.excluded[0].code).toBe("TRAINING_MISSING");
  });

  it("Scenario 5: withinBookingLimit false -> excluded with LIMIT_REACHED explaining limit", () => {
    const res = allocateRequests({
      slot: printerSlot, mode: "new_requests",
      requests: [makeStudent("req-student-capped", { constraints: { trainingOk: true, withinBookingLimit: false, resourceAvailable: true, noOverlap: true } })],
    });
    expect(res.ranking.length).toBe(0);
    expect(res.excluded.length).toBe(1);
    expect(res.excluded[0].code).toBe("LIMIT_REACHED");
    expect(res.excluded[0].studentReason).toContain(String(DEFAULT_POLICY.maxActiveBookings));
  });

  it("Scenario 6: mode promotion: slot freed, top waitlisted request allocated and others re-ranked", () => {
    const res = allocateRequests({
      slot: { ...printerSlot, capacity: 1 }, mode: "promotion",
      requests: [makeStudent("req-wait-1", { sessionsLast30d: 4, waitingHours: 10 }), makeStudent("req-wait-2", { sessionsLast30d: 0, waitingHours: 12 }), makeStudent("req-wait-3", { sessionsLast30d: 2, waitingHours: 11 })],
    });
    expect(res.ranking[0].requestId).toBe("req-wait-2");
    expect(res.ranking[0].decision).toBe("allocated");
    expect(res.ranking[1].requestId).toBe("req-wait-3");
    expect(res.ranking[1].waitlistPosition).toBe(1);
    expect(res.ranking[2].requestId).toBe("req-wait-1");
    expect(res.ranking[2].waitlistPosition).toBe(2);
  });

  it("Scenario 7: Bundle where DSLR has no window -> partial plan with DSLR unmet and alternatives", () => {
    const res = planBundle({
      teamId: "team-alpha", creditsAvailable: 15,
      wantedResources: [
        { resourceId: "printer-3d", resourceName: "3D Printer", resourceType: "3d-printer", candidateWindows: [{ slotId: "s1", startsAt: "2026-11-06T10:00:00Z", endsAt: "2026-11-06T12:00:00Z", creditCost: 0 }] },
        { resourceId: "arduino-kit", resourceName: "Arduino Kit", resourceType: "electronics", candidateWindows: [{ slotId: "s2", startsAt: "2026-11-06T10:00:00Z", endsAt: "2026-11-06T12:00:00Z", creditCost: 0 }] },
        { resourceId: "dslr-cam", resourceName: "DSLR Camera", resourceType: "camera", candidateWindows: [] },
        { resourceId: "studio-space", resourceName: "Audio Studio", resourceType: "studio", candidateWindows: [{ slotId: "s3", startsAt: "2026-11-06T10:00:00Z", endsAt: "2026-11-06T12:00:00Z", creditCost: 2 }] },
      ],
    });
    expect(res.plan.length).toBe(3);
    expect(res.unmet.length).toBe(1);
    expect(res.unmet[0].resourceId).toBe("dslr-cam");
  });

  it("Scenario 8: Identical scores -> tie-break used, seed returned, deterministic on second run", () => {
    const input: AllocateRequest = {
      slot: printerSlot, mode: "new_requests", seed: "fixed-hackathon-seed-88",
      requests: [
        makeStudent("req-tied-1", { sessionsLast30d: 1, sessionsThisMonth: 1, waitingHours: 10, requestedAt: "2026-10-29T10:00:00Z" }),
        makeStudent("req-tied-2", { sessionsLast30d: 1, sessionsThisMonth: 1, waitingHours: 10, requestedAt: "2026-10-29T10:00:00Z" }),
      ],
    };
    const r1 = allocateRequests(input);
    const r2 = allocateRequests(input);
    expect(r1.tieBreak.used).toBe(true);
    expect(r1.tieBreak.seed).toBe("fixed-hackathon-seed-88");
    expect(r1.ranking[0].requestId).toBe(r2.ranking[0].requestId);
  });

  it("Scenario 9: LLM failure -> source 'fallback' and identical rankings", async () => {
    const input: AllocateRequest = {
      slot: printerSlot, mode: "new_requests",
      requests: [makeStudent("req-1", { sessionsLast30d: 3 }), makeStudent("req-2", { sessionsLast30d: 0 })],
    };
    const baseAllocation = allocateRequests(input);
    vi.spyOn(llmModule, "callLLM").mockResolvedValueOnce({ success: false, errorCode: "TIMEOUT", provider: "gemini" });
    const explained = await explainRanking(baseAllocation.ranking, printerSlot.resourceName, baseAllocation.tieBreak, { provider: "gemini", apiKey: "test-key" });
    expect(explained.source).toBe("fallback");
    expect(explained.llm.attempted).toBe(true);
    expect(explained.ranking[0].requestId).toBe(baseAllocation.ranking[0].requestId);
  });

  it("Scenario 10: Deadline in 2 days beats no deadline when usage and waiting are equal", () => {
    const res = allocateRequests({
      slot: printerSlot, mode: "new_requests",
      requests: [makeStudent("req-no-deadline", { sessionsLast30d: 2, waitingHours: 5, deadlineDays: null }), makeStudent("req-urgent-deadline", { sessionsLast30d: 2, waitingHours: 5, deadlineDays: 2 })],
    });
    expect(res.ranking[0].requestId).toBe("req-urgent-deadline");
    expect(res.ranking[0].rank).toBe(1);
    expect(res.ranking[0].decision).toBe("allocated");
    expect(res.ranking[1].requestId).toBe("req-no-deadline");
  });
});
