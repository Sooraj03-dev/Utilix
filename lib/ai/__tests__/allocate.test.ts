import { describe, expect, it } from "vitest";
import { allocateRequests } from "../allocate.js";
import type { AllocateRequest, Slot, StudentRequest } from "../types.js";

const makeRequest = (
  id: string,
  sessions30d: number,
  waitHours: number,
  trainingOk = true
): StudentRequest => ({
  requestId: id,
  requestedAt: "2026-10-29T10:00:00Z",
  sessionsLast30d: sessions30d,
  sessionsThisMonth: sessions30d,
  waitingHours: waitHours,
  deadlineDays: null,
  departmentsInTeam: 1,
  creditsAvailable: 10,
  freeSessionsLeft: 2,
  constraints: {
    trainingOk,
    withinBookingLimit: true,
    resourceAvailable: true,
    noOverlap: true,
  },
});

const testSlot: Slot = {
  id: "slot-studio-1",
  resourceId: "studio-rec-1",
  resourceName: "Recording Studio",
  resourceType: "studio",
  startsAt: "2026-11-01T14:00:00Z",
  endsAt: "2026-11-01T16:00:00Z",
  slotType: "free",
  creditCost: 0,
  capacity: 1,
  restricted: true,
};

describe("allocate.ts", () => {
  it("allocates single top request when capacity is 1 and requires approval if restricted", () => {
    const input: AllocateRequest = {
      slot: testSlot,
      mode: "new_requests",
      requests: [
        makeRequest("req-1", 5, 2),
        makeRequest("req-2", 0, 10),
      ],
    };

    const res = allocateRequests(input);
    expect(res.ranking.length).toBe(2);
    expect(res.ranking[0].requestId).toBe("req-2");
    expect(res.ranking[0].decision).toBe("allocated");
    expect(res.ranking[0].requiresCoordinatorApproval).toBe(true);
    expect(res.ranking[0].waitlistPosition).toBeNull();

    expect(res.ranking[1].requestId).toBe("req-1");
    expect(res.ranking[1].decision).toBe("waitlisted");
    expect(res.ranking[1].waitlistPosition).toBe(1);
  });

  it("allocates multiple requests when capacity > 1", () => {
    const multiSlot: Slot = { ...testSlot, capacity: 2, restricted: false };
    const input: AllocateRequest = {
      slot: multiSlot,
      mode: "new_requests",
      requests: [
        makeRequest("req-1", 0, 10),
        makeRequest("req-2", 1, 8),
        makeRequest("req-3", 4, 1),
      ],
    };

    const res = allocateRequests(input);
    expect(res.ranking[0].decision).toBe("allocated");
    expect(res.ranking[1].decision).toBe("allocated");
    expect(res.ranking[2].decision).toBe("waitlisted");
    expect(res.ranking[2].waitlistPosition).toBe(1);
  });

  it("handles mode 'promotion' cleanly when a slot is freed", () => {
    const input: AllocateRequest = {
      slot: { ...testSlot, capacity: 1 },
      mode: "promotion",
      requests: [
        makeRequest("req-wait-1", 2, 20),
        makeRequest("req-wait-2", 0, 15),
      ],
    };

    const res = allocateRequests(input);
    expect(res.ranking[0].requestId).toBe("req-wait-2");
    expect(res.ranking[0].decision).toBe("allocated");
    expect(res.ranking[1].decision).toBe("waitlisted");
    expect(res.ranking[1].waitlistPosition).toBe(1);
  });

  it("filters out invalid requests before scoring into excluded array", () => {
    const input: AllocateRequest = {
      slot: testSlot,
      mode: "new_requests",
      requests: [
        makeRequest("req-valid", 1, 5, true),
        makeRequest("req-invalid", 0, 10, false), // training missing
      ],
    };

    const res = allocateRequests(input);
    expect(res.ranking.length).toBe(1);
    expect(res.ranking[0].requestId).toBe("req-valid");
    expect(res.excluded.length).toBe(1);
    expect(res.excluded[0].requestId).toBe("req-invalid");
    expect(res.excluded[0].code).toBe("TRAINING_MISSING");
  });
});
