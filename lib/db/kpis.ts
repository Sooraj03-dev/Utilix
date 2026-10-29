// Utilix — admin KPI database loader (server-only)
// Owner: A
import "server-only";

import {
  bookingsCol,
  resourcesCol,
  availabilityWindowsCol,
  usersCol,
  departmentsCol,
  waitlistCol,
} from "./collections";
import { docToEntity } from "./converters";
import {
  calculateGini,
  calculateFairnessScore,
  calculateUtilisationRate,
  calculateBookingsByStatus,
  calculateActiveUsers,
  calculateSessionsByDepartment,
  calculateUtilisationByDepartment,
  identifyResourceContention,
  type FairnessMetric,
  type ActiveUsersMetric,
  type ContendedResource,
  type UnderusedResource,
} from "@/lib/kpis";
import type {
  Booking,
  Resource,
  AvailabilityWindow,
  User,
  Department,
  WaitlistEntry,
  Weekday,
} from "@/lib/types";

export interface AdminKpiReport {
  generatedAt: string;
  windowDays: number;
  totalBookings: number;
  totalStudents: number;
  totalResources: number;
  bookedSlotHours: number;
  availableSlotHours: number;
  overallUtilisationRate: number;
  fairness: FairnessMetric;
  activeUsers: ActiveUsersMetric;
  bookingsByStatus: Record<string, number>;
  sessionsByDepartment: Record<string, number>;
  utilisationByDepartment: Record<string, number>;
  departmentDetails: Record<string, { name: string; code: string }>;
  topContendedResources: ContendedResource[];
  underusedResources: UnderusedResource[];
}

