import { describe, it, expect } from "vitest";
import {
  toSlotId,
  slotIdsForRange,
  isPeakSlot,
} from "@/lib/db/slots";
import { isoWeekKey, evaluateWeeklySessions } from "@/lib/db/weekKey";
import {
  canTransition,
  assertTransition,
  InvalidTransitionError,
} from "@/lib/types/status";
import type { BookingStatus, Policy } from "@/lib/types";
import { DEFAULT_POLICY } from "@/lib/types/policy";

describe("Slot ID Generation", () => {
  it("formats slot ID as resourceId_YYYYMMDDTHHmm in UTC", () => {
    // 2026-10-30 09:15 UTC
    const d = new Date(Date.UTC(2026, 9, 30, 9, 15, 0));
    const slotId = toSlotId("res_printer1", d);
    expect(slotId).toBe("res_printer1_20261030T0915");
  });

  it("handles midnight and single-digit months/days properly", () => {
    const d = new Date(Date.UTC(2026, 0, 5, 0, 0, 0));
    const slotId = toSlotId("camera_a", d);
    expect(slotId).toBe("camera_a_20260105T0000");
  });

  it("generates sequential slot IDs for a given time range", () => {
    const start = new Date(Date.UTC(2026, 9, 30, 9, 0, 0));
    const end = new Date(Date.UTC(2026, 9, 30, 12, 0, 0));
    const slots = slotIdsForRange("studio_1", start, end, 60);

    expect(slots).toEqual([
      "studio_1_20261030T0900",
      "studio_1_20261030T1000",
      "studio_1_20261030T1100",
    ]);
  });

  it("supports non-60 minute slot lengths", () => {
    const start = new Date(Date.UTC(2026, 9, 30, 10, 0, 0));
    const end = new Date(Date.UTC(2026, 9, 30, 11, 0, 0));
    const slots = slotIdsForRange("scope_1", start, end, 30);

    expect(slots).toEqual([
      "scope_1_20261030T1000",
      "scope_1_20261030T1030",
    ]);
  });
});

describe("isoWeekKey & Weekly Session Reset", () => {
  it("computes the correct ISO week key for given dates", () => {
    // 2026-10-29 is a Thursday in Week 44 of 2026
    const d = new Date(Date.UTC(2026, 9, 29, 12, 0, 0));
    expect(isoWeekKey(d)).toBe("2026-W44");
  });

  it("handles ISO year boundaries correctly", () => {
    // 2026-01-01 is a Thursday -> Week 01 of 2026
    const d1 = new Date(Date.UTC(2026, 0, 1, 10, 0, 0));
    expect(isoWeekKey(d1)).toBe("2026-W01");

    // 2025-12-28 is a Sunday -> belongs to Week 52 of 2025
    const d2 = new Date(Date.UTC(2025, 11, 28, 10, 0, 0));
    expect(isoWeekKey(d2)).toBe("2025-W52");
  });

  it("detects when weekly sessions are stale and resets to 0", () => {
    const now = new Date(Date.UTC(2026, 9, 29)); // Week 44
    const userState = {
      free_sessions_used: 2,
      free_sessions_week: "2026-W43",
    };

    const evaluated = evaluateWeeklySessions(userState, now);
    expect(evaluated.isStale).toBe(true);
    expect(evaluated.free_sessions_used).toBe(0);
    expect(evaluated.free_sessions_week).toBe("2026-W44");
  });

  it("preserves weekly session count if within the same week", () => {
    const now = new Date(Date.UTC(2026, 9, 29)); // Week 44
    const userState = {
      free_sessions_used: 1,
      free_sessions_week: "2026-W44",
    };

    const evaluated = evaluateWeeklySessions(userState, now);
    expect(evaluated.isStale).toBe(false);
    expect(evaluated.free_sessions_used).toBe(1);
    expect(evaluated.free_sessions_week).toBe("2026-W44");
  });
});

describe("isPeakSlot", () => {
  const policyWithPeaks: Policy = {
    ...DEFAULT_POLICY,
    peak_definition: [
      { weekday: 1, start: "10:00", end: "14:00" }, // Monday
      { weekday: 3, start: "13:00", end: "17:00" }, // Wednesday
    ],
  };

  it("identifies peak slots within defined windows", () => {
    // Monday at 11:00 UTC
    // 2026-10-26 is a Monday
    const mondayPeak = new Date(Date.UTC(2026, 9, 26, 11, 0, 0));
    expect(isPeakSlot(mondayPeak, policyWithPeaks)).toBe(true);
  });

  it("identifies non-peak slots outside hours on a peak weekday", () => {
    // Monday at 09:00 UTC (before 10:00)
    const mondayOffPeak = new Date(Date.UTC(2026, 9, 26, 9, 0, 0));
    expect(isPeakSlot(mondayOffPeak, policyWithPeaks)).toBe(false);
  });

  it("identifies off-peak weekdays as non-peak", () => {
    // Tuesday (2026-10-27) at 11:00 UTC
    const tuesdaySlot = new Date(Date.UTC(2026, 9, 27, 11, 0, 0));
    expect(isPeakSlot(tuesdaySlot, policyWithPeaks)).toBe(false);
  });
});

describe("canTransition & assertTransition", () => {
  it("allows legal forward transitions", () => {
    expect(canTransition("submitted", "eligibility_passed")).toBe(true);
    expect(canTransition("submitted", "rejected")).toBe(true);
    expect(canTransition("eligibility_passed", "allocated")).toBe(true);
    expect(canTransition("eligibility_passed", "waitlisted")).toBe(true);
    expect(canTransition("allocated", "confirmed")).toBe(true);
    expect(canTransition("allocated", "pending_approval")).toBe(true);
    expect(canTransition("allocated", "cancelled")).toBe(true);
    expect(canTransition("waitlisted", "allocated")).toBe(true);
    expect(canTransition("waitlisted", "cancelled")).toBe(true);
    expect(canTransition("pending_approval", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "checked_out")).toBe(true);
    expect(canTransition("confirmed", "no_show")).toBe(true);
    expect(canTransition("checked_out", "returned")).toBe(true);
  });

  it("disallows illegal transitions", () => {
    expect(canTransition("submitted", "confirmed")).toBe(false);
    expect(canTransition("submitted", "checked_out")).toBe(false);
    expect(canTransition("returned", "allocated")).toBe(false);
    expect(canTransition("cancelled", "confirmed")).toBe(false);
    expect(canTransition("rejected", "allocated")).toBe(false);
  });

  it("assertTransition succeeds for valid and throws InvalidTransitionError for invalid", () => {
    expect(() => assertTransition("submitted", "eligibility_passed")).not.toThrow();

    expect(() => assertTransition("submitted", "returned" as BookingStatus)).toThrow(
      InvalidTransitionError
    );

    try {
      assertTransition("returned", "confirmed");
    } catch (err: unknown) {
      const e = err as InvalidTransitionError;
      expect(e.code).toBe("INVALID_TRANSITION");
      expect(e.from).toBe("returned");
      expect(e.to).toBe("confirmed");
    }
  });
});
