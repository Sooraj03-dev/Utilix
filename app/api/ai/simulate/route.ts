import {
  errorResponse,
  getLLMConfig,
  okResponse,
  parseJsonRequest,
  runSimulation,
  SimulateRequestSchema,
} from "../../../../lib/ai/index.js";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonRequest(request, SimulateRequestSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  const { data: input, latencyStart } = parsed;

  try {
    const data = runSimulation(input);
    const latencyMs = Date.now() - latencyStart;
    const config = getLLMConfig();

    const meta = {
      latencyMs,
      policyVersion: "v1",
      llm: { attempted: false, succeeded: false, provider: config.provider, errorCode: null },
    };

    return okResponse(data, "fallback", meta);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error executing simulation";
    return errorResponse("INTERNAL_ERROR", message, undefined, 500);
  }
}
