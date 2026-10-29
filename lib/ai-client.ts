/* ═══════════════════════════════════════════════════════════════════════════
 * AI Service Client — Owner B
 *
 * Client for communicating with the AI/ML teammate's FastAPI service:
 * - POST /allocate: Deterministic fair allocation engine
 * - POST /alternatives: Smart alternative slot recommendations
 * - POST /bundle: Multi-resource synchronous bundle scheduling
 * - GET /health: Health check endpoint
 *
 * Rules:
 * - AI recommendations NEVER override availability, security, authorization,
 *   or database invariants.
 * - If the AI service fails or is unreachable, fallback to deterministic
 *   heuristics with `explanationSource: "fallback"`.
 * ═══════════════════════════════════════════════════════════════════════════ */

import type {
  AISlot,
  AIAllocateRequest,
  AIAllocateResponse,
  AIRankingItem,
  AIAlternativesRequest,
  AIAlternativesResponse,
  AIBundleRequest,
  AIBundleResponse,
} from "@/lib/types";

// Re-export shared types for callers
export type {
  AISlot,
  AIAllocateRequest,
  AIAllocateResponse,
  AIRankingItem,
  AIAlternativesRequest,
  AIAlternativesResponse,
  AIBundleRequest,
  AIBundleResponse,
};

// ─── Client Interface ────────────────────────────────────────────────────

export interface AIClient {
  /** Check if the AI service is reachable */
  healthCheck(): Promise<{ ok: boolean; service: string; llmProvider?: string }>;

  /** Request allocation ranking for competing requests on a slot */
  allocate(request: AIAllocateRequest): Promise<AIAllocateResponse>;

  /** Get alternative slot suggestions for a user */
  getAlternatives(request: AIAlternativesRequest): Promise<AIAlternativesResponse>;

  /** Schedule multi-resource bundle */
  bundle(request: AIBundleRequest): Promise<AIBundleResponse>;
}

// ─── Custom Errors ───────────────────────────────────────────────────────

export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly code: string = "AI_SERVICE_ERROR",
  ) {
    super(message);
    this.name = "AIServiceError";
  }
}

export class AIServiceTimeoutError extends AIServiceError {
  constructor(timeoutMs: number) {
    super(`AI service request timed out after ${timeoutMs}ms`, 504, "AI_TIMEOUT");
    this.name = "AIServiceTimeoutError";
  }
}

// ─── Mock / Fallback Implementation ──────────────────────────────────────

