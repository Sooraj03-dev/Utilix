import { describe, it, expect } from "vitest";
import {
  normalizeWeights,
  diffPolicies,
  isPolicyEqual,
  applyPolicyVersionTransition,
  applyPolicyRestoreTransition,
  type PolicyInputData,
  type PolicyVersionRecord,
} from "../../lib/policy-diff";
import { DEFAULT_POLICY, DEFAULT_WEIGHTS } from "../../lib/types/policy";

describe("Policy Diff & Weights Normalization (Pure Logic)", () => {
  it("normalizes default weights so that they strictly sum to 100.0%", () => {
    const norm = normalizeWeights(DEFAULT_WEIGHTS);
    expect(norm.usage_fairness).toBe(35.0);
    expect(norm.waiting_time).toBe(25.0);
    expect(norm.declared_need).toBe(20.0);
    expect(norm.interdisciplinary_bonus).toBe(20.0);

    const sum =
      norm.usage_fairness +
      norm.waiting_time +
      norm.declared_need +
      norm.interdisciplinary_bonus;
    expect(sum).toBe(100.0);
  });

  it("normalizes arbitrary integer weights to strictly sum to 100.0%", () => {
    const input = {
      usage_fairness: 40,
      waiting_time: 30,
      declared_need: 20,
      interdisciplinary_bonus: 10,
    };
    const norm = normalizeWeights(input);
    const sum =
      norm.usage_fairness +
      norm.waiting_time +
      norm.declared_need +
      norm.interdisciplinary_bonus;

    expect(sum).toBe(100.0);
    expect(norm.usage_fairness).toBe(40.0);
    expect(norm.waiting_time).toBe(30.0);
    expect(norm.declared_need).toBe(20.0);
    expect(norm.interdisciplinary_bonus).toBe(10.0);
  });

  it("handles odd division without floating point drift (sum remains 100.0%)", () => {
    // 33, 33, 33, 0
    const input = {
      usage_fairness: 33,
      waiting_time: 33,
      declared_need: 33,
      interdisciplinary_bonus: 0,
    };
    const norm = normalizeWeights(input);
    const sum =
      norm.usage_fairness +
      norm.waiting_time +
      norm.declared_need +
      norm.interdisciplinary_bonus;

    expect(sum).toBe(100.0);
  });

  it("safely handles all zero weights by distributing equally (25% each)", () => {
    const input = {
      usage_fairness: 0,
      waiting_time: 0,
      declared_need: 0,
      interdisciplinary_bonus: 0,
    };
    const norm = normalizeWeights(input);
    expect(norm).toEqual({
      usage_fairness: 25.0,
      waiting_time: 25.0,
      declared_need: 25.0,
      interdisciplinary_bonus: 25.0,
    });
    expect(
      norm.usage_fairness +
        norm.waiting_time +
        norm.declared_need +
        norm.interdisciplinary_bonus
    ).toBe(100.0);
  });

  it("describes configuration changes correctly in plain language", () => {
    const prev = {
      monthly_credits: 10,
      free_sessions_per_week: 2,
      weights: {
        usage_fairness: 40,
        waiting_time: 30,
        declared_need: 20,
        interdisciplinary_bonus: 10,
      },
    };

    const next = {
      monthly_credits: 15,
      free_sessions_per_week: 3,
      weights: {
        usage_fairness: 60,
        waiting_time: 20,
        declared_need: 10,
        interdisciplinary_bonus: 10,
      },
    };

    const diffs = diffPolicies(prev, next);
    expect(diffs).toContain("monthly credits 10 to 15");
    expect(diffs).toContain("free sessions per week 2 to 3");
    expect(diffs).toContain("usage fairness weight 40 to 60");
    expect(diffs).toContain("waiting time weight 30 to 20");
    expect(diffs).toContain("declared need weight 20 to 10");
  });

  it("detects no changes when policies are identical", () => {
    const p1 = {
      monthly_credits: 10,
      free_sessions_per_week: 2,
      weights: { ...DEFAULT_WEIGHTS },
    };
    const p2 = {
      monthly_credits: 10,
      free_sessions_per_week: 2,
      weights: { ...DEFAULT_WEIGHTS },
    };

    expect(diffPolicies(p1, p2)).toEqual([]);
    expect(isPolicyEqual(p1, p2)).toBe(true);
  });
});

