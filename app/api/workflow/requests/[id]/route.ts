/* GET /api/workflow/requests/[id] — Get a single booking request
 *
 * ⚠️ MOCK: Returns in-memory data, not from any database.
 */

import { NextRequest, NextResponse } from "next/server";
import { workflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const bookingRequest = await workflowAdapter.getRequest(id);

    if (!bookingRequest) {
      return NextResponse.json(
        { success: false, error: "Request not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: bookingRequest,
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
