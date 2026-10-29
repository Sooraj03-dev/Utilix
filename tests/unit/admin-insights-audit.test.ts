import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildAuditFilter,
  matchesAuditFilter,
  formatAuditAction,
  formatEntityType,
  formatActor,
  formatScoreBreakdown,
  type AuditFilterCriteria,
} from "@/lib/audit-filters";
import {
  fetchAIInsights,
  AIInsightsUnavailableError,
} from "@/app/dashboard/admin/insights/ai-insights-adapter";
import { calculateGini, calculateFairnessScore } from "@/lib/kpis";
import type { AuditLogEntry } from "@/lib/types";

describe("Audit Filter Query Building & In-Memory Matching", () => {
  it("builds AuditFilterCriteria safely from searchParams object", () => {
    const rawParams = {
      actor: "  student-01  ",
      action: "booking_created",
      entity_type: "booking",
      entity_id: "book-1234",
      start_date: "2026-10-01",
      end_date: "2026-10-31",
      cursor: "entry-999",
      limit: "50",
    };

    const criteria = buildAuditFilter(rawParams);

    expect(criteria.actor).toBe("student-01");
    expect(criteria.action).toBe("booking_created");
    expect(criteria.entity_type).toBe("booking");
    expect(criteria.entity_id).toBe("book-1234");
    expect(criteria.date_from).toBe("2026-10-01");
    expect(criteria.date_to).toBe("2026-10-31");
    expect(criteria.cursor).toBe("entry-999");
    expect(criteria.limit).toBe(50);
  });

  it("handles array parameters and clamps limits gracefully", () => {
    const criteriaWithArray = buildAuditFilter({
      actor: ["admin@utilix.edu", "ignored"],
      limit: "999",
    });
    expect(criteriaWithArray.actor).toBe("admin@utilix.edu");
    expect(criteriaWithArray.limit).toBe(100); // clamped to max 100

    const criteriaWithNegative = buildAuditFilter({
      limit: "-5",
    });
    expect(criteriaWithNegative.limit).toBe(1); // clamped to min 1
  });

  it("filters entries accurately by actor, action, and entity_id", () => {
    const mockEntry: AuditLogEntry = {
      id: "log-1",
      actor_id: "user-alpha@campus.edu",
      action: "booking_created",
      entity_type: "booking",
      entity_id: "book-abc-123",
      rule_version: "v1",
      scores: { usage: 0.8, need: 0.9, total: 0.85 },
      reason: "Allocated according to fair priority scoring",
      created_at: "2026-10-25T14:00:00.000Z",
    };

    // Match actor substring case-insensitively
    expect(
      matchesAuditFilter(mockEntry, { actor: "user-alpha" })
    ).toBe(true);
    expect(
      matchesAuditFilter(mockEntry, { actor: "USER-ALPHA" })
    ).toBe(true);
    expect(
      matchesAuditFilter(mockEntry, { actor: "user-beta" })
    ).toBe(false);

    // Match action exactly
    expect(
      matchesAuditFilter(mockEntry, { action: "booking_created" })
    ).toBe(true);
    expect(
      matchesAuditFilter(mockEntry, { action: "booking_cancelled" })
    ).toBe(false);

    // Match entity ID exactly
    expect(
      matchesAuditFilter(mockEntry, { entity_id: "book-abc-123" })
    ).toBe(true);
    expect(
      matchesAuditFilter(mockEntry, { entity_id: "book-other" })
    ).toBe(false);

    // Match entity type case-insensitively
    expect(
      matchesAuditFilter(mockEntry, { entity_type: "BOOKING" })
    ).toBe(true);
    expect(
      matchesAuditFilter(mockEntry, { entity_type: "resource" })
    ).toBe(false);
  });

  it("evaluates date range filters including end-of-day expansion", () => {
    const entryInWindow: AuditLogEntry = {
      id: "log-2",
      actor_id: "system",
      action: "policy_created",
      entity_type: "policy",
      entity_id: "v2",
      rule_version: "v2",
      scores: null,
      reason: "Policy updated",
      created_at: "2026-10-15T22:30:00.000Z",
    };

    // Inclusive date range
    expect(
      matchesAuditFilter(entryInWindow, {
        date_from: "2026-10-10",
        date_to: "2026-10-15",
      })
    ).toBe(true);

    // Outside date range before
    expect(
      matchesAuditFilter(entryInWindow, {
        date_from: "2026-10-16",
        date_to: "2026-10-20",
      })
    ).toBe(false);

    // Outside date range after
    expect(
      matchesAuditFilter(entryInWindow, {
        date_from: "2026-10-01",
        date_to: "2026-10-14",
      })
    ).toBe(false);
  });

  it("formats audit actions into plain-language display metadata", () => {
    const createdMeta = formatAuditAction("booking_created");
    expect(createdMeta.label).toBe("Booking Created");
    expect(createdMeta.category).toBe("booking");

    const policyMeta = formatAuditAction("policy_created");
    expect(policyMeta.label).toBe("Policy Activated");
    expect(policyMeta.category).toBe("policy");

    const unmappedMeta = formatAuditAction("custom_action_test");
    expect(unmappedMeta.label).toBe("Custom Action Test");
  });

  it("formats score breakdowns into structured human-readable metrics", () => {
    const breakdown = formatScoreBreakdown({
      usage: 0.85,
      waiting: 0.6,
      need: 0.75,
      total: 0.78,
    });

    expect(breakdown).toHaveLength(4);
    expect(breakdown.find((b) => b.key === "usage")?.label).toBe("Usage Balance");
    expect(breakdown.find((b) => b.key === "usage")?.value).toContain("85%");
    expect(breakdown.find((b) => b.key === "need")?.label).toBe("Declared Need");
  });
});

