// Utilix — Local AI Insights Adapter
// Owner: A
// NOTE: This is a thin local adapter for Owner B's AI service client.
// Once Owner B adds `aiClient.insights()` in /lib/ai-client.ts,
// this file should be replaced by the official client export.

import type { AIInsightsResponse } from "@/lib/types";

export class AIInsightsUnavailableError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "AIInsightsUnavailableError";
  }
}

export interface FetchInsightsOptions {
  timeoutMs?: number;
  demo?: boolean;
}

/**
 * Calls the FastAPI AI service insights endpoint on the server.
 * Adheres to strict timeout constraints to ensure the admin page never blocks.
 */
export async function fetchAIInsights(
  options: FetchInsightsOptions = {}
): Promise<AIInsightsResponse> {
  const timeoutMs = options.timeoutMs ?? 2500;
  const baseUrl = (
    process.env.AI_SERVICE_URL || "http://localhost:8000"
  ).replace(/\/$/, "");
  const secret =
    process.env.AI_SERVICE_SECRET || process.env.SERVICE_SECRET || "";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (secret && secret !== "change-me") {
    headers["X-Service-Secret"] = secret;
    headers["X-AI-Secret"] = secret;
    headers["Authorization"] = `Bearer ${secret}`;
  }

  try {
    // Try /insights first, then fallback to /ai/insights
    let res: Response | null = null;
    let lastErr: Error | null = null;

    for (const path of ["/insights", "/ai/insights"]) {
      try {
        const candidateRes = await fetch(`${baseUrl}${path}?demo=true`, {
          method: "GET",
          headers,
          signal: controller.signal,
          cache: "no-store",
        });

        if (candidateRes.ok) {
          res = candidateRes;
          break;
        } else if (candidateRes.status !== 404) {
          // If 401 or 500, record error
          const errText = await candidateRes.text().catch(() => "");
          throw new AIInsightsUnavailableError(
            `AI service returned status ${candidateRes.status}: ${errText}`,
            candidateRes.status
          );
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          throw new AIInsightsUnavailableError(
            `AI service insights timed out after ${timeoutMs}ms`
          );
        }
        if (err instanceof AIInsightsUnavailableError) {
          throw err;
        }
        lastErr = err instanceof Error ? err : new Error(String(err));
      }
    }

    if (!res) {
      throw (
        lastErr ||
        new AIInsightsUnavailableError("AI insights service unreachable or endpoint not found")
      );
    }

    const data = (await res.json()) as AIInsightsResponse;
    return data;
  } catch (err: unknown) {
    if (err instanceof AIInsightsUnavailableError) {
      throw err;
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new AIInsightsUnavailableError(
        `AI service request timed out after ${timeoutMs}ms`
      );
    }
    throw new AIInsightsUnavailableError(
      err instanceof Error
        ? err.message
        : "Failed to connect to the Utilix AI service"
    );
  } finally {
    clearTimeout(timer);
  }
}
