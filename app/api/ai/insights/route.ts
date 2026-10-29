import fs from "node:fs";
import path from "node:path";
import {
  errorResponse,
  generateInsights,
  getLLMConfig,
  InsightsRequestSchema,
  okResponse,
  parseJsonRequest,
} from "../../../../lib/ai/index.js";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const isDemo = url.searchParams.get("demo") === "1";

  if (!isDemo) {
    return errorResponse("BAD_REQUEST", "Use POST for insights or GET with ?demo=1", undefined, 400);
  }

  try {
    const fixturePath = path.resolve(process.cwd(), "lib/ai/fixtures/insights-stats.json");
    const raw = fs.readFileSync(fixturePath, "utf-8");
    const parsed = InsightsRequestSchema.parse(JSON.parse(raw));

    const data = generateInsights(parsed);
    const config = getLLMConfig();
    const meta = {
      latencyMs: 5,
      policyVersion: "v1",
      llm: { attempted: false, succeeded: false, provider: config.provider, errorCode: null },
    };

    return okResponse(data, "fallback", meta);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error reading demo insights fixture";
    return errorResponse("INTERNAL_ERROR", message, undefined, 500);
  }
}

export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonRequest(request, InsightsRequestSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  const { data: input, latencyStart } = parsed;

  try {
    const data = generateInsights(input);
    const latencyMs = Date.now() - latencyStart;
    const config = getLLMConfig();

    const meta = {
      latencyMs,
      policyVersion: "v1",
      llm: { attempted: false, succeeded: false, provider: config.provider, errorCode: null },
    };

    return okResponse(data, "fallback", meta);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error generating insights";
    return errorResponse("INTERNAL_ERROR", message, undefined, 500);
  }
}
