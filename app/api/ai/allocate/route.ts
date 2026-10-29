import {
  AllocateRequestSchema,
  allocateRequests,
  buildErrorEnvelope,
  buildSuccessEnvelope,
  explainRanking,
  mergePolicy,
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
    // 1. Run deterministic allocation engine
    const allocation = allocateRequests(input, "fallback");

    // 2. Enhance explanations with LLM if available (with fallback guarantee)
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

    const envelope = buildSuccessEnvelope(allocation, explainRes.source, meta);

    return new Response(JSON.stringify(envelope), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal allocation error";
    return new Response(
      JSON.stringify(buildErrorEnvelope("INTERNAL_ERROR", message)),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