describe("AI Insights Adapter & Fallback Telemetry", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("handles AI service timeout by throwing AIInsightsUnavailableError", async () => {
    // Mock global fetch to abort with an AbortError
    vi.spyOn(global, "fetch").mockImplementation(() => {
      const error = new Error("The operation was aborted");
      error.name = "AbortError";
      return Promise.reject(error);
    });

    await expect(fetchAIInsights({ timeoutMs: 100 })).rejects.toThrow(
      AIInsightsUnavailableError
    );
  });

  it("handles network connection refusal and throws AIInsightsUnavailableError", async () => {
    vi.spyOn(global, "fetch").mockImplementation(() => {
      return Promise.reject(new Error("fetch failed: ECONNREFUSED 127.0.0.1:8000"));
    });

    await expect(fetchAIInsights()).rejects.toThrow(AIInsightsUnavailableError);
  });

  it("returns parsed AI telemetry when service responds 200 OK", async () => {
    const mockApiResponse = {
      equipmentUtilization: { "res-3d-printer-1": 0.88 },
      contentionRate: { "res-3d-printer-1": 3.4 },
      giniCoefficient: 0.2345,
      jainFairnessIndex: 0.9234,
      recommendations: [
        {
          resource: "3D Printer Lab",
          action: "Increase credit cost to reduce 3.4x contention",
          urgency: "HIGH",
        },
      ],
      narrative: ["Fairness preserved."],
    };

    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockApiResponse,
    } as Response);

    const result = await fetchAIInsights();
    expect(result.giniCoefficient).toBe(0.2345);
    expect(result.jainFairnessIndex).toBe(0.9234);
    expect(result.equipmentUtilization["res-3d-printer-1"]).toBe(0.88);
    expect(result.recommendations).toHaveLength(1);
  });
});

describe("Fairness Telemetry & Gini Metric Parity Verification", () => {
  it("verifies mathematical parity between TypeScript Gini and FastAPI Python implementation", () => {
    // Python calculation from ai-service/app/routers/insights.py:
    // department_allocations = [42.0, 38.0, 15.0, 29.0, 31.0]
    // def calculate_gini(values: List[float]) -> float:
    //     numerator = sum((2 * (i + 1) - n - 1) * val for i, val in enumerate(sorted_vals))
    //     return round(numerator / (n * total), 4)
    const testAllocations = [42.0, 38.0, 15.0, 29.0, 31.0];

    // Python test run:
    // sorted = [15.0, 29.0, 31.0, 38.0, 42.0]
    // n = 5, total = 155.0
    // i=0: (2*1 - 5 - 1)*15 = -4 * 15 = -60
    // i=1: (2*2 - 5 - 1)*29 = -2 * 29 = -58
    // i=2: (2*3 - 5 - 1)*31 =  0 * 31 =   0
    // i=3: (2*4 - 5 - 1)*38 =  2 * 38 =  76
    // i=4: (2*5 - 5 - 1)*42 =  4 * 42 = 168
    // numerator = -60 - 58 + 0 + 76 + 168 = 126
    // Gini = 126 / (5 * 155) = 126 / 775 = 0.16258... -> 0.1626
    const tsGini = calculateGini(testAllocations);
    expect(tsGini).toBe(0.1626);

    const fairness = calculateFairnessScore(testAllocations);
    expect(fairness.gini).toBe(0.1626);
    expect(fairness.score).toBe(83.7);
    expect(fairness.label).toBe("Very even");
  });

  it("handles edge cases in Gini calculation consistently (empty or zero sums)", () => {
    expect(calculateGini([])).toBe(0.0);
    expect(calculateGini([0, 0, 0])).toBe(0.0);
    expect(calculateGini([10])).toBe(0.0);
    expect(calculateGini([10, 10, 10, 10])).toBe(0.0);
  });
});
