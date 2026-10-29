/* POST /api/workflow/requests/[id]/cancel — Cancel a booking request
 *
 * Requirements:
 * - Authenticate caller
 * - Enforce ownership or staff permissions
 * - Verify status transition with assertTransition(status, "cancelled")
 * - Release slot locks inside transaction
 * - Calculate policy-compliant refund (cancel_refund_hours)
 * - Record cancellation audit event
 */

import { NextRequest, NextResponse } from "next/server";
import { workflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";
import type { AuthUser } from "@/app/(workflow)/_lib/types";
import { AuthError } from "@/lib/auth/require-user";
import { InvalidTransitionError } from "@/lib/types/status";

async function getCaller(request: NextRequest): Promise<AuthUser> {
  const useMock =
    process.env.USE_MOCK_DATA === "true" ||
    process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

  if (useMock) {
    return {
      uid: "user_alice",
      name: "Alice Chen",
      email: "alice@university.edu",
      role: "student",
    };
  }

  const { requireUser } = await import("@/lib/auth/require-user");
  return requireUser(request);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCaller(request);
    const { id } = await params;
    let bodyReason: string | undefined;

    try {
      const body = await request.json();
      bodyReason = body?.reason;
    } catch {
      // Body is optional
    }

    const result = await workflowAdapter.cancelRequest(id, user, bodyReason);

    return NextResponse.json({
      ok: true,
      success: true,
      data: {
        booking: result.booking,
        credits_refunded: result.credits_refunded,
      },
      _mock: workflowAdapter.isMock,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { ok: false, success: false, error: { code: "UNAUTHORIZED", message: error.message } },
        { status: error.status },
      );
    }

    if (error instanceof InvalidTransitionError) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          error: {
            code: "INVALID_TRANSITION",
            message: error.message,
          },
        },
        { status: 400 },
      );
    }

    const errMessage = error instanceof Error ? error.message : "Failed to cancel booking";

    if (errMessage.includes("Unauthorized")) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          error: {
            code: "FORBIDDEN",
            message: errMessage,
          },
        },
        { status: 403 },
      );
    }

    if (errMessage.includes("not found")) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          error: {
            code: "BOOKING_NOT_FOUND",
            message: errMessage,
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: {
          code: "CANCELLATION_FAILED",
          message: errMessage,
        },
      },
      { status: 500 },
    );
  }
}
