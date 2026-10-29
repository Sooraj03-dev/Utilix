/* POST /api/workflow/requests/[id]/reject — Reject booking and refund credits
 * Owner B · app/api/workflow/requests/[id]/reject/route.ts
 * Integrated: keeps Member A's mandatory rejection reason, routes through the
 * shared workflow adapter (atomic slot release + credit refund + audit +
 * notification) and records Member A's approval decision ledger entry.
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
    const reason = typeof body?.reason === "string" ? body.reason.trim() : undefined;

    if (!reason) {
      return NextResponse.json(
        { ok: false, success: false, error: { code: "MISSING_PARAM", message: "Rejection reason is required." } },
        { status: 400 },
      );
    }

    const result = await workflowAdapter.rejectBooking(id, actor, reason);

    // Production-only: record approval decision ledger entry (Member A).
    if (!workflowAdapter.isMock) {
      try {
        const { recordApprovalDecision } = await import("@/lib/db/approvals");
        await recordApprovalDecision({
          bookingId: id,
          decidedBy: actor.uid,
          decision: "rejected",
          note: reason,
        });
      } catch (ledgerError) {
        console.warn("Approval decision record failed (booking state unchanged):", ledgerError);
      }
    }

    return NextResponse.json({
      ok: true,
      success: true,
      data: {
        booking: result.booking,
        credits_refunded: result.credits_refunded,
      },
      booking: result.booking,
      credits_refunded: result.credits_refunded,
      reason,
      _mock: workflowAdapter.isMock,
    });
  } catch (error) {
    return handleWorkflowError(error);
  }
}
