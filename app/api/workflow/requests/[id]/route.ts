/* GET /api/workflow/requests/[id] — Retrieve single booking
 *
 * Requirements:
 * - Authenticate caller
 * - Enforce ownership or staff permissions
 * - Return typed response
 */

import { NextRequest, NextResponse } from "next/server";
import { workflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";
import type { AuthUser } from "@/app/(workflow)/_lib/types";
import { AuthError } from "@/lib/auth/require-user";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCaller(request);
    const { id } = await params;

    const booking = await workflowAdapter.getRequest(id);
    if (!booking) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          error: {
            code: "BOOKING_NOT_FOUND",
            message: `Booking "${id}" does not exist.`,
          },
        },
        { status: 404 },
      );
    }

    // Authorization: owner, member, or staff
    const isOwner = booking.user_id === user.uid;
    const isMember = booking.member_ids?.includes(user.uid);
    const isStaff = user.role === "coordinator" || user.role === "admin";

    if (!isOwner && !isMember && !isStaff) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You are not authorized to view this booking.",
          },
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      ok: true,
      success: true,
      data: booking,
      _mock: workflowAdapter.isMock,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { ok: false, success: false, error: { code: "UNAUTHORIZED", message: error.message } },
        { status: error.status },
      );
    }
    const errMessage = error instanceof Error ? error.message : "Failed to fetch booking";
    return NextResponse.json(
      { ok: false, success: false, error: { code: "BOOKING_FETCH_FAILED", message: errMessage } },
      { status: 500 },
    );
  }
}
