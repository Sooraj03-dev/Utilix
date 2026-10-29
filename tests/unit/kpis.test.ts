import { describe, it, expect } from "vitest";
import {
  calculateGini,
  calculateFairnessScore,
  getFairnessLabel,
  calculateUtilisationRate,
  calculateBookingsByStatus,
  calculateActiveUsers,
  calculateSessionsByDepartment,
  identifyResourceContention,
} from "../../lib/kpis";
import { buildSeedDataset } from "../../lib/mocks/seed-data";

describe("KPI Pure Functions — Gini Coefficient & Campus Fairness Score", () => {
  it("returns 0.0 when all students have identical sessions (perfect equality)", () => {
    expect(calculateGini([10, 10, 10, 10])).toBe(0.0);
    expect(calculateGini([1, 1, 1, 1, 1, 1])).toBe(0.0);
    expect(calculateGini([42, 42])).toBe(0.0);

    const fairness = calculateFairnessScore([10, 10, 10, 10]);
    expect(fairness.gini).toBe(0.0);
    expect(fairness.score).toBe(100.0);
    expect(fairness.label).toBe("Very even");
  });

  it("handles zero sessions for everyone without dividing by zero", () => {
    expect(calculateGini([0, 0, 0, 0])).toBe(0.0);
    expect(calculateGini([0])).toBe(0.0);

    const fairness = calculateFairnessScore([0, 0, 0, 0]);
    expect(fairness.gini).toBe(0.0);
    expect(fairness.score).toBe(100.0);
    expect(fairness.label).toBe("Very even");
  });

  it("handles edge cases (empty list and single element) safely", () => {
    expect(calculateGini([])).toBe(0.0);
    expect(calculateGini([5])).toBe(0.0);

    expect(calculateFairnessScore([]).score).toBe(100.0);
    expect(calculateFairnessScore([5]).score).toBe(100.0);
  });

  it("approaches 1.0 when one student monopolizes all sessions", () => {
    // For n=4, (n-1)/n = 3/4 = 0.75
    expect(calculateGini([0, 0, 0, 100])).toBe(0.75);

    // For n=100, (n-1)/n = 99/100 = 0.99
    const monopoly100 = new Array(99).fill(0).concat([500]);
    expect(calculateGini(monopoly100)).toBe(0.99);

    const fairness = calculateFairnessScore(monopoly100);
    expect(fairness.gini).toBe(0.99);
    expect(fairness.score).toBe(1.0);
    expect(fairness.label).toBe("Uneven");
  });

  it("verifies exact hand-computed Gini for [1, 2, 3, 4, 5]", () => {
    // Values: [1, 2, 3, 4, 5] (n=5, sum=15)
    // Numerator: sum (2i - 6) * val
    // i=1: (2-6)*1 = -4
    // i=2: (4-6)*2 = -4
    // i=3: (6-6)*3 =  0
    // i=4: (8-6)*4 =  8
    // i=5: (10-6)*5 = 20
    // sum = 20. Denominator = 5 * 15 = 75. Gini = 20/75 = 0.2667
    const values = [1, 2, 3, 4, 5];
    const gini = calculateGini(values);
    expect(gini).toBe(0.2667);

    const fairness = calculateFairnessScore(values);
    expect(fairness.score).toBe(73.3);
    expect(fairness.label).toBe("Fairly even");
  });

  it("assigns fairness labels correctly according to specification thresholds", () => {
    expect(getFairnessLabel(80.0)).toBe("Very even");
    expect(getFairnessLabel(95.5)).toBe("Very even");
    expect(getFairnessLabel(79.9)).toBe("Fairly even");
    expect(getFairnessLabel(60.0)).toBe("Fairly even");
    expect(getFairnessLabel(59.9)).toBe("Uneven");
    expect(getFairnessLabel(12.0)).toBe("Uneven");
  });
});

