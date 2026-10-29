/* GET  /api/workflow/requests — List booking requests
 * POST /api/workflow/requests — Create a new booking request
 *
 * ⚠️ MOCK: Uses in-memory data. New requests are NOT persisted to any
 *    database and will be lost on server restart.
 */

import { NextRequest, NextResponse } from "next/server";
import { workflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";
import { validateBookingForm } from "@/app/(workflow)/_lib/validation";
import type { BookingFormData } from "@/app/(workflow)/_lib/types";

export async function GET() {
  try {
    const requests = await workflowAdapter.listRequests();

    return NextResponse.json({
      success: true,
      data: requests,
      _mock: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BookingFormData;

    // Look up the resource for validation context
    const resource = await workflowAdapter.getResource(body.resourceId);

    // Validate
    const validation = validateBookingForm(body, resource);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: "Validation failed", errors: validation.errors },
        { status: 400 },
      );
    }

    if (!resource) {
      return NextResponse.json(
        { success: false, error: "Resource not found." },
        { status: 404 },
      );
    }

    // Create (mock — not persisted)
    const created = await workflowAdapter.createRequest(body);

    return NextResponse.json(
      {
        success: true,
        data: created,
        _mock: true,
        _notice: "⚠️ This request is stored in memory only and will not survive a server restart.",
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
