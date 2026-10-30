/* ═══════════════════════════════════════════════════════════════════════════
 * Workflow Auth Helper — Delegated to lib/auth/server
 *
 * Verifies caller identity and role for workflow API endpoints using
 * the canonical server authentication (cookie session or Bearer token).
 * ═══════════════════════════════════════════════════════════════════════════ */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { AuthUser, UserRole } from "./types";
import { getCurrentUser, AuthError } from "@/lib/auth/server";

export { AuthError };

export async function getWorkflowCaller(
  request: Request | NextRequest,
  allowedRoles?: UserRole[],
): Promise<AuthUser> {
  const user = await getCurrentUser(request);

  if (!user) {
    throw new AuthError("Unauthorized: Session or Bearer token required.", 401);
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    throw new AuthError(
      `Forbidden: requires role ${allowedRoles.join(" or ")}`,
      403,
    );
  }

  return {
    ...user,
    name: user.displayName || user.email || "Utilix User",
  };
}

export function handleWorkflowError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: {
          code: error.status === 403 ? "FORBIDDEN" : "UNAUTHORIZED",
          message: error.message,
        },
      },
      { status: error.status },
    );
  }

  const message = error instanceof Error ? error.message : "Internal workflow error";
  return NextResponse.json(
    {
      ok: false,
      success: false,
      error: {
        code: "WORKFLOW_ERROR",
        message,
      },
    },
    { status: 500 },
  );
}
