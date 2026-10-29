// Utilix — unit tests for student pages foundations
// Owner: A
import { describe, it, expect } from "vitest";

import { freeSessionsLeft, isoWeekKey } from "@/lib/db/weekKey";
import {
  isDuplicatePendingRequest,
  DuplicateTrainingRequestError,
  trainingRequestInputSchema,
} from "@/lib/db/training-requests";
import {
  BOOKING_STATUS_LABELS,
  LEDGER_REASON_LABELS,
  getBookingStatusLabel,
  getLedgerReasonLabel,
} from "@/lib/types/labels";
import type { BookingStatus, CreditReason } from "@/lib/types";
import type { TrainingRequest } from "@/lib/types";

// ─── free sessions left (ISO week rollback aware) ───

describe("freeSessionsLeft", () => {
  // 2026-10-29 (Thu) and 2026-11-03 (Mon) are in different ISO weeks.
  const dates = {
    week44: new Date(Date.UTC(2026, 9, 29, 12, 0, 0)), // 2026-W44 (Thu)
    week45: new Date(Date.UTC(2026, 10, 2, 12, 0, 0)), // 2026-W45 (Mon)
  };

  it("subtracts used sessions from the weekly allowance", () => {
    const left = freeSessionsLeft(
      { free_sessions_used: 1, free_sessions_week: "2026-W44" },
      { free_sessions_per_week: 2 },
      dates.week44
    );
    expect(left).toBe(1);
  });

  it("returns the full allowance when the user has used none", () => {
    const left = freeSessionsLeft(
      { free_sessions_used: 0, free_sessions_week: "2026-W44" },
      { free_sessions_per_week: 2 },
      dates.week44
    );
    expect(left).toBe(2);
  });

  it("returns the full allowance when the week rolled over, ignoring stale usage", () => {
    const left = freeSessionsLeft(
      { free_sessions_used: 2, free_sessions_week: "2026-W43" }, // stale counter
      { free_sessions_per_week: 2 },
      dates.week44
    );
    expect(left).toBe(2);
  });

  it("handles the Sunday→Monday rollover boundary", () => {
    // Sunday 2026-11-01 is still in W44; Monday 2026-11-02 starts W45.
    const sunday = new Date(Date.UTC(2026, 10, 1, 12, 0, 0));
    const monday = new Date(Date.UTC(2026, 10, 2, 12, 0, 0));
    expect(isoWeekKey(sunday)).toBe("2026-W44");
    expect(isoWeekKey(monday)).toBe("2026-W45");

    // A counter stamped W44 (used up on Sunday) resets on Monday.
    const left = freeSessionsLeft(
      { free_sessions_used: 2, free_sessions_week: "2026-W44" },
      { free_sessions_per_week: 2 },
      monday
    );
    expect(left).toBe(2);
  });

  it("never returns a negative number when over-used", () => {
    const left = freeSessionsLeft(
      { free_sessions_used: 5, free_sessions_week: "2026-W44" },
      { free_sessions_per_week: 2 },
      dates.week44
    );
    expect(left).toBe(0);
  });
});

// ─── plain-language label maps ───

describe("label maps", () => {
  const bookingStatuses: BookingStatus[] = [
    "submitted",
    "eligibility_passed",
    "allocated",
    "waitlisted",
    "pending_approval",
    "confirmed",
    "checked_out",
    "returned",
    "cancelled",
    "rejected",
    "no_show",
  ];

  const creditReasons: CreditReason[] = [
    "monthly_grant",
    "booking_charge",
    "refund_early_cancel",
    "refund_coordinator_cancel",
    "forfeit_no_show",
    "adjustment",
  ];

  it("covers every booking status with a non-raw, human label", () => {
    for (const status of bookingStatuses) {
      const label = BOOKING_STATUS_LABELS[status];
      expect(label).toBeTruthy();
      expect(label).not.toBe(status);
    }
  });

  it("covers every credit reason with a plain-language sentence", () => {
    for (const reason of creditReasons) {
      const label = LEDGER_REASON_LABELS[reason];
      expect(label).toBeTruthy();
      expect(label).not.toBe(reason);
    }
  });

  it('maps forfeit_no_show to "Credits forfeited: no-show"', () => {
    expect(LEDGER_REASON_LABELS.forfeit_no_show).toBe("Credits forfeited: no-show");
  });

  it("getter helpers fall back to the raw value for unknown inputs", () => {
    expect(getBookingStatusLabel("mystery" as BookingStatus)).toBe("mystery");
    expect(getLedgerReasonLabel("unknown" as CreditReason)).toBe("unknown");
  });
});

// ─── training request duplicate rule ───

describe("training request duplicate rule", () => {
  const base: TrainingRequest = {
    id: "tr_1",
    user_id: "student-02",
    training_type: "3d-printer",
    status: "pending",
    created_at: "2026-10-28T14:20:00Z",
  };

  it("flags an existing pending request as duplicate", () => {
    expect(isDuplicatePendingRequest(base)).toBe(true);
  });

  it("does not flag a non-pending (e.g. declined) request", () => {
    const declined = { ...base, status: "declined" as const };
    expect(isDuplicatePendingRequest(declined)).toBe(false);
  });

  it("allows requests when nothing is pending", () => {
    expect(isDuplicatePendingRequest(null)).toBe(false);
  });

  it("validates the action input with zod", () => {
    expect(
      trainingRequestInputSchema.safeParse({ user_id: "u1", training_type: "dslr" })
        .success
    ).toBe(true);
    expect(
      trainingRequestInputSchema.safeParse({ user_id: "", training_type: "dslr" }).success
    ).toBe(false);
    expect(
      trainingRequestInputSchema.safeParse({ user_id: "u1", training_type: "" }).success
    ).toBe(false);
  });

  it("exposes a stable machine-readable error code", () => {
    const err = new DuplicateTrainingRequestError("3d-printer", "student-02");
    expect(err.code).toBe("DUPLICATE_TRAINING_REQUEST");
    expect(err.message).toContain("3d-printer");
  });
});
