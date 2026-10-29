/* POST /api/workflow/requests/[id]/approve — Approve pending booking
 * Owner B · app/api/workflow/requests/[id]/approve/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { getWorkflowCaller, handleWorkflowError } from "@/app/(workflow)/_lib/auth";
import { workflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await getWorkflowCaller(request, ["coordinator", "admin"]);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const result = await workflowAdapter.approveBooking(id, actor, body?.note);

    return NextResponse.json({
      ok: true,
      success: true,
      data: result.booking,
      booking: result.booking,
      _mock: workflowAdapter.isMock,
    });
  } catch (error) {
    return handleWorkflowError(error);
  }
}
