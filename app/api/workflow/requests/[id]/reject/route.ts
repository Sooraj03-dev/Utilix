/* POST /api/workflow/requests/[id]/reject — Reject booking and refund credits
 * Owner B · app/api/workflow/requests/[id]/reject/route.ts
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

    const result = await workflowAdapter.rejectBooking(id, actor, body?.reason);

    return NextResponse.json({
      ok: true,
      success: true,
      data: {
        booking: result.booking,
        credits_refunded: result.credits_refunded,
      },
      booking: result.booking,
      credits_refunded: result.credits_refunded,
      _mock: workflowAdapter.isMock,
    });
  } catch (error) {
    return handleWorkflowError(error);
  }
}
