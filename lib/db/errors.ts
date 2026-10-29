// Utilix — database error classes with stable error codes
// Owner: A

export class SlotTakenError extends Error {
  readonly code = "SLOT_TAKEN" as const;
  constructor(public readonly slotId: string) {
    super(`Slot "${slotId}" is already locked by another booking`);
    this.name = "SlotTakenError";
  }
}

export class InsufficientCreditsError extends Error {
  readonly code = "INSUFFICIENT_CREDITS" as const;
  constructor(
    public readonly userId: string,
    public readonly currentBalance: number,
    public readonly requiredDelta: number
  ) {
    super(
      `User "${userId}" has insufficient credits: balance is ${currentBalance}, attempted delta is ${requiredDelta}`
    );
    this.name = "InsufficientCreditsError";
  }
}

export { InvalidTransitionError } from "@/lib/types";
