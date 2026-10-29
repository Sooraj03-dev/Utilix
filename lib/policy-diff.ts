// Utilix — policy diff & weights normalization pure helpers
// Owner: A

import type { Policy, PolicyWeights, PeakDefinition, TiebreakMethod } from "@/lib/types";

export type PolicyInputData = Omit<
  Policy,
  "id" | "version" | "is_active" | "created_by" | "created_at"
>;

/**
 * Normalizes priority weights so that the returned shares strictly sum to 100.
 */
export function normalizeWeights(weights: PolicyWeights): Record<keyof PolicyWeights, number> {
  const toRaw = (v: number) => (v <= 1.0 && v > 0 ? v * 100 : Math.max(0, v));

  const uf = toRaw(weights.usage_fairness);
  const wt = toRaw(weights.waiting_time);
  const dn = toRaw(weights.declared_need);
  const ib = toRaw(weights.interdisciplinary_bonus);

  const total = uf + wt + dn + ib;
  if (total <= 0) {
    return {
      usage_fairness: 25,
      waiting_time: 25,
      declared_need: 25,
      interdisciplinary_bonus: 25,
    };
  }

  const pUf = Math.round((uf / total) * 100);
  const pWt = Math.round((wt / total) * 100);
  const pDn = Math.round((dn / total) * 100);
  // Remainder ensures exact 100 sum without floating point drift
  const pIb = 100 - (pUf + pWt + pDn);

  return {
    usage_fairness: pUf,
    waiting_time: pWt,
    declared_need: pDn,
    interdisciplinary_bonus: pIb,
  };
}

/**
 * Formats weights for human-readable display.
 */
function formatWeight(w: number): string {
  if (w <= 1.0 && w > 0) {
    return `${Math.round(w * 100)}`;
  }
  return `${w}`;
}

/**
 * Compares two policy configurations and generates plain-language diff strings.
 */
export function diffPolicies(
  prev: Partial<Policy>,
  next: Partial<Policy>
): string[] {
  const diffs: string[] = [];

  if (prev.monthly_credits !== undefined && next.monthly_credits !== undefined && prev.monthly_credits !== next.monthly_credits) {
    diffs.push(`monthly credits ${prev.monthly_credits} to ${next.monthly_credits}`);
  }

  if (prev.free_sessions_per_week !== undefined && next.free_sessions_per_week !== undefined && prev.free_sessions_per_week !== next.free_sessions_per_week) {
    diffs.push(`free sessions per week ${prev.free_sessions_per_week} to ${next.free_sessions_per_week}`);
  }

  if (prev.max_active_bookings !== undefined && next.max_active_bookings !== undefined && prev.max_active_bookings !== next.max_active_bookings) {
    diffs.push(`max active bookings ${prev.max_active_bookings} to ${next.max_active_bookings}`);
  }

  if (prev.slot_minutes !== undefined && next.slot_minutes !== undefined && prev.slot_minutes !== next.slot_minutes) {
    diffs.push(`slot duration ${prev.slot_minutes}m to ${next.slot_minutes}m`);
  }

  if (prev.cancel_refund_hours !== undefined && next.cancel_refund_hours !== undefined && prev.cancel_refund_hours !== next.cancel_refund_hours) {
    diffs.push(`cancellation refund window ${prev.cancel_refund_hours}h to ${next.cancel_refund_hours}h`);
  }

  if (prev.deadline_window_days !== undefined && next.deadline_window_days !== undefined && prev.deadline_window_days !== next.deadline_window_days) {
    diffs.push(`deadline window ${prev.deadline_window_days}d to ${next.deadline_window_days}d`);
  }

  // Weights comparisons
  if (prev.weights && next.weights) {
    if (prev.weights.usage_fairness !== next.weights.usage_fairness) {
      diffs.push(`usage fairness weight ${formatWeight(prev.weights.usage_fairness)} to ${formatWeight(next.weights.usage_fairness)}`);
    }
    if (prev.weights.waiting_time !== next.weights.waiting_time) {
      diffs.push(`waiting time weight ${formatWeight(prev.weights.waiting_time)} to ${formatWeight(next.weights.waiting_time)}`);
    }
    if (prev.weights.declared_need !== next.weights.declared_need) {
      diffs.push(`declared need weight ${formatWeight(prev.weights.declared_need)} to ${formatWeight(next.weights.declared_need)}`);
    }
    if (prev.weights.interdisciplinary_bonus !== next.weights.interdisciplinary_bonus) {
      diffs.push(`interdisciplinary bonus weight ${formatWeight(prev.weights.interdisciplinary_bonus)} to ${formatWeight(next.weights.interdisciplinary_bonus)}`);
    }
  }

  // Tiebreak order
  if (prev.tiebreak_order && next.tiebreak_order) {
    if (JSON.stringify(prev.tiebreak_order) !== JSON.stringify(next.tiebreak_order)) {
      diffs.push(`tie-breaker order reordered`);
    }
  }

  // Peak slots
  if (prev.peak_definition && next.peak_definition) {
    if (JSON.stringify(prev.peak_definition) !== JSON.stringify(next.peak_definition)) {
      diffs.push(`peak slot definitions updated (${prev.peak_definition.length} to ${next.peak_definition.length} slots)`);
    }
  }

  return diffs;
}

/**
 * Checks if two policies have identical configurations (no changes).
 */
export function isPolicyEqual(prev: Partial<Policy>, next: Partial<Policy>): boolean {
  return diffPolicies(prev, next).length === 0;
}

export interface PolicyVersionRecord {
  version: number;
  is_active: boolean;
  data: PolicyInputData;
  created_by: string;
}

/**
 * Pure state machine transition for creating a new policy version.
 * Deactivates all existing active versions, increments version, and activates new one.
 */
export function applyPolicyVersionTransition(
  existingVersions: PolicyVersionRecord[],
  newInput: PolicyInputData,
  actorId: string
): { updatedVersions: PolicyVersionRecord[]; createdVersion: PolicyVersionRecord } {
  let maxVersion = 0;
  for (const v of existingVersions) {
    if (v.version > maxVersion) maxVersion = v.version;
  }
  const newVersionNumber = maxVersion + 1;

  // Deactivate all previous versions
  const updatedVersions = existingVersions.map((v) => ({
    ...v,
    is_active: false,
  }));

  const createdVersion: PolicyVersionRecord = {
    version: newVersionNumber,
    is_active: true,
    data: newInput,
    created_by: actorId,
  };

  updatedVersions.push(createdVersion);

  return { updatedVersions, createdVersion };
}

/**
 * Pure state machine transition for restoring an older version as a brand new version.
 */
export function applyPolicyRestoreTransition(
  existingVersions: PolicyVersionRecord[],
  targetVersion: number,
  actorId: string
): { updatedVersions: PolicyVersionRecord[]; createdVersion: PolicyVersionRecord } {
  const target = existingVersions.find((v) => v.version === targetVersion);
  if (!target) {
    throw new Error(`Target policy version v${targetVersion} not found`);
  }

  return applyPolicyVersionTransition(existingVersions, target.data, actorId);
}
