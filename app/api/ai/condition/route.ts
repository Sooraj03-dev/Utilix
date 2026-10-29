import {
  assessCondition,
  ConditionRequestSchema,
  errorResponse,
  getLLMConfig,
  okResponse,
  parseJsonRequest,
} from "../../../../lib/ai/index.js";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonRequest(request, ConditionRequestSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  const { data: input, latencyStart } = parsed;

  try {
    const data = assessCondition(input);
    const latencyMs = Date.now() - latencyStart;
    const config = getLLMConfig();

    const meta = {
      latencyMs,
      policyVersion: "v1",
      llm: { attempted: false, succeeded: false, provider: config.provider, errorCode: null },
    };

    return okResponse(data, "fallback", meta);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error assessing condition report";
    return errorResponse("INTERNAL_ERROR", message, undefined, 500);
  }
}
