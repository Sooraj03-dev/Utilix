import { type z } from "zod";
import type { Meta } from "./types.js";

export const MAX_BODY_BYTES = 200 * 1024; // 200 KB

export interface SuccessEnvelope<T> {
  ok: true;
  source: "ai" | "fallback";
  data: T;
  meta: Meta;
}

export interface ErrorEnvelope {
  ok: false;
  error: {
    code: string;
    message: string;
    issues?: unknown;
  };
}

export function buildSuccessEnvelope<T>(
  data: T,
  source: "ai" | "fallback",
  meta: Meta
): SuccessEnvelope<T> {
  return {
    ok: true,
    source,
    data,
    meta,
  };
}

export function buildErrorEnvelope(
  code: string,
  message: string,
  issues?: unknown
): ErrorEnvelope {
  return {
    ok: false,
    error: {
      code,
      message,
      issues,
    },
  };
}

export async function parseJsonRequest<Output, Input = unknown>(
  request: Request,
  schema: z.ZodType<Output, z.ZodTypeDef, Input>
): Promise<{ success: true; data: Output; latencyStart: number } | { success: false; response: Response }> {
  const latencyStart = Date.now();
  try {
    const rawText = await request.text();
    const byteLength = new TextEncoder().encode(rawText).length;

    if (byteLength > MAX_BODY_BYTES) {
      return {
        success: false,
        response: new Response(
          JSON.stringify(
            buildErrorEnvelope(
              "VALIDATION_ERROR",
              `Request body exceeds maximum size of ${MAX_BODY_BYTES / 1024} KB`
            )
          ),
          { status: 400, headers: { "Content-Type": "application/json" } }
        ),
      };
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      return {
        success: false,
        response: new Response(
          JSON.stringify(buildErrorEnvelope("VALIDATION_ERROR", "Invalid JSON format")),
          { status: 400, headers: { "Content-Type": "application/json" } }
        ),
      };
    }

    const validation = schema.safeParse(parsedJson);
    if (!validation.success) {
      return {
        success: false,
        response: new Response(
          JSON.stringify(
            buildErrorEnvelope(
              "VALIDATION_ERROR",
              "Request validation failed",
              validation.error.issues
            )
          ),
          { status: 400, headers: { "Content-Type": "application/json" } }
        ),
      };
    }

    return {
      success: true,
      data: validation.data,
      latencyStart,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error processing request";
    return {
      success: false,
      response: new Response(
        JSON.stringify(buildErrorEnvelope("INTERNAL_ERROR", message)),
        { status: 400, headers: { "Content-Type": "application/json" } }
      ),
    };
  }
}
