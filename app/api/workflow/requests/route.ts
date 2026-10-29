/* GET  /api/workflow/requests — List booking requests for caller
 * POST /api/workflow/requests — Create a new atomic booking with slot locking
 *
 * Requirements:
 * - Authenticates requester via requireUser()
 * - Performs atomic Firestore transaction:
 *   1. Check user credit balance and active booking limits
 *   2. Acquire slot locks via acquireSlotLocks()
 *   3. Enforce credit ledger rules via writeCredit()
 *   4. Create booking document via createBooking()
 *   5. Record audit event
 * - If slot taken: handles contention gracefully
 * - Returns typed ApiResponse<CreateBookingResponse>
 */

import { NextRequest, NextResponse } from "next/server";
import { workflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";
import { validateBookingForm } from "@/app/(workflow)/_lib/validation";
import type { BookingFormData } from "@/app/(workflow)/_lib/types";
import { getWorkflowCaller, handleWorkflowError, AuthError } from "@/app/(workflow)/_lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getWorkflowCaller(request);
    const userId = user.role === "student" ? user.uid : undefined;
    const bookings = await workflowAdapter.listRequests(userId);

    return NextResponse.json({
      ok: true,
      success: true,
      data: bookings,
      _mock: workflowAdapter.isMock,
    });
  } catch (error) {
    return handleWorkflowError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getWorkflowCaller(request);
    const body = (await request.json()) as BookingFormData;

    // Validate resource
    const resource = await workflowAdapter.getResource(body.resourceId);
    if (!resource) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          error: {
            code: "RESOURCE_NOT_FOUND",
            message: `Resource "${body.resourceId}" not found.`,
          },
        },
        { status: 404 },
      );
    }

    // Pure validation
    const validation = validateBookingForm(body, resource);
    if (!validation.valid) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "Booking form validation failed.",
            details: validation.errors,
          },
          errors: validation.errors,
        },
        { status: 400 },
      );
    }

    // Atomic creation via adapter
    const result = await workflowAdapter.createRequest(body, user);

    return NextResponse.json(
      {
        ok: true,
        success: true,
        data: {
          booking: result.booking,
          waitlisted: result.waitlisted,
        },
        _mock: workflowAdapter.isMock,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { ok: false, success: false, error: { code: "UNAUTHORIZED", message: error.message } },
        { status: error.status },
      );
    }

    const errName = error instanceof Error ? error.name : "";
    const errMessage = error instanceof Error ? error.message : "Failed to create booking";

    // Handle domain error codes
    if (errName === "SlotTakenError" || errMessage.includes("already locked")) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          error: {
            code: "SLOT_TAKEN",
            message: errMessage,
          },
        },
        { status: 409 },
      );
    }

    if (errName === "InsufficientCreditsError" || errMessage.includes("insufficient credits")) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          error: {
            code: "INSUFFICIENT_CREDITS",
            message: errMessage,
          },
        },
        { status: 402 },
      );
    }

    if (errMessage.includes("limit reached") || errMessage.includes("Training required")) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          error: {
            code: "POLICY_VIOLATION",
            message: errMessage,
          },
        },
        { status: 422 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: {
          code: "BOOKING_CREATION_FAILED",
          message: errMessage,
        },
      },
      { status: 500 },
    );
  }
}
