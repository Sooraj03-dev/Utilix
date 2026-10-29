import { NextResponse } from "next/server";
import { authErrorToResponse, requireRole, canAccessResource } from "../../../../../../lib/auth/server";
import { getBookingById, updateBookingStatus } from "@/lib/db/bookings";
import { getResourceById } from "@/lib/db/resources";
import { recordApprovalDecision } from "@/lib/db/approvals";
import { writeAudit } from "@/lib/db/audit";
import { createNotification } from "@/lib/db/notifications";
import { readCreditState, writeCredit } from "@/lib/db/ledger";
import { releaseSlotLocks } from "@/lib/db/slots";
import { adminDb } from "@/lib/firebase/admin";
import { getWorkflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole(request, ["coordinator", "admin"]);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = body?.reason?.trim();

    if (!reason) {
      return NextResponse.json({ error: "Rejection reason is required." }, { status: 400 });
    }

    const adapter = getWorkflowAdapter();
    if (adapter.isMock) {
      const mockResult = await (adapter as any).rejectBooking?.(id, actor, reason);
      if (mockResult) {
        return NextResponse.json({ success: true, ...mockResult });
      }
    }

    const booking = await getBookingById(id);
    if (!booking) {
      return NextResponse.json({ error: `Booking "${id}" not found.` }, { status: 404 });
    }

    if (actor.role === "coordinator" && !canAccessResource(actor, booking.resource_id)) {
      return NextResponse.json(
        { error: "Forbidden: You are not assigned to manage this resource." },
        { status: 403 },
      );
    }

    const terminalStatuses = ["cancelled", "rejected", "returned", "no_show"];
    if (terminalStatuses.includes(booking.status)) {
      return NextResponse.json(
        { error: `Cannot reject booking already in terminal status "${booking.status}".` },
        { status: 400 },
      );
    }

    let creditsRefunded = 0;
    const refundKey = `refund_reject_${id}`;

    // Execute atomic rejection, slot release, and credit refund
    await adminDb.runTransaction(async (tx) => {
      // 1. Release slot locks
      if (booking.slot_ids && booking.slot_ids.length > 0) {
        releaseSlotLocks(tx, booking.slot_ids);
      }

      // 2. Refund credits if previously charged
      if (booking.cost_credits > 0) {
        const creditState = await readCreditState(tx, booking.user_id, refundKey);
        writeCredit(tx, creditState, {
          userId: booking.user_id,
          delta: booking.cost_credits,
          reason: "refund_coordinator_cancel",
          bookingId: id,
          idempotencyKey: refundKey,
        });
        creditsRefunded = booking.cost_credits;
      }

      // 3. Record approval document with rejected decision
      await recordApprovalDecision(
        {
          bookingId: id,
          decidedBy: actor.uid,
          decision: "rejected",
          note: reason,
        },
        tx,
      );

      // 4. Update booking status
      await updateBookingStatus(
        id,
        "rejected",
        {
          decision_reason: reason,
          decision_source: "fallback",
        },
        tx,
      );

      // 5. Audit log
      await writeAudit(tx, {
        actor_id: actor.uid,
        action: "approval_decided",
        entity_type: "booking",
        entity_id: id,
        reason: `Rejected: ${reason}`,
      });
    });

    const resource = await getResourceById(booking.resource_id);
    await createNotification({
      user_id: booking.user_id,
      type: "booking_rejected",
      title: "Booking Request Rejected",
      body: `Your request for ${resource?.name || "equipment"} was rejected. Reason: ${reason}. ${creditsRefunded > 0 ? `${creditsRefunded} credits have been refunded to your account.` : ""}`,
      link: `/requests/${id}`,
      read: false,
    });

    return NextResponse.json({
      success: true,
      booking: { ...booking, status: "rejected", decision_reason: reason },
      credits_refunded: creditsRefunded,
      reason,
    });
  } catch (error) {
    return authErrorToResponse(error);
  }
}
