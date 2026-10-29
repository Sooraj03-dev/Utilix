/**
 * Utilix — Core KPI & Fairness Telemetry Engine (Pure Functions)
 * Owner: A
 *
 * FAIRNESS METRIC DEFINITION:
 * ───────────────────────────
 * Let S = {s_1, s_2, ..., s_n} be the number of confirmed/completed sessions
 * allocated to each student in the campus registry over the evaluation window
 * (last 30 days), INCLUDING students who held zero (0) sessions.
 *
 * 1. The discrete Gini coefficient G is computed over the sorted sequence
 *    s_(1) <= s_(2) <= ... <= s_(n) (1-indexed, i = 1..n):
 *
 *         G = sum_{i=1}^n (2*i - n - 1) * s_(i)  /  (n * sum_{i=1}^n s_(i))
 *
 *    - If sum(s) == 0 (no sessions conducted) or n <= 1: G = 0.0 (perfect equality).
 *    - If all students have identical session counts: G = 0.0.
 *    - If 1 student monopolizes all sessions: G = (n - 1) / n (approaches 1.0).
 *
 * 2. Fairness Score:
 *         FairnessScore = 100 * (1 - G)
 *
 *    Scale: [0, 100]
 *    Qualitative Labels:
 *      - Score >= 80: "Very even"
 *      - 60 <= Score < 80: "Fairly even"
 *      - Score < 60: "Uneven"
 *
 * The FastAPI AI service (/ai-service/app/routers/insights.py) adheres to this
 * identical definition for campus fairness telemetry.
 */

export type FairnessLabel = "Very even" | "Fairly even" | "Uneven";

export interface FairnessMetric {
  score: number; // 0.0 to 100.0 (rounded to 1 decimal place)
  label: FairnessLabel;
  gini: number; // 0.0 to 1.0 (rounded to 4 decimal places)
}

/**
 * Computes the discrete Gini coefficient for a list of non-negative values.
 * Returns a value between 0.0 (perfectly equal) and 1.0 (maximally unequal).
 */
export function calculateGini(values: number[]): number {
  if (!values || values.length <= 1) {
    return 0.0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const total = sorted.reduce((sum, val) => sum + val, 0);

  if (total === 0) {
    return 0.0;
  }

  let numerator = 0;
  for (let i = 0; i < n; i++) {
    // 1-indexed formula: (2 * rank - n - 1) * value
    numerator += (2 * (i + 1) - n - 1) * sorted[i];
  }

  const rawGini = numerator / (n * total);
  return Math.max(0, Math.min(1, Math.round(rawGini * 10000) / 10000));
}

/**
 * Maps a numerical fairness score [0, 100] to its plain-language label.
 */
export function getFairnessLabel(score: number): FairnessLabel {
  if (score >= 80) return "Very even";
  if (score >= 60) return "Fairly even";
  return "Uneven";
}

/**
 * Computes the Utilix Campus Fairness Score: 100 * (1 - Gini).
 */
export function calculateFairnessScore(sessionsPerStudent: number[]): FairnessMetric {
  const gini = calculateGini(sessionsPerStudent);
  const rawScore = 100 * (1 - gini);
  const score = Math.round(rawScore * 10) / 10;
  const label = getFairnessLabel(score);

  return {
    score,
    label,
    gini,
  };
}

/**
 * Computes utilization rate as percentage: (bookedSlotHours / availableSlotHours) * 100.
 * Bounded [0, 100], rounded to 1 decimal place.
 */
export function calculateUtilisationRate(
  bookedSlotHours: number,
  availableSlotHours: number
): number {
  if (!availableSlotHours || availableSlotHours <= 0) return 0.0;
  if (!bookedSlotHours || bookedSlotHours <= 0) return 0.0;

  const rate = (bookedSlotHours / availableSlotHours) * 100;
  return Math.min(100, Math.round(rate * 10) / 10);
}

/**
 * Aggregates bookings by their lifecycle status.
 */
export function calculateBookingsByStatus(
  bookings: Array<{ status: string }>
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const b of bookings) {
    counts[b.status] = (counts[b.status] || 0) + 1;
  }
  return counts;
}

export interface ActiveUsersMetric {
  activeUsersCount: number;
  totalUsersCount: number;
  activeRate: number; // percentage
}

/**
 * Counts distinct users who completed or hold bookings versus total registered active users.
 */
