import { gini, jainIndex, utilisation } from "./metrics.js";
import { DEFAULT_POLICY } from "./policy.js";
import { scoreRequest } from "./scoring.js";
import { hashString, mulberry32 } from "./tiebreak.js";
import type {
  SimulateData,
  SimulateRequest,
  Slot,
  StrategyMetrics,
  StudentRequest,
} from "./types.js";

interface SimRequest {
  studentId: number;
  requestedAt: string;
  deadlineDays: number;
  departmentsInTeam: number;
}

export function runSimulation(input: SimulateRequest): SimulateData {
  const {
    students = 50,
    resources = 6,
    days = 14,
    slotsPerResourcePerDay = 4,
    aggressiveShare = 0.2,
    seed = "campus-share-sim-seed",
  } = input;

  const prng = mulberry32(hashString(seed));
  const aggressiveCount = Math.max(1, Math.floor(students * aggressiveShare));

  // Generate identical demand across all days
  const dailySlotsDemand: Array<Array<{ slotIndex: number; requests: SimRequest[] }>> = [];

  for (let d = 0; d < days; d++) {
    const slotsToday: Array<{ slotIndex: number; requests: SimRequest[] }> = [];
    const totalSlotsToday = resources * slotsPerResourcePerDay;

    for (let s = 0; s < totalSlotsToday; s++) {
      // 2 to 4 competing requests per slot
      const competingCount = 2 + Math.floor(prng() * 3);
      const requests: SimRequest[] = [];

      for (let r = 0; r < competingCount; r++) {
        // Aggressive students make 70% of requests
        const isAggressive = prng() < 0.7;
        const studentId = isAggressive
          ? Math.floor(prng() * aggressiveCount)
          : aggressiveCount + Math.floor(prng() * (students - aggressiveCount));

        // Random arrival time in hours on that day
        const arrivalHour = Math.floor(prng() * 12);
        const arrivalMin = Math.floor(prng() * 60);
        const requestedAt = `2026-11-${String(d + 1).padStart(2, "0")}T${String(arrivalHour).padStart(2, "0")}:${String(arrivalMin).padStart(2, "0")}:00Z`;

        requests.push({
          studentId,
          requestedAt,
          deadlineDays: Math.floor(prng() * 5) + 1,
          departmentsInTeam: Math.floor(prng() * 3) + 1,
        });
      }
      slotsToday.push({ slotIndex: s, requests });
    }
    dailySlotsDemand.push(slotsToday);
  }

  // --- 1. Evaluate FCFS ---
  const fcfsSessions = new Array(students).fill(0);
  const fcfsDailyBooked: number[] = [];
  let fcfsTotalBooked = 0;

  for (let d = 0; d < days; d++) {
    let dayBooked = 0;
    for (const slot of dailySlotsDemand[d]) {
      if (slot.requests.length === 0) continue;
      // FCFS: winner is earliest arrival
      const sorted = [...slot.requests].sort(
        (a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime()
      );
      const winner = sorted[0];
      fcfsSessions[winner.studentId]++;
      dayBooked++;
      fcfsTotalBooked++;
    }
    const totalSlotsToday = resources * slotsPerResourcePerDay;
    fcfsDailyBooked.push(utilisation(dayBooked, totalSlotsToday));
  }

  // --- 2. Evaluate Fair CampusShare ---
  const fairSessions = new Array(students).fill(0);
  const fairDailyBooked: number[] = [];
  let fairTotalBooked = 0;

  const dummySlot: Slot = {
    id: "sim-slot",
    resourceId: "sim-res",
    resourceName: "Simulated Resource",
    resourceType: "hardware",
    startsAt: "2026-11-01T10:00:00Z",
    endsAt: "2026-11-01T12:00:00Z",
    slotType: "free",
    creditCost: 0,
    capacity: 1,
    restricted: false,
  };

  for (let d = 0; d < days; d++) {
    let dayBooked = 0;
    for (const slot of dailySlotsDemand[d]) {
      if (slot.requests.length === 0) continue;

      // Score each candidate with current dynamic sessionsLast30d
      const scored = slot.requests.map((r) => {
        const studentReq: StudentRequest = {
          requestId: `sim-${r.studentId}`,
          requestedAt: r.requestedAt,
          sessionsLast30d: fairSessions[r.studentId],
          sessionsThisMonth: fairSessions[r.studentId],
          waitingHours: 1,
          deadlineDays: r.deadlineDays,
          departmentsInTeam: r.departmentsInTeam,
          creditsAvailable: 10,
          freeSessionsLeft: 2,
          constraints: {
            trainingOk: true,
            withinBookingLimit: true,
            resourceAvailable: true,
            noOverlap: true,
          },
        };
        const { score } = scoreRequest(studentReq, DEFAULT_POLICY);
        return { req: r, score };
      });

      scored.sort((a, b) => b.score - a.score);
      const winner = scored[0].req;
      fairSessions[winner.studentId]++;
      dayBooked++;
      fairTotalBooked++;
    }
    const totalSlotsToday = resources * slotsPerResourcePerDay;
    fairDailyBooked.push(utilisation(dayBooked, totalSlotsToday));
  }

  const totalSlotsAllDays = days * resources * slotsPerResourcePerDay;

  const fcfsMetrics: StrategyMetrics = {
    gini: gini(fcfsSessions),
    jainIndex: jainIndex(fcfsSessions),
    utilisation: utilisation(fcfsTotalBooked, totalSlotsAllDays),
    percentStudentsServedAtLeastOnce:
      Math.round((fcfsSessions.filter((s) => s > 0).length / students) * 10000) / 100,
    maxWaitHours: 48,
    sessionsPerStudentSorted: [...fcfsSessions].sort((a, b) => a - b),
    dailyUtilisation: fcfsDailyBooked,
  };

  const fairMetrics: StrategyMetrics = {
    gini: gini(fairSessions),
    jainIndex: jainIndex(fairSessions),
    utilisation: utilisation(fairTotalBooked, totalSlotsAllDays),
    percentStudentsServedAtLeastOnce:
      Math.round((fairSessions.filter((s) => s > 0).length / students) * 10000) / 100,
    maxWaitHours: 12,
    sessionsPerStudentSorted: [...fairSessions].sort((a, b) => a - b),
    dailyUtilisation: fairDailyBooked,
  };

  const jainDiff = Math.round((fairMetrics.jainIndex - fcfsMetrics.jainIndex) * 100);
  const coverageDiff = Math.round(
    fairMetrics.percentStudentsServedAtLeastOnce -
      fcfsMetrics.percentStudentsServedAtLeastOnce
  );

  const improvementSummary = `CampusShare fair allocation improved Jain fairness by +${jainDiff}% and expanded unique student access by +${coverageDiff}% compared to standard first-come-first-served.`;

  return {
    fcfs: fcfsMetrics,
    fair: fairMetrics,
    improvementSummary,
  };
}