function mockDelay(ms: number = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stableHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export class MockAIClient implements AIClient {
  async healthCheck() {
    await mockDelay(20);
    return {
      ok: true,
      service: "ai-service-fallback",
      llmProvider: "deterministic-fallback",
    };
  }

  async allocate(request: AIAllocateRequest): Promise<AIAllocateResponse> {
    await mockDelay(30);

    const rawWeights = (request.policy?.weights || {}) as Record<string, number | undefined>;
    const weights = {
      usage: rawWeights.usage ?? rawWeights.usage_fairness ?? 0.35,
      waiting: rawWeights.waiting ?? rawWeights.waiting_time ?? 0.25,
      need: rawWeights.need ?? rawWeights.declared_need ?? 0.20,
      diversity: rawWeights.diversity ?? rawWeights.interdisciplinary_bonus ?? 0.20,
    };
    const seed = request.seed ?? request.policy?.seed ?? "utilix";
    const epsilon = request.policy?.epsilon ?? 0.0001;

    // 1. Filter hard constraints
    const eligible: typeof request.requests = [];
    const excluded: AIAllocateResponse["excluded"] = [];

    for (const req of request.requests) {
      if (req.resourceAvailable === false) {
        excluded.push({
          requestId: req.id,
          userId: req.userId,
          reason: "Resource is unavailable or undergoing maintenance.",
          code: "RESOURCE_UNAVAILABLE",
        });
        continue;
      }
      if (req.trainingVerified === false) {
        excluded.push({
          requestId: req.id,
          userId: req.userId,
          reason: "Mandatory equipment training is not verified for this resource.",
          code: "TRAINING_MISSING",
        });
        continue;
      }
      if (req.withinBookingLimit === false) {
        excluded.push({
          requestId: req.id,
          userId: req.userId,
          reason: "User has reached the maximum allowed concurrent active bookings.",
          code: "BOOKING_LIMIT_REACHED",
        });
        continue;
      }
      if (req.noOverlap === false) {
        excluded.push({
          requestId: req.id,
          userId: req.userId,
          reason: "Conflicting overlapping reservation found for user.",
          code: "OVERLAPPING_BOOKING",
        });
        continue;
      }
      eligible.push(req);
    }

    // 2. Score eligible requests
    interface ScoredItem {
      req: typeof request.requests[number];
      usageScore: number;
      waitingScore: number;
      needScore: number;
      diversityScore: number;
      totalScore: number;
      decidedBy: "scoring" | "tiebreak";
    }

    const scored: ScoredItem[] = eligible.map((req) => {
      const sessions = req.sessionsThisMonth ?? 0;
      const waitingHours = req.waitingHours ?? 0;
      const need = req.projectNeedScore ?? 5.0;
      const isPriority = req.isPriorityGroup ?? false;

      const usageScore = Number(Math.max(0, 1.0 - Math.min(sessions, 10) / 10.0).toFixed(4));
      const waitingScore = Number(Math.min(1.0, waitingHours / 48.0).toFixed(4));
      const needScore = Number(Math.min(1.0, Math.max(0, need / 10.0)).toFixed(4));
      const diversityScore = isPriority ? 1.0 : 0.5;

      const totalScore = Number(
        (
          weights.usage * usageScore +
          weights.waiting * waitingScore +
          weights.need * needScore +
          weights.diversity * diversityScore
        ).toFixed(4),
      );

      return {
        req,
        usageScore,
        waitingScore,
        needScore,
        diversityScore,
        totalScore,
        decidedBy: "scoring",
      };
    });

    // 3. Deterministic Sorting with Tiebreakers
    scored.sort((a, b) => {
      const diff = b.totalScore - a.totalScore;
      if (Math.abs(diff) > epsilon) {
        return diff;
      }

      // Tiebreaker 1: Fewest sessions this month
      const aSessions = a.req.sessionsThisMonth ?? 0;
      const bSessions = b.req.sessionsThisMonth ?? 0;
      if (aSessions !== bSessions) {
        a.decidedBy = "tiebreak";
        b.decidedBy = "tiebreak";
        return aSessions - bSessions;
      }

      // Tiebreaker 2: Earliest submission time
      const aTime = new Date(a.req.submittedAt).getTime();
      const bTime = new Date(b.req.submittedAt).getTime();
      if (!isNaN(aTime) && !isNaN(bTime) && aTime !== bTime) {
        a.decidedBy = "tiebreak";
        b.decidedBy = "tiebreak";
        return aTime - bTime;
      }

      // Tiebreaker 3: Seeded deterministic hash
      a.decidedBy = "tiebreak";
      b.decidedBy = "tiebreak";
      return stableHash(`${seed}_${a.req.id}`) - stableHash(`${seed}_${b.req.id}`);
    });

    // 4. Construct Ranking Items
    const capacity = request.slot.capacity ?? 1;
    const ranked: AIRankingItem[] = scored.map((item, idx) => {
      const rank = idx + 1;
      const isWinner = rank <= capacity;

      const studentReason = isWinner
        ? `Request awarded slot (Rank #${rank}): Strong fairness score (${item.totalScore}) with ${item.req.sessionsThisMonth ?? 0} prior sessions and ${item.req.waitingHours ?? 0}h waiting time.`
        : `Placed on waitlist (Position #${rank - capacity}): Contention resolved by fair usage policy. Lower prior sessions or alternative slots recommended.`;

      const coordinatorSummary = `Rank #${rank} (Score: ${item.totalScore}) — Usage: ${item.usageScore}, Waiting: ${item.waitingScore}, Need: ${item.needScore}, Diversity: ${item.diversityScore}. Decided by ${item.decidedBy}.`;

      return {
        requestId: item.req.id,
        userId: item.req.userId,
        rank,
        totalScore: item.totalScore,
        scoreBreakdown: {
          usage: item.usageScore,
          waiting: item.waitingScore,
          need: item.needScore,
          diversity: item.diversityScore,
        },
        studentReason,
        coordinatorSummary,
        decidedBy: item.decidedBy,
        tiedWith: [],
        explanationSource: "fallback",
      };
    });

    return {
      allocated: ranked.slice(0, capacity),
      waitlist: ranked.slice(capacity),
      excluded,
      audit: {
        totalRequests: request.requests.length,
        eligibleRequests: eligible.length,
        excludedRequests: excluded.length,
        capacity,
        policyUsed: request.policy ?? {},
        tieBreakInfo: {
          tiedGroupsCount: scored.some((s) => s.decidedBy === "tiebreak") ? 1 : 0,
          totalTiedRequests: scored.filter((s) => s.decidedBy === "tiebreak").length,
          tiesDecided: [],
          seedUsed: seed,
        },
        executionTimeMs: 12,
      },
    };
  }

  async getAlternatives(
    request: AIAlternativesRequest,
  ): Promise<AIAlternativesResponse> {
    await mockDelay(100);

    const target = request.requestedSlot;
    const limit = request.limit ?? 3;

    // Filter available slots that are not the target
    const candidates = request.availableSlots.filter((s) => s.id !== target.id);

    return {
      alternatives: candidates.slice(0, limit).map((slot, i) => ({
        slot,
        scoreDiff: Number((0.05 * (i + 1)).toFixed(3)),
        reason: `Alternative slot on ${slot.resourceName} with lower contention`,
      })),
    };
  }

  async bundle(request: AIBundleRequest): Promise<AIBundleResponse> {
    await mockDelay(100);

    const bundleSlots: AISlot[] = [];
    for (const resId of request.resourceIds) {
      const slots = request.slotsByResource[resId] ?? [];
      if (slots.length > 0) {
        bundleSlots.push(slots[0]);
      }
    }

    return {
      bundleSlots,
      isComplete: bundleSlots.length === request.resourceIds.length,
      reason:
        bundleSlots.length === request.resourceIds.length
          ? "Synchronous bundle schedule identified."
          : "Could not find overlapping slots for all requested resources.",
    };
  }
}

// ─── Real HTTP FastAPI Client ────────────────────────────────────────────

export class HttpAIClient implements AIClient {
  private baseUrl: string;
  private secret: string;
  private timeoutMs: number;
  private fallback: MockAIClient;

  constructor() {
    this.baseUrl = (process.env.AI_SERVICE_URL ?? "http://localhost:8000").replace(/\/$/, "");
    this.secret = process.env.AI_SERVICE_SECRET ?? "";
    this.timeoutMs = parseInt(process.env.AI_SERVICE_TIMEOUT_MS ?? "6000", 10);
    this.fallback = new MockAIClient();
  }

  private async request<T>(path: string, body?: unknown, method: string = "POST"): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (this.secret && this.secret !== "change-me") {
        headers["X-AI-Secret"] = this.secret;
        headers["Authorization"] = `Bearer ${this.secret}`;
      }

      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new AIServiceError(
          `AI service HTTP ${res.status}: ${errText || res.statusText}`,
          res.status,
        );
      }

      return (await res.json()) as T;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new AIServiceTimeoutError(this.timeoutMs);
      }
      if (err instanceof AIServiceError) {
        throw err;
      }
      throw new AIServiceError(
        err instanceof Error ? err.message : "Network error contacting AI service",
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async healthCheck() {
    try {
      const data = await this.request<{
        status: string;
        service: string;
        llmProvider: string;
      }>("/health", undefined, "GET");
      return {
        ok: data.status === "healthy",
        service: data.service,
        llmProvider: data.llmProvider,
      };
    } catch {
      return {
        ok: false,
        service: "unreachable",
      };
    }
  }

  async allocate(request: AIAllocateRequest): Promise<AIAllocateResponse> {
    try {
      const result = await this.request<AIAllocateResponse>("/allocate", request);
      return {
        ...result,
        allocated: result.allocated.map((item) => ({
          ...item,
          explanationSource: item.explanationSource ?? "ai",
        })),
        waitlist: result.waitlist.map((item) => ({
          ...item,
          explanationSource: item.explanationSource ?? "ai",
        })),
      };
    } catch (err) {
      console.warn("[AIClient] /allocate call failed, using deterministic fallback:", err);
      return this.fallback.allocate(request);
    }
  }

  async getAlternatives(
    request: AIAlternativesRequest,
  ): Promise<AIAlternativesResponse> {
    try {
      return await this.request<AIAlternativesResponse>("/alternatives", request);
    } catch (err) {
      console.warn("[AIClient] /alternatives call failed, using fallback:", err);
      return this.fallback.getAlternatives(request);
    }
  }

  async bundle(request: AIBundleRequest): Promise<AIBundleResponse> {
    try {
      return await this.request<AIBundleResponse>("/bundle", request);
    } catch (err) {
      console.warn("[AIClient] /bundle call failed, using fallback:", err);
      return this.fallback.bundle(request);
    }
  }
}

// ─── Export ──────────────────────────────────────────────────────────────

export const aiClient: AIClient = new HttpAIClient();
