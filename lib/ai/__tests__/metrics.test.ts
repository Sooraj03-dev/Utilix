import { describe, expect, it } from "vitest";
import { gini, jainIndex, utilisation } from "../metrics.js";

describe("metrics.ts", () => {
  it("calculates Gini coefficient correctly for equal distribution", () => {
    expect(gini([5, 5, 5, 5])).toBe(0);
    expect(gini([0, 0, 0])).toBe(0);
    expect(gini([])).toBe(0);
  });

  it("calculates Gini coefficient correctly for extreme inequality", () => {
    // 1 person has everything out of 100 people
    const arr = new Array(99).fill(0).concat([100]);
    const g = gini(arr);
    expect(g).toBeGreaterThan(0.9);
  });

  it("calculates Jain's index correctly for perfect equality", () => {
    expect(jainIndex([10, 10, 10, 10])).toBe(1.0);
    expect(jainIndex([])).toBe(1.0);
  });

  it("calculates Jain's index for extreme inequality", () => {
    // 1 person out of 10 has everything -> jain index should be 1/10 = 0.1
    const arr = [10, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(jainIndex(arr)).toBe(0.1);
  });

  it("calculates utilisation ratio correctly", () => {
    expect(utilisation(10, 20)).toBe(0.5);
    expect(utilisation(0, 10)).toBe(0);
    expect(utilisation(5, 0)).toBe(0);
    expect(utilisation(25, 20)).toBe(1.0); // clamped to 1
  });
});