describe("KPI Pure Functions — Utilisation & Active Users", () => {
  it("calculates utilisation rate correctly", () => {
    // 50 booked hours / 200 available hours = 25%
    expect(calculateUtilisationRate(50, 200)).toBe(25.0);

    // 0 available hours safe fallback
    expect(calculateUtilisationRate(50, 0)).toBe(0.0);

    // 0 booked hours
    expect(calculateUtilisationRate(0, 100)).toBe(0.0);

    // Rounding check: 45 / 130 = 34.615% -> 34.6%
    expect(calculateUtilisationRate(45, 130)).toBe(34.6);
  });

  it("aggregates bookings by status accurately", () => {
    const bookings = [
      { status: "confirmed" },
      { status: "confirmed" },
      { status: "checked_out" },
      { status: "returned" },
      { status: "waitlisted" },
      { status: "rejected" },
    ];
    const statusCounts = calculateBookingsByStatus(bookings);
    expect(statusCounts).toEqual({
      confirmed: 2,
      checked_out: 1,
      returned: 1,
      waitlisted: 1,
      rejected: 1,
    });
  });

  it("calculates active users and active participation rate", () => {
    const bookings = [
      { user_id: "student-01" },
      { user_id: "student-02" },
      { user_id: "student-01" }, // duplicate session
      { user_id: "student-03" },
    ];
    const res = calculateActiveUsers(bookings, 10);
    expect(res.activeUsersCount).toBe(3);
    expect(res.totalUsersCount).toBe(10);
    expect(res.activeRate).toBe(30.0);
  });

  it("groups sessions by department accurately", () => {
    const userDeptMap: Record<string, string> = {
      "student-01": "dept_eng",
      "student-02": "dept_cs",
      "student-03": "dept_eng",
    };
    const bookings = [
      { user_id: "student-01" },
      { user_id: "student-02" },
      { user_id: "student-03" },
      { user_id: "student-01", team_department_ids: ["dept_media", "dept_arts"] },
    ];

    const distribution = calculateSessionsByDepartment(
      bookings,
      userDeptMap,
      ["dept_eng", "dept_cs", "dept_media", "dept_arts"]
    );

    expect(distribution["dept_eng"]).toBe(2);
    expect(distribution["dept_cs"]).toBe(1);
    expect(distribution["dept_media"]).toBe(1);
    expect(distribution["dept_arts"]).toBe(1);
  });

  it("identifies contended and underused resources", () => {
    const resources = [
      { id: "res-3d-printer", name: "3D Printer XL" },
      { id: "res-oscilloscope", name: "Digital Oscilloscope" },
      { id: "res-vr-headset", name: "VR Headset" },
    ];
    const bookings = [
      { resource_id: "res-3d-printer", status: "rejected" },
      { resource_id: "res-3d-printer", status: "waitlisted" },
      { resource_id: "res-oscilloscope", status: "confirmed" },
    ];
    const waitlist = [
      { resource_id: "res-3d-printer" },
      { resource_id: "res-3d-printer" },
    ];
    const resourceHours = {
      "res-3d-printer": { bookedHours: 150, availableHours: 160 }, // 93.8%
      "res-oscilloscope": { bookedHours: 8, availableHours: 100 },  // 8.0% (<20% underused)
      "res-vr-headset": { bookedHours: 50, availableHours: 100 },   // 50.0%
    };

    const { topContended, underused } = identifyResourceContention(
      resources,
      bookings,
      waitlist,
      resourceHours
    );

    expect(topContended.length).toBe(1);
    expect(topContended[0].resourceId).toBe("res-3d-printer");
    expect(topContended[0].contentionScore).toBe(4); // 2 waitlist + 2 unfulfilled

    expect(underused.length).toBe(1);
    expect(underused[0].resourceId).toBe("res-oscilloscope");
    expect(underused[0].utilisationRate).toBe(8.0);
  });
});

describe("KPI Telemetry against Utilix Seed Dataset", () => {
  it("computes telemetry values on mock seed dataset", () => {
    const dataset = buildSeedDataset();

    // Verify dataset users and bookings
    expect(dataset.users.length).toBeGreaterThan(0);
    expect(dataset.bookings.length).toBeGreaterThan(0);

    const students = dataset.users.filter((u) => u.role === "student");
    const studentIds = new Set(students.map((s) => s.id));

    // Count sessions per student
    const studentSessionMap: Record<string, number> = {};
    for (const s of students) {
      studentSessionMap[s.id] = 0;
    }

    const completedBookings = dataset.bookings.filter(
      (b) => b.status === "approved"
    );

    for (const b of completedBookings) {
      if (studentSessionMap[b.userId] !== undefined) {
        studentSessionMap[b.userId] += 1;
      }
    }

    const sessionsPerStudent = Object.values(studentSessionMap);
    const fairness = calculateFairnessScore(sessionsPerStudent);

    console.log(`[Seed Telemetry] Total Students: ${students.length}`);
    console.log(`[Seed Telemetry] Completed Bookings: ${completedBookings.length}`);
    console.log(`[Seed Telemetry] Sessions per Student: ${JSON.stringify(sessionsPerStudent)}`);
    console.log(`[Seed Telemetry] Gini Coefficient: ${fairness.gini}`);
    console.log(`[Seed Telemetry] Fairness Score: ${fairness.score} (${fairness.label})`);

    expect(fairness.gini).toBeGreaterThanOrEqual(0.0);
    expect(fairness.gini).toBeLessThanOrEqual(1.0);
    expect(fairness.score).toBeGreaterThanOrEqual(0.0);
    expect(fairness.score).toBeLessThanOrEqual(100.0);
  });
});

