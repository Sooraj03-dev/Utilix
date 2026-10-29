import { describe, expect, it } from "vitest";
import { generateInsights } from "../insights.js";
import type { InsightsRequest } from "../types.js";

const mockInput: InsightsRequest = {
  resourceStats: [
    {
      resourceId: "res-1",
      name: "3D Printer A",
      department: "Mech",
      totalSlots: 10,
      bookedSlots: 9, // 90% -> over-contended
      requests: 15,
      waitlistLength: 5,
      avgWaitHours: 20,
    },
    {
      resourceId: "res-2",
      name: "Arduino Kit B",
      department: "Elec",
      totalSlots: 10,
      bookedSlots: 1, // 10% -> underused
      requests: 1,
      waitlistLength: 0,
      avgWaitHours: 0,
    },
  ],
  studentSessions: {
    "student-1": 5,
    "student-2": 4,
    "student-3": 1,
    "student-4": 0,
  },
  departmentSessions: {
    Mech: 9,
    Elec: 1,
  },
};

describe("insights.ts", () => {
  it("generates correct utilisation, underused/over-contended flags, and redistribution suggestions", () => {
    const res = generateInsights(mockInput);

    expect(res.resourceUtilisation.length).toBe(2);
    expect(res.resourceUtilisation[0].utilisation).toBe(0.9);
    expect(res.resourceUtilisation[1].utilisation).toBe(0.1);

    expect(res.overContended).toContain("3D Printer A");
    expect(res.underused).toContain("Arduino Kit B");

    expect(res.fairness.gini).toBeGreaterThan(0);
    expect(res.fairness.jainIndex).toBeGreaterThan(0);

    expect(res.redistributionSuggestions.length).toBeGreaterThan(0);
    expect(res.redistributionSuggestions[0]).toContain("Promote Arduino Kit B");
    expect(res.redistributionSuggestions[0]).toContain("3D Printer A");

    expect(res.narrative.length).toBe(3);
  });
});