export function calculateActiveUsers(
  bookings: Array<{ user_id: string }>,
  totalRegisteredUsers: number
): ActiveUsersMetric {
  const uniqueUsers = new Set(bookings.map((b) => b.user_id).filter(Boolean));
  const activeUsersCount = uniqueUsers.size;
  const totalUsersCount = Math.max(totalRegisteredUsers, activeUsersCount);
  const activeRate =
    totalUsersCount > 0
      ? Math.round((activeUsersCount / totalUsersCount) * 1000) / 10
      : 0.0;

  return {
    activeUsersCount,
    totalUsersCount,
    activeRate,
  };
}

/**
 * Tallies sessions by department based on user department or team department mix.
 */
export function calculateSessionsByDepartment(
  bookings: Array<{ user_id: string; team_department_ids?: string[] }>,
  userDeptMap: Record<string, string>,
  allDepartmentIds: string[] = []
): Record<string, number> {
  const sessions: Record<string, number> = {};
  for (const deptId of allDepartmentIds) {
    sessions[deptId] = 0;
  }

  for (const b of bookings) {
    // If team_department_ids specified, attribute to each team department
    if (b.team_department_ids && b.team_department_ids.length > 0) {
      for (const d of b.team_department_ids) {
        sessions[d] = (sessions[d] || 0) + 1;
      }
    } else {
      // Fallback to requester user's department
      const dept = userDeptMap[b.user_id] || "other";
      sessions[dept] = (sessions[dept] || 0) + 1;
    }
  }

  return sessions;
}

/**
 * Computes utilization rate per department: (bookedHours / availableHours) * 100.
 */
export function calculateUtilisationByDepartment(
  bookedHoursByDept: Record<string, number>,
  availableHoursByDept: Record<string, number>
): Record<string, number> {
  const rates: Record<string, number> = {};
  const allDepts = new Set([
    ...Object.keys(bookedHoursByDept),
    ...Object.keys(availableHoursByDept),
  ]);

  for (const dept of allDepts) {
    const booked = bookedHoursByDept[dept] || 0;
    const avail = availableHoursByDept[dept] || 0;
    rates[dept] = calculateUtilisationRate(booked, avail);
  }

  return rates;
}

export interface ContendedResource {
  resourceId: string;
  name: string;
  contentionScore: number;
  waitlistCount: number;
  unfulfilledBookings: number;
}

export interface UnderusedResource {
  resourceId: string;
  name: string;
  utilisationRate: number;
  bookedHours: number;
  availableHours: number;
}

/**
 * Identifies top contended equipment (high waitlists/rejections) and
 * underused resources (utilization below 20%).
 */
export function identifyResourceContention(
  resources: Array<{ id: string; name: string }>,
  bookings: Array<{ resource_id: string; status: string }>,
  waitlistEntries: Array<{ resource_id: string }>,
  resourceHours: Record<string, { bookedHours: number; availableHours: number }>
): {
  topContended: ContendedResource[];
  underused: UnderusedResource[];
} {
  const waitlistMap: Record<string, number> = {};
  for (const w of waitlistEntries) {
    waitlistMap[w.resource_id] = (waitlistMap[w.resource_id] || 0) + 1;
  }

  const unfulfilledMap: Record<string, number> = {};
  for (const b of bookings) {
    if (b.status === "waitlisted" || b.status === "rejected") {
      unfulfilledMap[b.resource_id] = (unfulfilledMap[b.resource_id] || 0) + 1;
    }
  }

  const contendedList: ContendedResource[] = [];
  const underusedList: UnderusedResource[] = [];

  for (const res of resources) {
    const wl = waitlistMap[res.id] || 0;
    const unfulfilled = unfulfilledMap[res.id] || 0;
    const contentionScore = wl + unfulfilled;

    if (contentionScore > 0) {
      contendedList.push({
        resourceId: res.id,
        name: res.name,
        contentionScore,
        waitlistCount: wl,
        unfulfilledBookings: unfulfilled,
      });
    }

    const hours = resourceHours[res.id] || { bookedHours: 0, availableHours: 0 };
    const util = calculateUtilisationRate(hours.bookedHours, hours.availableHours);
    if (util < 20.0 && hours.availableHours > 0) {
      underusedList.push({
        resourceId: res.id,
        name: res.name,
        utilisationRate: util,
        bookedHours: Math.round(hours.bookedHours * 10) / 10,
        availableHours: Math.round(hours.availableHours * 10) / 10,
      });
    }
  }

  // Sort top contended descending
  contendedList.sort((a, b) => b.contentionScore - a.contentionScore);
  // Sort underused ascending
  underusedList.sort((a, b) => a.utilisationRate - b.utilisationRate);

  return {
    topContended: contendedList,
    underused: underusedList,
  };
}
