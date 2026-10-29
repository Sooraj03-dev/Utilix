import { z } from "zod";
import { callLLM, getLLMConfig, type LLMConfig } from "./llm.js";
import { hashString } from "./tiebreak.js";
import type { RankedRequest, TieBreakInfo } from "./types.js";

const ExplanationSchema = z.object({
  explanations: z.array(
    z.object({
      requestId: z.string(),
      studentReason: z.string().min(1),
      coordinatorSummary: z.string().min(1),
    })
  ),
});

const SYSTEM_PROMPT =
  'You are the explanation writer for CampusShare, a campus equipment-sharing platform. You do NOT make allocation decisions: decisions, ranks and scores are final and already computed. Explain each decision in plain, friendly, respectful English for the student, and write a one-line summary for the coordinator. Rules: never change or contradict a decision; use only facts present in the input; never reveal another user\'s identity, refer to \'another team\'; if a tie-breaker was used, say so plainly; if the decision is a waitlist, say the position and what could change it; studentReason max 60 words; coordinatorSummary max 25 words. Return ONLY JSON: {"explanations":[{"requestId":string,"studentReason":string,"coordinatorSummary":string}]} with no markdown.';

// In-memory cache for repeated demo calls
const explanationCache = new Map<string, Array<{ requestId: string; studentReason: string; coordinatorSummary: string }>>();

export function clearExplanationCache(): void {
  explanationCache.clear();
}

function countWords(str: string): number {
  return str.trim().split(/\s+/).filter(Boolean).length;
}

function contradictsDecision(decision: "allocated" | "waitlisted", text: string): boolean {
  const lower = text.toLowerCase();
  if (decision === "waitlisted") {
    return (
      lower.includes("you are confirmed") ||
      lower.includes("booking confirmed") ||
      lower.includes("your slot is allocated") ||
      lower.includes("successfully booked")
    );
  }
  if (decision === "allocated") {
    return lower.includes("you are waitlisted") || lower.includes("on the waitlist");
  }
  return false;
}

export async function explainRanking(
  ranking: RankedRequest[],
  resourceName: string,
  tieBreak: TieBreakInfo,
  customConfig?: Partial<LLMConfig>
): Promise<{
  ranking: RankedRequest[];
  source: "ai" | "fallback";
  llm: {
    attempted: boolean;
    succeeded: boolean;
    provider: string;
    errorCode: string | null;
  };
}> {
  const config = { ...getLLMConfig(), ...customConfig };
  const provider = config.provider;

  if (provider === "none" || !config.apiKey || ranking.length === 0) {
    return {
      ranking,
      source: "fallback",
      llm: {
        attempted: false,
        succeeded: false,
        provider,
        errorCode: provider === "none" ? "NO_PROVIDER" : "MISSING_API_KEY",
      },
    };
  }

  // Construct payload with facts only and privacy-preserving labels
  const facts = ranking.map((r) => ({
    requestId: r.requestId,
    decision: r.decision,
    rank: r.rank,
    score: r.score,
    components: r.components,
    waitlistPosition: r.waitlistPosition,
    requiresApproval: r.requiresCoordinatorApproval,
    tieBreakUsed: tieBreak.used,
    tieBreakDecidedBy: tieBreak.decidedBy,
    counterfactual: r.counterfactual,
  }));

  const cacheKey = `${resourceName}:${hashString(JSON.stringify(facts))}`;
  if (explanationCache.has(cacheKey)) {
    const cached = explanationCache.get(cacheKey)!;
    const merged = ranking.map((r) => {
      const match = cached.find((c) => c.requestId === r.requestId);
      return match
        ? { ...r, studentReason: match.studentReason, coordinatorSummary: match.coordinatorSummary }
        : r;
    });
    return {
      ranking: merged,
      source: "ai",
      llm: { attempted: false, succeeded: true, provider, errorCode: null },
    };
  }

  const userPrompt = JSON.stringify({ resource: resourceName, facts });
  const llmRes = await callLLM(SYSTEM_PROMPT, userPrompt, config);

  if (!llmRes.success || !llmRes.text) {
    return {
      ranking,
      source: "fallback",
      llm: {
        attempted: true,
        succeeded: false,
        provider: llmRes.provider,
        errorCode: llmRes.errorCode ?? "UNKNOWN_ERROR",
      },
    };
  }

  let parsedJson: unknown;
  try {
    const cleaned = llmRes.text.replace(/```json\s*/gi, "").replace(/```\s*$/g, "").trim();
    parsedJson = JSON.parse(cleaned);
  } catch {
    return {
      ranking,
      source: "fallback",
      llm: { attempted: true, succeeded: false, provider, errorCode: "INVALID_JSON" },
    };
  }

  const parseResult = ExplanationSchema.safeParse(parsedJson);
  if (!parseResult.success) {
    return {
      ranking,
      source: "fallback",
      llm: { attempted: true, succeeded: false, provider, errorCode: "SCHEMA_MISMATCH" },
    };
  }

  const explanations = parseResult.data.explanations;
  const expMap = new Map(explanations.map((e) => [e.requestId, e]));

  let anyReplaced = false;
  const updatedRanking = ranking.map((r) => {
    const exp = expMap.get(r.requestId);
    if (!exp) return r;

    // Check word limits
    if (countWords(exp.studentReason) > 60 || countWords(exp.coordinatorSummary) > 25) {
      return r;
    }

    // Check contradiction
    if (
      contradictsDecision(r.decision, exp.studentReason) ||
      contradictsDecision(r.decision, exp.coordinatorSummary)
    ) {
      return r;
    }

    anyReplaced = true;
    return {
      ...r,
      studentReason: exp.studentReason,
      coordinatorSummary: exp.coordinatorSummary,
    };
  });

  if (anyReplaced) {
    explanationCache.set(cacheKey, explanations);
  }

  return {
    ranking: updatedRanking,
    source: anyReplaced ? "ai" : "fallback",
    llm: {
      attempted: true,
      succeeded: anyReplaced,
      provider,
      errorCode: anyReplaced ? null : "VALIDATION_REJECTED",
    },
  };
}
