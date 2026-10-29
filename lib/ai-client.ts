/* ═══════════════════════════════════════════════════════════════════════════
 * AI Service Client — Owner B
 *
 * Typed interface for communicating with the AI/ML teammate's FastAPI
 * allocation engine. Uses a mock adapter until the real endpoint is
 * available.
 *
 * ⚠️  MOCK ADAPTER ACTIVE — All responses are fabricated. The mock adapter
 *     simulates latency and returns plausible but hard-coded results.
 *     Replace with the real HTTP adapter when the AI teammate provides
 *     the FastAPI endpoint URL and confirms the request/response contract.
 *
 * To swap:
 *   1. Set AI_SERVICE_URL and AI_SERVICE_SECRET in .env.local
 *   2. Change the export at the bottom to use `HttpAIClient`
 * ═══════════════════════════════════════════════════════════════════════════ */

// ─── Types (mirroring ai-service/app/schemas.py) ─────────────────────────

export interface AIScoreBreakdown {
  usage: number;
  waiting: number;
  need: number;
  diversity: number;
}

export interface AIRankingItem {
  requestId: string;
  userId: string;
  rank: number;
  totalScore: number;
  scoreBreakdown: AIScoreBreakdown;
  studentReason: string;
  coordinatorSummary: string;
  decidedBy?: string;
  tiedWith: string[];
  explanationSource?: string;
}

export interface AIExcludedItem {
  requestId: string;
  userId: string;
  reason: string;
  code: string;
}

export interface AIAllocateRequest {
  slot: {
    id: string;
    resourceId: string;
    resourceName: string;
    department: string;
    startTime: string;
    endTime: string;
    capacity: number;
  };
  requests: {
    id: string;
    userId: string;
    userName: string;
    department: string;
    requestedSlotId: string;
    sessionsThisMonth: number;
    waitingHours: number;
    projectNeedScore: number;
    isPriorityGroup: boolean;
    trainingVerified: boolean;
    withinBookingLimit: boolean;
    noOverlap: boolean;
    resourceAvailable: boolean;
    currentCreditBalance: number;
    freeSessionsLeft: number;
    submittedAt: string;
  }[];
}

export interface AIAllocateResponse {
  allocated: AIRankingItem[];
  waitlist: AIRankingItem[];
  excluded: AIExcludedItem[];
  audit: {
    totalRequests: number;
    eligibleRequests: number;
    excludedRequests: number;
    capacity: number;
    executionTimeMs: number;
  };
}

export interface AIAlternativeOption {
  slot: {
    id: string;
    resourceId: string;
    resourceName: string;
    startTime: string;
    endTime: string;
  };
  scoreDiff: number;
  reason: string;
}

export interface AIAlternativesResponse {
  alternatives: AIAlternativeOption[];
}

// ─── Client Interface ────────────────────────────────────────────────────

export interface AIClient {
  /** Check if the AI service is reachable */
  healthCheck(): Promise<{ ok: boolean; service: string }>;

  /** Request allocation ranking for competing requests on a slot */
  allocate(request: AIAllocateRequest): Promise<AIAllocateResponse>;

  /** Get alternative slot suggestions for a user */
  getAlternatives(
    resourceId: string,
    slotId: string,
    userId: string,
    department: string,
  ): Promise<AIAlternativesResponse>;
}

// ─── Mock Implementation ─────────────────────────────────────────────────

/** Simulate network latency */
function mockDelay(ms: number = 600): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockAIClient implements AIClient {
  async healthCheck() {
    await mockDelay(100);
    return {
      ok: true,
      service: "ai-service-mock",
    };
  }

  async allocate(request: AIAllocateRequest): Promise<AIAllocateResponse> {
    await mockDelay(800);

    const ranked: AIRankingItem[] = request.requests.map((req, i) => ({
      requestId: req.id,
      userId: req.userId,
      rank: i + 1,
      totalScore: Math.max(0.3, 1 - i * 0.15),
      scoreBreakdown: {
        usage: Math.max(0.1, 0.9 - i * 0.1),
        waiting: Math.min(1, 0.3 + i * 0.1),
        need: 0.6,
        diversity: 0.5,
      },
      studentReason:
        i === 0
          ? "Your request was prioritised based on fair-usage balance and project need."
          : `You are #${i + 1} in the queue. Consider alternative time slots for faster access.`,
      coordinatorSummary: `Ranked #${i + 1} by composite fairness score.`,
      decidedBy: "scoring",
      tiedWith: [],
      explanationSource: "mock",
    }));

    const capacity = request.slot.capacity;
    return {
      allocated: ranked.slice(0, capacity),
      waitlist: ranked.slice(capacity),
      excluded: [],
      audit: {
        totalRequests: request.requests.length,
        eligibleRequests: request.requests.length,
        excludedRequests: 0,
        capacity,
        executionTimeMs: 42,
      },
    };
  }

  async getAlternatives(
    resourceId: string,
    _slotId: string,
    _userId: string,
    _department: string,
  ): Promise<AIAlternativesResponse> {
    await mockDelay(500);

    return {
      alternatives: [
        {
          slot: {
            id: `slot-${resourceId}-alt-1`,
            resourceId,
            resourceName: "Same resource",
            startTime: "10:00",
            endTime: "12:00",
          },
          scoreDiff: 0.15,
          reason: "Morning slot with lower contention",
        },
        {
          slot: {
            id: `slot-${resourceId}-alt-2`,
            resourceId,
            resourceName: "Same resource",
            startTime: "16:00",
            endTime: "18:00",
          },
          scoreDiff: 0.08,
          reason: "Late afternoon slot, typically available",
        },
      ],
    };
  }
}

// ─── HTTP Implementation (for when AI service is ready) ──────────────────

export class HttpAIClient implements AIClient {
  private baseUrl: string;
  private secret: string;
  private timeoutMs: number;

  constructor() {
    this.baseUrl = process.env.AI_SERVICE_URL ?? "http://localhost:8000";
    this.secret = process.env.AI_SERVICE_SECRET ?? "";
    this.timeoutMs = parseInt(
      process.env.AI_SERVICE_TIMEOUT_MS ?? "6000",
      10,
    );
  }

  private async request<T>(path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: body ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.secret}`,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`AI service error: ${res.status} ${res.statusText}`);
      }

      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  async healthCheck() {
    return this.request<{ ok: boolean; service: string }>("/health");
  }

  async allocate(request: AIAllocateRequest) {
    return this.request<AIAllocateResponse>("/allocate", request);
  }

  async getAlternatives(
    resourceId: string,
    slotId: string,
    userId: string,
    department: string,
  ) {
    return this.request<AIAlternativesResponse>("/alternatives", {
      requestedSlot: { id: slotId, resourceId },
      availableSlots: [],
      userRequest: { id: "temp", userId, department, requestedSlotId: slotId },
      limit: 3,
    });
  }
}

// ─── Export ──────────────────────────────────────────────────────────────
// TODO: Switch to HttpAIClient when AI teammate confirms the endpoint.
//       const aiClient: AIClient = new HttpAIClient();

export const aiClient: AIClient = new MockAIClient();
