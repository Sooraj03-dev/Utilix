// Utilix — policy type and defaults
// Owner: A

import type { Policy, PolicyWeights, PeakDefinition } from "./entities";
import type { TiebreakMethod } from "./enums";

export type { Policy, PolicyWeights, PeakDefinition };

export const DEFAULT_WEIGHTS: PolicyWeights = {
  usage_fairness: 0.35,
  waiting_time: 0.25,
  declared_need: 0.20,
  interdisciplinary_bonus: 0.20,
};

export const DEFAULT_TIEBREAK_ORDER: TiebreakMethod[] = [
  "fewest_sessions_month",
  "earliest_request",
  "seeded_lottery",
];

export const DEFAULT_PEAK_DEFINITION: PeakDefinition[] = [];

/**
 * Sensible defaults used when no policy doc exists in Firestore.
 * getActivePolicy() in /lib/db/policy.ts falls back to this.
 */
export const DEFAULT_POLICY: Policy = {
  id: "v0",
  version: 0,
  is_active: true,
  monthly_credits: 10,
  free_sessions_per_week: 2,
  max_active_bookings: 3,
  slot_minutes: 60,
  cancel_refund_hours: 24,
  weights: DEFAULT_WEIGHTS,
  tiebreak_order: DEFAULT_TIEBREAK_ORDER,
  peak_definition: DEFAULT_PEAK_DEFINITION,
  deadline_window_days: 7,
  created_by: "system",
  created_at: new Date(0).toISOString(),
};

