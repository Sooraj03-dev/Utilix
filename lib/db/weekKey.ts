// Utilix — ISO week key, weekly reset and free-sessions-left logic (server-only)
// Owner: A
import "server-only";

import type { User } from "@/lib/types";

/**
 * Computes the ISO 8601 week key for a given date in UTC.
 * Format: "YYYY-Www", e.g., "2026-W44".
 * Monday is the first day of the week.
 * Week 1 is the week with the first Thursday of the year.
 */
export function isoWeekKey(date: Date = new Date()): string {
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  // ISO day: Mon=0, Tue=1, ..., Sun=6
  const dayNr = (target.getUTCDay() + 6) % 7;
  // Thursday of this week determines the ISO year
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const isoYear = target.getUTCFullYear();

  // First Thursday of the ISO year
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4DayNr = (jan4.getUTCDay() + 6) % 7;
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4 - jan4DayNr + 3));

  const diffMs = target.getTime() - firstThursday.getTime();
  const weekNumber = 1 + Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
  const weekStr = String(weekNumber).padStart(2, "0");

  return `${isoYear}-W${weekStr}`;
}

/**
 * Checks whether a user's weekly free session counter is stale.
 * If the current week differs from `user.free_sessions_week`, resets `free_sessions_used` to 0.
 *
 * @returns updated state and a boolean flag indicating if a reset occurred.
 */
export function evaluateWeeklySessions(
  user: Pick<User, "free_sessions_used" | "free_sessions_week">,
  date: Date = new Date()
): {
  free_sessions_used: number;
  free_sessions_week: string;
  isStale: boolean;
} {
  const currentWeek = isoWeekKey(date);
  if (user.free_sessions_week !== currentWeek) {
    return {
      free_sessions_used: 0,
      free_sessions_week: currentWeek,
      isStale: true,
    };
  }
  return {
    free_sessions_used: user.free_sessions_used,
    free_sessions_week: user.free_sessions_week,
    isStale: false,
  };
}

/**
 * Free sessions left this week for the policy's allowance.
 * Uses the ISO week reset: a stale week counter contributes 0 used sessions.
 * Never returns a negative number.
 */
export function freeSessionsLeft(
  user: Pick<User, "free_sessions_used" | "free_sessions_week">,
  policy: { free_sessions_per_week: number },
  date: Date = new Date()
): number {
  const evaluated = evaluateWeeklySessions(user, date);
  return Math.max(0, policy.free_sessions_per_week - evaluated.free_sessions_used);
}
