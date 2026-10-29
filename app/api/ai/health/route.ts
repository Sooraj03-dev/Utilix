import { callLLM, getLLMConfig } from "../../../../lib/ai/index.js";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET(request: Request): Promise<Response> {
  const config = getLLMConfig();
  const url = new URL(request.url);
  const probe = url.searchParams.get("probe") === "1";

  let probeSucceeded: boolean | undefined = undefined;
  if (probe && config.provider !== "none" && config.apiKey) {
    try {
      const probeRes = await callLLM(
        "Ping. Return empty JSON.",
        "{}",
        { timeoutMs: 3000 }
      );
      probeSucceeded = probeRes.success;
    } catch {
      probeSucceeded = false;
    }
  }

  const payload = {
    ok: true,
    provider: config.provider,
    keyConfigured: Boolean(config.apiKey),
    model: config.model ?? null,
    fallbackOnly: config.provider === "none" || !config.apiKey,
    ...(probeSucceeded !== undefined ? { probeSucceeded } : {}),
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
