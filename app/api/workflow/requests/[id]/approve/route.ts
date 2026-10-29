/* POST /api/workflow/requests/[id]/approve — Approve pending booking
 * Owner B · app/api/workflow/requests/[id]/approve/route.ts
 * Integrated: routes through the shared workflow adapter (state machine,
 * audit, notification) and additionally records Member A's approval decision
 * ledger entry in production mode.
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
    const note = body?.note ?? body?.notes;

    const result = await workflowAdapter.approveBooking(id, actor, note);

    // Production-only: record approval decision ledger entry (Member A).
    if (!workflowAdapter.isMock) {
      try {
        const { recordApprovalDecision } = await import("@/lib/db/approvals");
        await recordApprovalDecision({
          bookingId: id,
          decidedBy: actor.uid,
          decision: "approved",
          note: note || null,
        });
      } catch (ledgerError) {
        console.warn("Approval decision record failed (booking state unchanged):", ledgerError);
      }
    }

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
