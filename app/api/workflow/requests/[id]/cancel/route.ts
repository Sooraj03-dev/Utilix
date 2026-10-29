/* POST /api/workflow/requests/[id]/cancel — Cancel a booking request
 *
 * ⚠️ MOCK: Updates in-memory data only.
 */

import { NextRequest, NextResponse } from "next/server";
import { workflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const updated = await workflowAdapter.updateRequestStatus(id, "cancelled");

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Request not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
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
