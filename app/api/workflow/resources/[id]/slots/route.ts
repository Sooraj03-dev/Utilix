/* GET /api/workflow/resources/[id]/slots?date=YYYY-MM-DD — Get available slots
 *
 * Requirements:
 * - Validates resource existence and requested date
 * - Uses configured slot duration and foundation slot utilities
 * - Checks maintenance status and active slot locks
 * - Returns stable slot IDs in UTC format
 */

import { NextRequest, NextResponse } from "next/server";
import { workflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";
import type { TimeSlot } from "@/app/(workflow)/_lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          error: {
            code: "INVALID_DATE",
            message: "Query parameter 'date' is required in YYYY-MM-DD format.",
          },
        },
        { status: 400 },
      );
    }

    const resource = await workflowAdapter.getResource(id);
    if (!resource) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          error: {
            code: "RESOURCE_NOT_FOUND",
            message: `Resource "${id}" not found.`,
          },
        },
        { status: 404 },
      );
    }

    const slots: TimeSlot[] = await workflowAdapter.getResourceSlots(id, date);

    return NextResponse.json({
      ok: true,
      success: true,
      data: {
        resource,
        slots,
      },
      _mock: workflowAdapter.isMock,
    });
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Failed to fetch slots";
    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: {
          code: "SLOT_FETCH_FAILED",
          message: errMessage,
        },
      },
      { status: 500 },
    );
  }
}
