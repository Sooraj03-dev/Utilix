import { describe, expect, it } from "vitest";
import { findTopAlternatives } from "../alternatives.js";
import type { AlternativesRequest, CandidateSlot, Slot, StudentRequest } from "../types.js";

const mockRequest: StudentRequest = {
  requestId: "req-alt-user",
  requestedAt: "2026-10-29T10:00:00Z",
  sessionsLast30d: 2,
  sessionsThisMonth: 1,
  waitingHours: 10,
  deadlineDays: null,
  departmentsInTeam: 1,
  creditsAvailable: 5,
  freeSessionsLeft: 0,
  constraints: {
    trainingOk: true,
    withinBookingLimit: true,
    resourceAvailable: true,
    noOverlap: true,
  },
};

const targetSlot: Slot & { department?: string } = {
  id: "slot-target",
  resourceId: "printer-1",
  resourceName: "3D Printer",
  resourceType: "3d-printer",
  department: "Mechanical",
  startsAt: "2026-11-01T14:00:00Z",
  endsAt: "2026-11-01T16:00:00Z",
  slotType: "credit",
  creditCost: 3,
  capacity: 1,
  restricted: false,
};

const candidateSlots: CandidateSlot[] = [
  {
    slotId: "slot-late-free",
    resourceId: "printer-2",
    resourceName: "3D Printer Alt B",
    resourceType: "3d-printer",
    department: "Mechanical",
    startsAt: "2026-11-01T18:00:00Z",
    endsAt: "2026-11-01T20:00:00Z",
    slotType: "free",
    creditCost: 0,
  },
  {
    slotId: "slot-early-mech",
    resourceId: "printer-1",
    resourceName: "3D Printer",
    resourceType: "3d-printer",
    department: "Mechanical",
    startsAt: "2026-11-01T10:00:00Z",
    endsAt: "2026-11-01T12:00:00Z",
    slotType: "credit",
    creditCost: 2,
  },
  {
    slotId: "slot-early-elec",
    resourceId: "printer-3",
    resourceName: "3D Printer Alt C",
    resourceType: "3d-printer",
    department: "Electrical",
    startsAt: "2026-11-01T10:00:00Z",
    endsAt: "2026-11-01T12:00:00Z",
    slotType: "credit",
    creditCost: 2,
  },
  {
    slotId: "slot-unaffordable",
    resourceId: "printer-4",
    resourceName: "Laser Jet",
    resourceType: "3d-printer",
    department: "Mechanical",
    startsAt: "2026-11-01T08:00:00Z",
    endsAt: "2026-11-01T09:00:00Z",
    slotType: "credit",
    creditCost: 10, // user only has 5 credits
  },
];

describe("alternatives.ts", () => {
  it("ranks top 3 alternatives by start time, cost, and department, filtering out unaffordable ones", () => {
    const input: AlternativesRequest = {
      request: mockRequest,
      targetSlot,
      candidateSlots,
    };

    const res = findTopAlternatives(input);
    expect(res.requestId).toBe("req-alt-user");
    expect(res.alternatives.length).toBe(3);

    // slot-unaffordable should be excluded
    const slotIds = res.alternatives.map((a) => a.slot.slotId);
    expect(slotIds).not.toContain("slot-unaffordable");

    // slot-early-mech should rank #1 because it starts earliest (10:00) and is in same department ("Mechanical")
    expect(res.alternatives[0].slot.slotId).toBe("slot-early-mech");
    expect(res.alternatives[0].rank).toBe(1);
    expect(res.alternatives[0].reason).toContain("Mechanical");

    // slot-early-elec starts at 10:00 but different dept ("Electrical") -> rank 2
    expect(res.alternatives[1].slot.slotId).toBe("slot-early-elec");

    // slot-late-free starts later (18:00) -> rank 3
    expect(res.alternatives[2].slot.slotId).toBe("slot-late-free");
  });
});
