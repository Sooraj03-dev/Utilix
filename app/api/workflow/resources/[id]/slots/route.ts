/* GET /api/workflow/resources/[id]/slots?date=YYYY-MM-DD — Get available slots
 *
 * ⚠️ MOCK: Returns generated time slots, not persisted to any database.
 */

import { NextRequest, NextResponse } from "next/server";
import { workflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { success: false, error: "Query parameter 'date' is required (YYYY-MM-DD)." },
        { status: 400 },
      );
    }

    const resource = await workflowAdapter.getResource(id);
    if (!resource) {
      return NextResponse.json(
        { success: false, error: "Resource not found." },
        { status: 404 },
      );
    }

    const slots = await workflowAdapter.getResourceSlots(id, date);

    return NextResponse.json({
      success: true,
      data: { resource, slots },
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
