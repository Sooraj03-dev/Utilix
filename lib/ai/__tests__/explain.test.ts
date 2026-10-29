import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearExplanationCache, explainRanking } from "../explain.js";
import * as llmModule from "../llm.js";
import type { RankedRequest, TieBreakInfo } from "../types.js";

const mockTieBreak: TieBreakInfo = {
  used: false,
  order: ["fewestSessionsThisMonth", "earliestRequest", "seededLottery"],
  seed: null,
  tiedRequestIds: [],
  decidedBy: null,
};

const baseRanking: RankedRequest[] = [
  {
    requestId: "req-1",
    rank: 1,
    score: 0.85,
    components: { usage: 1.0, waiting: 0.5, need: 0.0, diversity: 0.0 },
    decision: "allocated",
    creditCharge: 0,
    requiresCoordinatorApproval: false,
    waitlistPosition: null,
    studentReason: "Fallback allocated text",
    coordinatorSummary: "Fallback summary",
    counterfactual: null,
  },
  {
    requestId: "req-2",
    rank: 2,
    score: 0.45,
    components: { usage: 0.5, waiting: 0.2, need: 0.0, diversity: 0.0 },
    decision: "waitlisted",
    creditCharge: 0,
    requiresCoordinatorApproval: false,
    waitlistPosition: 1,
    studentReason: "Fallback waitlist text",
    coordinatorSummary: "Fallback waitlist summary",
    counterfactual: "If you had used 2 fewer sessions...",
  },
];

describe("explain.ts fallback & validation", () => {
  beforeEach(() => {
    clearExplanationCache();
    vi.restoreAllMocks();
  });

  it("returns fallback without calling LLM when provider is none or key is missing", async () => {
    const res = await explainRanking(baseRanking, "3D Printer", mockTieBreak, {
      provider: "none",
    });
    expect(res.source).toBe("fallback");
    expect(res.llm.attempted).toBe(false);
    expect(res.ranking[0].studentReason).toBe("Fallback allocated text");
  });

  it("falls back to templates when LLM returns invalid JSON", async () => {
    vi.spyOn(llmModule, "callLLM").mockResolvedValueOnce({
      success: true,
      text: "Not JSON at all!",
      provider: "gemini",
    });

    const res = await explainRanking(baseRanking, "3D Printer", mockTieBreak, {
      provider: "gemini",
      apiKey: "fake-key",
    });

    expect(res.source).toBe("fallback");
    expect(res.llm.attempted).toBe(true);
    expect(res.llm.errorCode).toBe("INVALID_JSON");
    expect(res.ranking[0].studentReason).toBe("Fallback allocated text");
  });

  it("rejects LLM text that contradicts the computed decision", async () => {
    // req-2 is waitlisted, but LLM claims booking confirmed
    const contradictoryResponse = JSON.stringify({
      explanations: [
        {
          requestId: "req-1",
          studentReason: "Slot confirmed.",
          coordinatorSummary: "Allocated req-1.",
        },
        {
          requestId: "req-2",
          studentReason: "Your booking confirmed for the slot!", // contradiction!
          coordinatorSummary: "Allocated req-2.",
        },
      ],
    });

    vi.spyOn(llmModule, "callLLM").mockResolvedValueOnce({
      success: true,
      text: contradictoryResponse,
      provider: "gemini",
    });

    const res = await explainRanking(baseRanking, "3D Printer", mockTieBreak, {
      provider: "gemini",
      apiKey: "fake-key",
    });

    // req-1 is accepted, req-2 contradiction is rejected and keeps fallback
    expect(res.ranking[0].studentReason).toBe("Slot confirmed.");
    expect(res.ranking[1].studentReason).toBe("Fallback waitlist text");
  });

  it("accepts valid LLM explanations and upgrades source to ai", async () => {
    const validResponse = JSON.stringify({
      explanations: [
        {
          requestId: "req-1",
          studentReason: "Great news, your slot is confirmed!",
          coordinatorSummary: "Allocated based on usage.",
        },
        {
          requestId: "req-2",
          studentReason: "You are #1 on the waitlist.",
          coordinatorSummary: "Waitlisted position 1.",
        },
      ],
    });

    vi.spyOn(llmModule, "callLLM").mockResolvedValueOnce({
      success: true,
      text: validResponse,
      provider: "gemini",
    });

    const res = await explainRanking(baseRanking, "3D Printer", mockTieBreak, {
      provider: "gemini",
      apiKey: "fake-key",
    });

    expect(res.source).toBe("ai");
    expect(res.llm.succeeded).toBe(true);
    expect(res.ranking[0].studentReason).toBe("Great news, your slot is confirmed!");
    expect(res.ranking[1].studentReason).toBe("You are #1 on the waitlist.");
  });
});
