import { describe, expect, it } from "vitest";
import { runSimulation } from "../simulate.js";
import type { SimulateRequest } from "../types.js";

describe("simulate.ts", () => {
  it("runs simulation deterministically for a given seed", () => {
    const input: SimulateRequest = {
      students: 20,
      resources: 3,
      days: 5,
      slotsPerResourcePerDay: 2,
      aggressiveShare: 0.2,
      seed: "deterministic-sim-seed-77",
    };

    const run1 = runSimulation(input);
    const run2 = runSimulation(input);

    expect(run1.fair.gini).toBe(run2.fair.gini);
    expect(run1.fair.jainIndex).toBe(run2.fair.jainIndex);
    expect(run1.fcfs.gini).toBe(run2.fcfs.gini);
    expect(run1.fcfs.jainIndex).toBe(run2.fcfs.jainIndex);
  });

  it("proves that fair allocation improves Jain fairness and coverage over FCFS", () => {
    const input: SimulateRequest = {
      students: 40,
      resources: 4,
      days: 7,
      slotsPerResourcePerDay: 3,
      aggressiveShare: 0.2,
      seed: "proof-of-fairness-seed",
    };

    const res = runSimulation(input);

    // Fair allocation gives higher Jain index (closer to 1.0) than FCFS
    expect(res.fair.jainIndex).toBeGreaterThan(res.fcfs.jainIndex);

    // Fair allocation serves more unique students than FCFS
    expect(res.fair.percentStudentsServedAtLeastOnce).toBeGreaterThanOrEqual(
      res.fcfs.percentStudentsServedAtLeastOnce
    );

    expect(res.improvementSummary).toContain("CampusShare fair allocation improved");
  });
});
