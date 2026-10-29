import type {
  ExcludedRequest,
  ExclusionCode,
  Policy,
  Slot,
  StudentRequest,
} from "./types.js";

export interface ConstraintCheckResult {
  valid: boolean;
  creditCharge: number;
  exclusion?: ExcludedRequest;
}

export function checkConstraints(
  request: StudentRequest,
  slot: Slot,
  policy: Policy
): ConstraintCheckResult {
  const { constraints } = request;

  // 1. Mandatory Training Check
  if (!constraints.trainingOk) {
    return {
      valid: false,
      creditCharge: 0,
      exclusion: {
        requestId: request.requestId,
        decision: "excluded",
        code: "TRAINING_MISSING",
        message: `Required safety training certification is missing or expired for ${slot.resourceName}.`,
        studentReason: `Your request was excluded because required safety training is missing for ${slot.resourceName}. Please complete the training module to unlock this equipment.`,
      },
    };
  }

  // 2. Booking Limit Check
  if (!constraints.withinBookingLimit) {
    return {
      valid: false,
      creditCharge: 0,
      exclusion: {
        requestId: request.requestId,
        decision: "excluded",
        code: "LIMIT_REACHED",
        message: `Active booking limit of ${policy.maxActiveBookings} slots reached.`,
        studentReason: `You have reached the maximum limit of ${policy.maxActiveBookings} active bookings. Please release or complete an upcoming reservation before booking again.`,
      },
    };
  }

  // 3. Resource Availability Check
  if (!constraints.resourceAvailable) {
    return {
      valid: false,
      creditCharge: 0,
      exclusion: {
        requestId: request.requestId,
        decision: "excluded",
        code: "RESOURCE_UNAVAILABLE",
        message: `${slot.resourceName} is currently unavailable due to maintenance or schedule restriction.`,
        studentReason: `${slot.resourceName} is currently unavailable for maintenance or reserved department sessions during this timeframe.`,
      },
    };
  }

  // 4. Overlap Check
  if (!constraints.noOverlap) {
    return {
      valid: false,
      creditCharge: 0,
      exclusion: {
        requestId: request.requestId,
        decision: "excluded",
        code: "OVERLAP",
        message: "You have a conflicting overlapping reservation during this time window.",
        studentReason: "This request conflicts with another confirmed booking on your schedule. Simultaneous reservations across equipment are not permitted.",
      },
    };
  }

  // 5. Cost & Credit Check
  let creditCharge = 0;
  if (slot.slotType === "free" && request.freeSessionsLeft > 0) {
    creditCharge = 0;
  } else {
    creditCharge = slot.creditCost > 0 ? slot.creditCost : policy.defaultCreditCost;
    if (request.creditsAvailable < creditCharge) {
      return {
        valid: false,
        creditCharge,
        exclusion: {
          requestId: request.requestId,
          decision: "excluded",
          code: "INSUFFICIENT_CREDITS",
          message: `Required ${creditCharge} credits, but you have ${request.creditsAvailable} available.`,
          studentReason: `Insufficient credits: this slot requires ${creditCharge} credits but you have ${request.creditsAvailable}. Consider choosing an off-peak free slot or wait for your monthly replenishment.`,
        },
      };
    }
  }

  return {
    valid: true,
    creditCharge,
  };
}
