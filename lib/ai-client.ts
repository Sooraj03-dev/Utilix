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

function mockDelay(ms: number = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockAIClient implements AIClient {
  async healthCheck() {
    await mockDelay(50);
    return {
      ok: true,
      service: "ai-service-fallback",
      llmProvider: "deterministic-fallback",
    };
  }

  async allocate(request: AIAllocateRequest): Promise<AIAllocateResponse> {
    await mockDelay(150);

    const ranked: AIRankingItem[] = request.requests.map((req, i) => ({
      requestId: req.id,
      userId: req.userId,
      rank: i + 1,
      totalScore: Number(Math.max(0.2, 1 - i * 0.15).toFixed(4)),
      scoreBreakdown: {
        usage: Number(Math.max(0.1, 0.9 - (req.sessionsThisMonth ?? 0) * 0.1).toFixed(4)),
        waiting: Number(Math.min(1, 0.2 + (req.waitingHours ?? 0) * 0.05).toFixed(4)),
        need: Number(((req.projectNeedScore ?? 5) / 10).toFixed(4)),
        diversity: req.isPriorityGroup ? 0.9 : 0.4,
      },
      studentReason:
        i === 0
          ? "Your request was prioritised based on fair-usage balance and project need."
          : `Contention queue position #${i + 1}. Consider alternative time slots for faster access.`,
      coordinatorSummary: `Ranked #${i + 1} by fairness scoring heuristics.`,
      decidedBy: "scoring",
      tiedWith: [],
      explanationSource: "fallback",
    }));

    const capacity = request.slot.capacity ?? 1;
    return {
      allocated: ranked.slice(0, capacity),
      waitlist: ranked.slice(capacity),
      excluded: [],
      audit: {
        totalRequests: request.requests.length,
        eligibleRequests: request.requests.length,
        excludedRequests: 0,
        capacity,
        policyUsed: request.policy ?? {},
        tieBreakInfo: {
          tiedGroupsCount: 0,
          totalTiedRequests: 0,
          tiesDecided: [],
          seedUsed: request.seed ?? "utilix",
        },
        executionTimeMs: 15,
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
      return await this.request<AIAllocateResponse>("/allocate", request);
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
