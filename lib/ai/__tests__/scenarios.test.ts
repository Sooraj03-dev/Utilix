import { describe, expect, it, vi } from "vitest";
import { allocateRequests } from "../allocate.js";
import { planBundle } from "../bundle.js";
import { checkConstraints } from "../constraints.js";
import { explainRanking } from "../explain.js";
import * as llmModule from "../llm.js";
import { DEFAULT_POLICY } from "../policy.js";
import type { AllocateRequest, BundleRequest, Slot, StudentRequest } from "../types.js";

const printerSlot: Slot = {
  id: "slot-printer-scenarios",
  resourceId: "printer-3d-mk4",
  resourceName: "Prusa MK4 3D Printer",
  resourceType: "3d-printer",
  startsAt: "2026-11-05T10:00:00Z",
  endsAt: "2026-11-05T12:00:00Z",
  slotType: "free",
  creditCost: 0,
  capacity: 1,
  restricted: false,
};

const makeStudent = (
  id: string,
  overrides: Partial<StudentRequest> = {}
): StudentRequest => ({
  requestId: id,
  requestedAt: "2026-10-29T10:00:00Z",
  sessionsLast30d: 0,
  sessionsThisMonth: 0,
  waitingHours: 1,
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
  ...overrides,
});

describe("The 10 Required Hackathon Scenarios", () => {
  // Scenario 1: Two teams, same 3D printer slot; A has 4 sessions this month, B has 0. Expect B rank 1.
  it("Scenario 1: Team B (0 sessions) beats Team A (4 sessions) for 3D printer slot", () => {
    const input: AllocateRequest = {
      slot: printerSlot,
      mode: "new_requests",
      requests: [
        makeStudent("req-team-A", { sessionsLast30d: 4, sessionsThisMonth: 4 }),
        makeStudent("req-team-B", { sessionsLast30d: 0, sessionsThisMonth: 0 }),
      ],
    };

    const res = allocateRequests(input);
    expect(res.ranking[0].requestId).toBe("req-team-B");
    expect(res.ranking[0].rank).toBe(1);
    expect(res.ranking[0].decision).toBe("allocated");

    expect(res.ranking[1].requestId).toBe("req-team-A");
    expect(res.ranking[1].rank).toBe(2);
    expect(res.ranking[1].decision).toBe("waitlisted");
  });

  // Scenario 2: 0 credits, free off-peak slot, freeSessionsLeft above 0. Expect allocated with charge 0.
  it("Scenario 2: 0 credits, free slot, freeSessionsLeft > 0 -> allocated with credit charge 0", () => {
    const input: AllocateRequest = {
      slot: printerSlot,
      mode: "new_requests",
      requests: [
        makeStudent("req-student-free", { creditsAvailable: 0, freeSessionsLeft: 1 }),
      ],
    };

    const res = allocateRequests(input);
    expect(res.ranking.length).toBe(1);
    expect(res.ranking[0].decision).toBe("allocated");
    expect(res.ranking[0].creditCharge).toBe(0);
  });

  // Scenario 3: 0 credits, peak credit slot. Expect excluded INSUFFICIENT_CREDITS with an off-peak suggestion.
  it("Scenario 3: 0 credits, peak credit slot -> excluded with INSUFFICIENT_CREDITS and off-peak suggestion", () => {
    const peakCreditSlot: Slot = {
      ...printerSlot,
      slotType: "credit",
      creditCost: 3,
    };

    const input: AllocateRequest = {
      slot: peakCreditSlot,
      mode: "new_requests",
      requests: [
        makeStudent("req-student-broke", { creditsAvailable: 0, freeSessionsLeft: 0 }),
      ],
    };

    const res = allocateRequests(input);
    expect(res.ranking.length).toBe(0);
    expect(res.excluded.length).toBe(1);
    expect(res.excluded[0].code).toBe("INSUFFICIENT_CREDITS");
    expect(res.excluded[0].studentReason).toContain("off-peak");
  });

  // Scenario 4: trainingOk false on the 3D printer. Expect excluded TRAINING_MISSING before scoring.
  it("Scenario 4: trainingOk false -> excluded with TRAINING_MISSING before scoring", () => {
    const input: AllocateRequest = {
      slot: printerSlot,
      mode: "new_requests",
      requests: [
        makeStudent("req-student-untrained", {
          constraints: {
            trainingOk: false,
            withinBookingLimit: true,
            resourceAvailable: true,
            noOverlap: true,
          },
        }),
      ],
    };

    const res = allocateRequests(input);
    expect(res.ranking.length).toBe(0);
    expect(res.excluded.length).toBe(1);
    expect(res.excluded[0].code).toBe("TRAINING_MISSING");
    expect(res.excluded[0].message).toContain("safety training");
  });

  // Scenario 5: withinBookingLimit false. Expect excluded LIMIT_REACHED explaining the limit.
  it("Scenario 5: withinBookingLimit false -> excluded with LIMIT_REACHED explaining limit", () => {
    const input: AllocateRequest = {
      slot: printerSlot,
      mode: "new_requests",
      requests: [
        makeStudent("req-student-capped", {
          constraints: {
            trainingOk: true,
            withinBookingLimit: false,
            resourceAvailable: true,
            noOverlap: true,
          },
        }),
      ],
    };

    const res = allocateRequests(input);
    expect(res.ranking.length).toBe(0);
    expect(res.excluded.length).toBe(1);
    expect(res.excluded[0].code).toBe("LIMIT_REACHED");
    expect(res.excluded[0].studentReason).toContain(
      String(DEFAULT_POLICY.maxActiveBookings)
    );
  });

  // Scenario 6: mode promotion: slot freed, 3 valid waitlisted requests. Expect the top-ranked one allocated and the others re-ranked.
  it("Scenario 6: mode promotion: slot freed, top waitlisted request allocated and others re-ranked", () => {
    const input: AllocateRequest = {
      slot: { ...printerSlot, capacity: 1 },
      mode: "promotion",
      requests: [
        makeStudent("req-wait-1", { sessionsLast30d: 4, waitingHours: 10 }),
        makeStudent("req-wait-2", { sessionsLast30d: 0, waitingHours: 12 }),
        makeStudent("req-wait-3", { sessionsLast30d: 2, waitingHours: 11 }),
      ],
    };

    const res = allocateRequests(input);
    expect(res.ranking.length).toBe(3);
    expect(res.ranking[0].requestId).toBe("req-wait-2");
    expect(res.ranking[0].decision).toBe("allocated");
    expect(res.ranking[0].waitlistPosition).toBeNull();

    expect(res.ranking[1].requestId).toBe("req-wait-3");
    expect(res.ranking[1].decision).toBe("waitlisted");
    expect(res.ranking[1].waitlistPosition).toBe(1);

    expect(res.ranking[2].requestId).toBe("req-wait-1");
    expect(res.ranking[2].decision).toBe("waitlisted");
    expect(res.ranking[2].waitlistPosition).toBe(2);
  });

  // Scenario 7: Bundle of printer, Arduino kit, DSLR, studio where the DSLR has no window. Expect a partial plan with the DSLR unmet and alternatives.
  it("Scenario 7: Bundle where DSLR has no window -> partial plan with DSLR unmet and alternatives", () => {
    const input: BundleRequest = {
      teamId: "team-alpha",
      creditsAvailable: 15,
      wantedResources: [
        {
          resourceId: "printer-3d",
          resourceName: "3D Printer",
          resourceType: "3d-printer",
          candidateWindows: [
            {
              slotId: "slot-pr-1",
              startsAt: "2026-11-06T10:00:00Z",
              endsAt: "2026-11-06T12:00:00Z",
              creditCost: 0,
            },
          ],
        },
        {
          resourceId: "arduino-kit",
          resourceName: "Arduino Kit",
          resourceType: "electronics",
          candidateWindows: [
            {
              slotId: "slot-ar-1",
              startsAt: "2026-11-06T10:00:00Z",
              endsAt: "2026-11-06T12:00:00Z",
              creditCost: 0,
            },
          ],
        },
        {
          resourceId: "dslr-cam",
          resourceName: "DSLR Camera",
          resourceType: "camera",
          candidateWindows: [], // No window
        },
        {
          resourceId: "studio-space",
          resourceName: "Audio Studio",
          resourceType: "studio",
          candidateWindows: [
            {
              slotId: "slot-st-1",
              startsAt: "2026-11-06T10:00:00Z",
              endsAt: "2026-11-06T12:00:00Z",
              creditCost: 2,
            },
          ],
        },
      ],
    };

    const res = planBundle(input);
    expect(res.plan.length).toBe(3);
    const plannedIds = res.plan.map((p) => p.resourceId);
    expect(plannedIds).toContain("printer-3d");
    expect(plannedIds).toContain("arduino-kit");
    expect(plannedIds).toContain("studio-space");

    expect(res.unmet.length).toBe(1);
    expect(res.unmet[0].resourceId).toBe("dslr-cam");
    expect(res.unmet[0].reason).toContain("No available slots");
  });

  // Scenario 8: Two requests with identical scores. Expect tie-break used, seed returned, same result on a second run.
  it("Scenario 8: Identical scores -> tie-break used, seed returned, deterministic on second run", () => {
    const input: AllocateRequest = {
      slot: printerSlot,
      mode: "new_requests",
      seed: "fixed-hackathon-seed-88",
      requests: [
        makeStudent("req-tied-1", {
          sessionsLast30d: 1,
          sessionsThisMonth: 1,
          waitingHours: 10,
          requestedAt: "2026-10-29T10:00:00Z",
        }),
        makeStudent("req-tied-2", {
          sessionsLast30d: 1,
          sessionsThisMonth: 1,
          waitingHours: 10,
          requestedAt: "2026-10-29T10:00:00Z",
        }),
      ],
    };

    const run1 = allocateRequests(input);
    const run2 = allocateRequests(input);

    expect(run1.tieBreak.used).toBe(true);
    expect(run1.tieBreak.seed).toBe("fixed-hackathon-seed-88");
    expect(run1.ranking[0].requestId).toBe(run2.ranking[0].requestId);
    expect(run1.ranking[1].requestId).toBe(run2.ranking[1].requestId);
  });

  // Scenario 9: LLM failure (no key, mocked timeout, mocked invalid JSON). Expect source "fallback" and an identical ranking to the AI run.
  it("Scenario 9: LLM failure -> source 'fallback' and identical rankings", async () => {
    const input: AllocateRequest = {
      slot: printerSlot,
      mode: "new_requests",
      requests: [
        makeStudent("req-1", { sessionsLast30d: 3 }),
        makeStudent("req-2", { sessionsLast30d: 0 }),
      ],
    };

    const baseAllocation = allocateRequests(input);

    // Mock timeout or invalid JSON
    vi.spyOn(llmModule, "callLLM").mockResolvedValueOnce({
      success: false,
      errorCode: "TIMEOUT",
      provider: "gemini",
    });

    const explained = await explainRanking(
      baseAllocation.ranking,
      printerSlot.resourceName,
      baseAllocation.tieBreak,
      { provider: "gemini", apiKey: "test-key" }
    );

    expect(explained.source).toBe("fallback");
    expect(explained.llm.attempted).toBe(true);
    expect(explained.llm.succeeded).toBe(false);
    expect(explained.ranking[0].requestId).toBe(baseAllocation.ranking[0].requestId);
    expect(explained.ranking[1].requestId).toBe(baseAllocation.ranking[1].requestId);
  });

  // Scenario 10: Deadline in 2 days vs no deadline, equal usage and waiting. Expect the deadline request ranks higher.
  it("Scenario 10: Deadline in 2 days beats no deadline when usage and waiting are equal", () => {
    const input: AllocateRequest = {
      slot: printerSlot,
      mode: "new_requests",
      requests: [
        makeStudent("req-no-deadline", {
          sessionsLast30d: 2,
          waitingHours: 5,
          deadlineDays: null,
        }),
        makeStudent("req-urgent-deadline", {
          sessionsLast30d: 2,
          waitingHours: 5,
          deadlineDays: 2, // 2 days is within 7-day need window
        }),
      ],
    };

    const res = allocateRequests(input);
    expect(res.ranking[0].requestId).toBe("req-urgent-deadline");
    expect(res.ranking[0].rank).toBe(1);
    expect(res.ranking[0].decision).toBe("allocated");

    expect(res.ranking[1].requestId).toBe("req-no-deadline");
    expect(res.ranking[1].rank).toBe(2);
    expect(res.ranking[1].decision).toBe("waitlisted");
  });
});
