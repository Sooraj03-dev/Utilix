import { describe, expect, it } from "vitest";
import { checkConstraints } from "../constraints.js";
import { DEFAULT_POLICY } from "../policy.js";
import type { Slot, StudentRequest } from "../types.js";

const baseSlot: Slot = {
  id: "slot-1",
  resourceId: "printer-3d-1",
  resourceName: "Prusa 3D Printer",
  resourceType: "3d-printer",
  startsAt: "2026-11-01T10:00:00Z",
  endsAt: "2026-11-01T12:00:00Z",
  slotType: "free",
  creditCost: 0,
  capacity: 1,
  restricted: false,
};

const baseRequest: StudentRequest = {
  requestId: "req-1",
  requestedAt: "2026-10-29T10:00:00Z",
  sessionsLast30d: 1,
  sessionsThisMonth: 1,
  waitingHours: 5,
  deadlineDays: 3,
  departmentsInTeam: 2,
  creditsAvailable: 5,
  freeSessionsLeft: 1,
  constraints: {
    trainingOk: true,
    withinBookingLimit: true,
    resourceAvailable: true,
    noOverlap: true,
  },
};

describe("constraints.ts", () => {
  it("allows valid requests and charges 0 for free slots with free sessions left", () => {
    const result = checkConstraints(baseRequest, baseSlot, DEFAULT_POLICY);
    expect(result.valid).toBe(true);
    expect(result.creditCharge).toBe(0);
    expect(result.exclusion).toBeUndefined();
  });

  it("excludes request when trainingOk is false (TRAINING_MISSING)", () => {
    const req = {
      ...baseRequest,
      constraints: { ...baseRequest.constraints, trainingOk: false },
    };
    const result = checkConstraints(req, baseSlot, DEFAULT_POLICY);
    expect(result.valid).toBe(false);
    expect(result.exclusion?.code).toBe("TRAINING_MISSING");
  });

  it("excludes request when withinBookingLimit is false (LIMIT_REACHED)", () => {
    const req = {
      ...baseRequest,
      constraints: { ...baseRequest.constraints, withinBookingLimit: false },
    };
    const result = checkConstraints(req, baseSlot, DEFAULT_POLICY);
    expect(result.valid).toBe(false);
    expect(result.exclusion?.code).toBe("LIMIT_REACHED");
  });

  it("excludes request when resourceAvailable is false (RESOURCE_UNAVAILABLE)", () => {
    const req = {
      ...baseRequest,
      constraints: { ...baseRequest.constraints, resourceAvailable: false },
    };
    const result = checkConstraints(req, baseSlot, DEFAULT_POLICY);
    expect(result.valid).toBe(false);
    expect(result.exclusion?.code).toBe("RESOURCE_UNAVAILABLE");
  });

  it("excludes request when noOverlap is false (OVERLAP)", () => {
    const req = {
      ...baseRequest,
      constraints: { ...baseRequest.constraints, noOverlap: false },
    };
    const result = checkConstraints(req, baseSlot, DEFAULT_POLICY);
    expect(result.valid).toBe(false);
    expect(result.exclusion?.code).toBe("OVERLAP");
  });

  it("charges credits when free sessions are exhausted or slot is credit type", () => {
    const creditSlot: Slot = {
      ...baseSlot,
      slotType: "credit",
      creditCost: 3,
    };
    const req = { ...baseRequest, creditsAvailable: 5, freeSessionsLeft: 0 };
    const result = checkConstraints(req, creditSlot, DEFAULT_POLICY);
    expect(result.valid).toBe(true);
    expect(result.creditCharge).toBe(3);
  });

  it("excludes request with INSUFFICIENT_CREDITS when credits are less than charge", () => {
    const creditSlot: Slot = {
      ...baseSlot,
      slotType: "credit",
      creditCost: 4,
    };
    const req = { ...baseRequest, creditsAvailable: 2, freeSessionsLeft: 0 };
    const result = checkConstraints(req, creditSlot, DEFAULT_POLICY);
    expect(result.valid).toBe(false);
    expect(result.exclusion?.code).toBe("INSUFFICIENT_CREDITS");
    expect(result.exclusion?.studentReason).toContain("off-peak");
  });
});
