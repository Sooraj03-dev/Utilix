// Utilix — pure coordinator helper functions (unit-testable)
// Owner: A

import type { Weekday } from "@/lib/types";

/**
 * Converts a YYYY-MM-DD date string to its UTC Weekday (0=Sunday to 6=Saturday).
 */
export function getDayOfWeekFromDate(dateStr: string): Weekday {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCDay() as Weekday;
}

/**
 * Checks whether two time intervals overlap (strictly within bounds).
 * Adjacent intervals (e.g. 09:00-12:00 and 12:00-14:00) do NOT overlap.
 */
export function windowsOverlap(
  a: { start: string; end: string },
  b: { start: string; end: string }
): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Checks whether two availability window specifications conflict in day and time.
 */
export function windowsConflict(
  a: { weekday: Weekday | null; date: string | null; start: string; end: string },
  b: { weekday: Weekday | null; date: string | null; start: string; end: string }
): boolean {
  // 1. Must overlap in time
  if (!windowsOverlap(a, b)) return false;

  // 2. Must match day
  if (a.date && b.date) {
    return a.date === b.date;
  }
  if (a.weekday !== null && a.weekday !== undefined && b.weekday !== null && b.weekday !== undefined) {
    return a.weekday === b.weekday;
  }
  if (a.date && b.weekday !== null && b.weekday !== undefined) {
    return getDayOfWeekFromDate(a.date) === b.weekday;
  }
  if (b.date && a.weekday !== null && a.weekday !== undefined) {
    return getDayOfWeekFromDate(b.date) === a.weekday;
  }
  return false;
}

/**
 * Checks whether a coordinator or admin has permission to manage a given resource.
 * - Admins can manage all resources.
 * - Coordinators can manage resources where coordinator_id === uid OR resource id is in assignedResourceIds.
 * - Students cannot manage resources.
 */
export function canCoordinatorManageResource(
  resource: { coordinator_id: string; id: string } | null | undefined,
  user: { uid: string; role: string; assignedResourceIds?: string[] } | null | undefined
): boolean {
  if (!resource || !user) return false;
  if (user.role === "admin") return true;
  if (user.role !== "coordinator") return false;

  return (
    resource.coordinator_id === user.uid ||
    (Array.isArray(user.assignedResourceIds) && user.assignedResourceIds.includes(resource.id))
  );
}

/**
 * Checks whether a certification already actively exists (idempotency check).
 * Returns true if cert exists and is not revoked.
 */
export function isAlreadyCertified(
  existingCert: { revoked_at?: string | null } | null | undefined
): boolean {
  if (!existingCert) return false;
  if (existingCert.revoked_at) return false;
  return true;
}

