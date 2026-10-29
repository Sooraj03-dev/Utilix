import {
  AllocateRequestSchema,
  allocateRequests,
  errorResponse,
  explainRanking,
  mergePolicy,
  okResponse,
  parseJsonRequest,
} from "../../../../lib/ai/index.js";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonRequest(request, AllocateRequestSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  const { data: input, latencyStart } = parsed;
  const policy = mergePolicy(input.policy);

  try {
    const allocation = allocateRequests(input, "fallback");
    const explainRes = await explainRanking(
      allocation.ranking,
      input.slot.resourceName,
      allocation.tieBreak
    );

    allocation.ranking = explainRes.ranking;
    allocation.audit.source = explainRes.source;

    const latencyMs = Date.now() - latencyStart;
    const meta = {
      latencyMs,
      policyVersion: policy.version,
      llm: explainRes.llm,
    };

    return okResponse(allocation, explainRes.source, meta);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal allocation error";
    return errorResponse("INTERNAL_ERROR", message, undefined, 500);
  }
}
