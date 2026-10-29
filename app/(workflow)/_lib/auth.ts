/* ═══════════════════════════════════════════════════════════════════════════
 * Workflow Auth Helper — Owner B
 *
 * Verifies caller identity and role for workflow API endpoints.
 * In production mode, uses Firebase Admin ID token verification via requireUser.
 * In mock mode (USE_MOCK_DATA="true"), supports mock headers for local testing.
 * ═══════════════════════════════════════════════════════════════════════════ */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { AuthUser, UserRole } from "./types";
import { AuthError } from "@/lib/auth/require-user";

export { AuthError };

export async function getWorkflowCaller(
  request: Request | NextRequest,
  allowedRoles?: UserRole[],
): Promise<AuthUser> {
  const useMock =
    process.env.USE_MOCK_DATA === "true" ||
    process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

  if (useMock) {
    const roleHeader = request.headers.get("x-mock-role") as UserRole | null;
    const uidHeader = request.headers.get("x-mock-uid");
    const nameHeader = request.headers.get("x-mock-name");

    const role: UserRole = roleHeader || "student";
    const user: AuthUser = {
      uid: uidHeader || (role === "coordinator" ? "user_carol" : role === "admin" ? "user_dave" : "user_alice"),
      name: nameHeader || (role === "coordinator" ? "Carol Coordinator" : role === "admin" ? "Dave Admin" : "Alice Chen"),
      email: `${uidHeader || role}@university.edu`,
      role,
    };

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      throw new AuthError(`Forbidden: requires role ${allowedRoles.join(" or ")}`, 403);
    }
    return user;
  }

  const { requireUser } = await import("@/lib/auth/require-user");
  return requireUser(request, allowedRoles);
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