describe("Policy Versioning State Machine Invariants", () => {
  const samplePolicyInput: PolicyInputData = {
    monthly_credits: 10,
    free_sessions_per_week: 2,
    max_active_bookings: 3,
    slot_minutes: 60,
    cancel_refund_hours: 24,
    deadline_window_days: 7,
    weights: DEFAULT_WEIGHTS,
    tiebreak_order: ["fewest_sessions_month", "earliest_request", "seeded_lottery"],
    peak_definition: [],
  };

  it("creates a new policy version and deactivates the old version", () => {
    const v1: PolicyVersionRecord = {
      version: 1,
      is_active: true,
      data: samplePolicyInput,
      created_by: "admin-01",
    };

    const newPolicyInput: PolicyInputData = {
      ...samplePolicyInput,
      monthly_credits: 15,
    };

    const { updatedVersions, createdVersion } = applyPolicyVersionTransition(
      [v1],
      newPolicyInput,
      "admin-02"
    );

    // Old version v1 must be deactivated
    const oldV1 = updatedVersions.find((v) => v.version === 1);
    expect(oldV1?.is_active).toBe(false);

    // New version v2 must be created and active
    expect(createdVersion.version).toBe(2);
    expect(createdVersion.is_active).toBe(true);
    expect(createdVersion.created_by).toBe("admin-02");
    expect(createdVersion.data.monthly_credits).toBe(15);
  });

  it("ensures ONLY ONE version is active at any time", () => {
    const v1: PolicyVersionRecord = {
      version: 1,
      is_active: true,
      data: samplePolicyInput,
      created_by: "system",
    };

    const step1 = applyPolicyVersionTransition([v1], { ...samplePolicyInput, monthly_credits: 12 }, "admin");
    const activeStep1 = step1.updatedVersions.filter((v) => v.is_active);
    expect(activeStep1.length).toBe(1);
    expect(activeStep1[0].version).toBe(2);

    const step2 = applyPolicyVersionTransition(step1.updatedVersions, { ...samplePolicyInput, monthly_credits: 20 }, "admin");
    const activeStep2 = step2.updatedVersions.filter((v) => v.is_active);
    expect(activeStep2.length).toBe(1);
    expect(activeStep2[0].version).toBe(3);
  });

  it("restoring an older version creates a NEW version with old values", () => {
    const v1Data = { ...samplePolicyInput, monthly_credits: 10, free_sessions_per_week: 2 };
    const v2Data = { ...samplePolicyInput, monthly_credits: 20, free_sessions_per_week: 4 };

    const versions: PolicyVersionRecord[] = [
      { version: 1, is_active: false, data: v1Data, created_by: "admin-1" },
      { version: 2, is_active: true, data: v2Data, created_by: "admin-2" },
    ];

    // Restore v1
    const { updatedVersions, createdVersion } = applyPolicyRestoreTransition(
      versions,
      1,
      "admin-restorer"
    );

    // Version must be incremented to v3
    expect(createdVersion.version).toBe(3);
    expect(createdVersion.is_active).toBe(true);
    expect(createdVersion.created_by).toBe("admin-restorer");

    // Must carry the values of v1 (monthly_credits = 10, free_sessions = 2)
    expect(createdVersion.data.monthly_credits).toBe(10);
    expect(createdVersion.data.free_sessions_per_week).toBe(2);

    // Exactly one active version
    const activeList = updatedVersions.filter((v) => v.is_active);
    expect(activeList.length).toBe(1);
    expect(activeList[0].version).toBe(3);
  });
});