/** Helper to count occurrences of a specific weekday in [startDate, endDate]. */
function countWeekdayOccurrences(startDate: Date, endDate: Date, targetWeekday: Weekday): number {
  let count = 0;
  const cur = new Date(startDate.getTime());
  cur.setUTCHours(0, 0, 0, 0);

  const endLimit = new Date(endDate.getTime());
  endLimit.setUTCHours(23, 59, 59, 999);

  while (cur.getTime() <= endLimit.getTime()) {
    if (cur.getUTCDay() === targetWeekday) {
      count++;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

/** Calculate duration in hours between start and end HH:mm strings. */
function windowHours(start: string, end: string): number {
  try {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
  } catch {
    return 0;
  }
}

/**
 * Loads Firestore data for the last 30 days and computes admin KPIs.
 */
export async function loadAdminKpis(windowDays: number = 30): Promise<AdminKpiReport> {
  const now = new Date();
  const startDate = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const startIso = startDate.toISOString();
  const startDateStr = startIso.slice(0, 10);
  const nowDateStr = now.toISOString().slice(0, 10);

  // Parallel fetch of relevant collections
  const [
    bookingsSnap,
    resourcesSnap,
    windowsSnap,
    usersSnap,
    deptsSnap,
    waitlistSnap,
  ] = await Promise.all([
    bookingsCol().get(),
    resourcesCol().get(),
    availabilityWindowsCol().get(),
    usersCol().get(),
    departmentsCol().get(),
    waitlistCol().get(),
  ]);

  const allBookings = bookingsSnap.docs
    .map((d) => docToEntity<Booking>(d.id, d.data()))
    .filter((b): b is Booking => b !== null);

  const allResources = resourcesSnap.docs
    .map((d) => docToEntity<Resource>(d.id, d.data()))
    .filter((r): r is Resource => r !== null);

  const allWindows = windowsSnap.docs
    .map((d) => docToEntity<AvailabilityWindow>(d.id, d.data()))
    .filter((w): w is AvailabilityWindow => w !== null);

  const allUsers = usersSnap.docs
    .map((d) => docToEntity<User>(d.id, d.data()))
    .filter((u): u is User => u !== null);

  const allDepartments = deptsSnap.docs
    .map((d) => docToEntity<Department>(d.id, d.data()))
    .filter((d): d is Department => d !== null);

  const allWaitlist = waitlistSnap.docs
    .map((d) => docToEntity<WaitlistEntry>(d.id, d.data()))
    .filter((w): w is WaitlistEntry => w !== null);

  // 1. Filter bookings in window
  const windowBookings = allBookings.filter((b) => {
    return b.slot_start >= startIso || b.created_at >= startIso;
  });

  // 2. Compute booked hours (from confirmed, checked_out, returned)
  let totalBookedSlotHours = 0;
  const bookedHoursByResource: Record<string, number> = {};
  const bookedHoursByDept: Record<string, number> = {};

  const resourceMap = new Map<string, Resource>(allResources.map((r) => [r.id, r]));
  const userMap = new Map<string, User>(allUsers.map((u) => [u.id, u]));
  const userDeptMap: Record<string, string> = {};
  for (const u of allUsers) {
    if (u.department_id) userDeptMap[u.id] = u.department_id;
  }

  const completedStatuses = new Set(["confirmed", "checked_out", "returned"]);
  const studentSessionsMap: Record<string, number> = {};

  // Initialize student sessions map for all registered students (including 0 sessions)
  const students = allUsers.filter((u) => u.role === "student");
  for (const s of students) {
    studentSessionsMap[s.id] = 0;
  }

  for (const b of windowBookings) {
    if (completedStatuses.has(b.status)) {
      const startTime = new Date(b.slot_start).getTime();
      const endTime = new Date(b.slot_end).getTime();
      let hours = (endTime - startTime) / (1000 * 60 * 60);
      if (hours <= 0 || isNaN(hours)) hours = 1;

      totalBookedSlotHours += hours;
      bookedHoursByResource[b.resource_id] = (bookedHoursByResource[b.resource_id] || 0) + hours;

      const res = resourceMap.get(b.resource_id);
      const deptId = res?.department_id || "other";
      bookedHoursByDept[deptId] = (bookedHoursByDept[deptId] || 0) + hours;

      // Increment sessions count for student
      if (studentSessionsMap[b.user_id] !== undefined) {
        studentSessionsMap[b.user_id] += 1;
      }
    }
  }

  // 3. Compute available hours from availability_windows (excluding blocked)
  let totalAvailableSlotHours = 0;
  const availableHoursByResource: Record<string, number> = {};
  const availableHoursByDept: Record<string, number> = {};

  for (const win of allWindows) {
    if (win.slot_type === "blocked") continue;

    const hours = windowHours(win.start, win.end);
    let occurrences = 0;

    if (win.weekday !== null && win.weekday !== undefined) {
      occurrences = countWeekdayOccurrences(startDate, now, win.weekday);
    } else if (win.date) {
      if (win.date >= startDateStr && win.date <= nowDateStr) {
        occurrences = 1;
      }
    }

    const totalWindowHours = hours * occurrences;
    totalAvailableSlotHours += totalWindowHours;
    availableHoursByResource[win.resource_id] =
      (availableHoursByResource[win.resource_id] || 0) + totalWindowHours;

    const res = resourceMap.get(win.resource_id);
    const deptId = res?.department_id || "other";
    availableHoursByDept[deptId] = (availableHoursByDept[deptId] || 0) + totalWindowHours;
  }

  // Fallback: If available hours calculation resulted in 0 (e.g. freshly seeded without full window recurrence),
  // approximate available hours from resources to avoid 0 divisor
  if (totalAvailableSlotHours === 0 && allResources.length > 0) {
    totalAvailableSlotHours = allResources.length * 8 * 22; // ~8 hrs/day * 22 working days
  }

  // 4. Utilisation rate
  const overallUtilisationRate = calculateUtilisationRate(
    totalBookedSlotHours,
    totalAvailableSlotHours
  );

  // 5. Fairness score (including all students, even with 0 sessions)
  const sessionsPerStudent = Object.values(studentSessionsMap);
  const fairness = calculateFairnessScore(sessionsPerStudent);

  // 6. Active users metric
  const activeUsers = calculateActiveUsers(windowBookings, students.length);

  // 7. Bookings by status
  const bookingsByStatus = calculateBookingsByStatus(windowBookings);

  // 8. Department breakdown
  const departmentIds = allDepartments.map((d) => d.id);
  const sessionsByDepartment = calculateSessionsByDepartment(
    windowBookings,
    userDeptMap,
    departmentIds
  );
  const utilisationByDepartment = calculateUtilisationByDepartment(
    bookedHoursByDept,
    availableHoursByDept
  );

  const departmentDetails: Record<string, { name: string; code: string }> = {};
  for (const d of allDepartments) {
    departmentDetails[d.id] = { name: d.name, code: d.code };
  }

  // 9. Contention and Underused resources
  const resourceHours: Record<string, { bookedHours: number; availableHours: number }> = {};
  for (const r of allResources) {
    resourceHours[r.id] = {
      bookedHours: bookedHoursByResource[r.id] || 0,
      availableHours: availableHoursByResource[r.id] || 0,
    };
  }

  const { topContended, underused } = identifyResourceContention(
    allResources,
    windowBookings,
    allWaitlist,
    resourceHours
  );

  return {
    generatedAt: now.toISOString(),
    windowDays,
    totalBookings: windowBookings.length,
    totalStudents: students.length,
    totalResources: allResources.length,
    bookedSlotHours: Math.round(totalBookedSlotHours * 10) / 10,
    availableSlotHours: Math.round(totalAvailableSlotHours * 10) / 10,
    overallUtilisationRate,
    fairness,
    activeUsers,
    bookingsByStatus,
    sessionsByDepartment,
    utilisationByDepartment,
    departmentDetails,
    topContendedResources: topContended,
    underusedResources: underused,
  };
}

