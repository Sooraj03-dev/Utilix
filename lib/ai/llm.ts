export interface LLMConfig {
  provider: "gemini" | "openai_compatible" | "none";
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  timeoutMs: number;
}

export interface LLMResult {
  success: boolean;
  text?: string;
  provider: string;
  errorCode?: string;
}

export function getLLMConfig(): LLMConfig {
  const provider = (process.env.AI_PROVIDER || "none").toLowerCase() as
    | "gemini"
    | "openai_compatible"
    | "none";

  return {
    provider,
    apiKey: process.env.AI_API_KEY,
    model: process.env.AI_MODEL,
    baseUrl: process.env.AI_BASE_URL || "https://openrouter.ai/api/v1",
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || "7000", 10),
  };
}

export async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  customConfig?: Partial<LLMConfig>
): Promise<LLMResult> {
  const config = { ...getLLMConfig(), ...customConfig };
  const provider = config.provider;

  if (provider === "none" || !config.apiKey) {
    return {
      success: false,
      provider,
      errorCode: provider === "none" ? "NO_PROVIDER" : "MISSING_API_KEY",
    };
  }

  const overallDeadline = Date.now() + config.timeoutMs;
  let attempts = 0;

  while (Date.now() < overallDeadline && attempts < 2) {
    attempts++;
    const remainingTime = overallDeadline - Date.now();
    if (remainingTime < 500) {
      return { success: false, provider, errorCode: "TIMEOUT" };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remainingTime);

    try {
      if (provider === "gemini") {
        const model = config.model || "gemini-1.5-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;
        const combinedPrompt = `${systemPrompt}\n\nUser Input:\n${userPrompt}`;

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: combinedPrompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        });

        clearTimeout(timer);
        if (!res.ok) {
          if (overallDeadline - Date.now() > 2000 && attempts === 1) continue;
          return { success: false, provider, errorCode: `HTTP_${res.status}` };
        }

        const data = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          return { success: false, provider, errorCode: "EMPTY_RESPONSE" };
        }
        return { success: true, text, provider };
      }

      if (provider === "openai_compatible") {
        const model = config.model || "google/gemini-flash-1.5";
        const url = `${config.baseUrl!.replace(/\/+$/, "")}/chat/completions`;

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
          }),
        });

        clearTimeout(timer);
        if (!res.ok) {
          if (overallDeadline - Date.now() > 2000 && attempts === 1) continue;
          return { success: false, provider, errorCode: `HTTP_${res.status}` };
        }

        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const text = data.choices?.[0]?.message?.content;
        if (!text) {
          return { success: false, provider, errorCode: "EMPTY_RESPONSE" };
        }
        return { success: true, text, provider };
      }
    } catch (err: unknown) {
      clearTimeout(timer);
      const isAbort = err instanceof Error && err.name === "AbortError";
      if (isAbort) {
        return { success: false, provider, errorCode: "TIMEOUT" };
      }
      if (overallDeadline - Date.now() > 2000 && attempts === 1) {
        continue;
      }
      return { success: false, provider, errorCode: "NETWORK_ERROR" };
    }
  }

  return { success: false, provider, errorCode: "MAX_ATTEMPTS_EXCEEDED" };
}
