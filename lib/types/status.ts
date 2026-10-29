// Utilix — booking status transition logic
// Owner: A

import type { BookingStatus } from "./enums";

/** Legal status transitions as an adjacency list. */
export const STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  submitted: ["eligibility_passed", "rejected"],
  eligibility_passed: ["allocated", "waitlisted", "rejected"],
  allocated: ["pending_approval", "confirmed", "cancelled"],
  waitlisted: ["allocated", "cancelled"],
  pending_approval: ["confirmed", "rejected", "cancelled"],
  confirmed: ["checked_out", "cancelled", "no_show"],
  checked_out: ["returned"],
  // Terminal states
  returned: [],
  cancelled: [],
  rejected: [],
  no_show: [],
};

/** Returns true if transitioning from `from` to `to` is allowed. */
export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Throws InvalidTransitionError if the transition is not allowed. */
export function assertTransition(
  from: BookingStatus,
  to: BookingStatus
): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}

/** Thrown when a booking status transition is illegal. */
export class InvalidTransitionError extends Error {
  readonly code = "INVALID_TRANSITION" as const;
  constructor(
    public readonly from: BookingStatus,
    public readonly to: BookingStatus
  ) {
    super(`Cannot transition booking from "${from}" to "${to}"`);
    this.name = "InvalidTransitionError";
  }
}

