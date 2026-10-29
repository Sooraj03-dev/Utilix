// Utilix — plain-language labels for student-facing pages
// Owner: A
// Status is never shown by colour alone: pair these labels with an icon.

import type { BookingStatus, CreditReason } from "./enums";

/** Raw enum value → friendly label. Status chips also show an icon. */
export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  submitted: "Request submitted",
  eligibility_passed: "Eligible — waiting for allocation",
  allocated: "Allocated to you",
  waitlisted: "On the waitlist",
  pending_approval: "Awaiting coordinator approval",
  confirmed: "Confirmed",
  checked_out: "Checked out",
  returned: "Completed & returned",
  cancelled: "Cancelled",
  rejected: "Not approved",
  no_show: "Missed (no-show)",
};

/** Ledger reason → plain-language sentence, e.g. forfeit_no_show. */
export const LEDGER_REASON_LABELS: Record<CreditReason, string> = {
  monthly_grant: "Monthly credit top-up",
  booking_charge: "Booked — credits used",
  refund_early_cancel: "Refund: cancelled in time",
  refund_coordinator_cancel: "Refund: session cancelled by coordinator",
  forfeit_no_show: "Credits forfeited: no-show",
  adjustment: "Balance adjustment",
};

export function getBookingStatusLabel(status: BookingStatus): string {
  return BOOKING_STATUS_LABELS[status] ?? status;
}

export function getLedgerReasonLabel(reason: CreditReason): string {
  return LEDGER_REASON_LABELS[reason] ?? reason;
}
