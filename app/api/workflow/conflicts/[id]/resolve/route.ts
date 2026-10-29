import { NextResponse } from "next/server";
import { authErrorToResponse, requireRole, canAccessResource } from "../../../../../../lib/auth/server";
import { getBookingById, updateBookingStatus } from "@/lib/db/bookings";
import { writeAudit } from "@/lib/db/audit";
import { createNotification } from "@/lib/db/notifications";
import { releaseSlotLocks } from "@/lib/db/slots";
import { readCreditState, writeCredit } from "@/lib/db/ledger";
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
    const { chosenBookingId, alternateBookingIds = [], reason } = body;

    if (!chosenBookingId) {
      return NextResponse.json({ error: "chosenBookingId is required." }, { status: 400 });
    }
    if (!reason || reason.trim().length === 0) {
      return NextResponse.json({ error: "Resolution justification reason is required." }, { status: 400 });
    }

    const adapter = getWorkflowAdapter();
    if (adapter.isMock) {
      const mockResult = await (adapter as any).resolveConflict?.(id, chosenBookingId, alternateBookingIds, reason);
      if (mockResult) {
        return NextResponse.json({ success: true, ...mockResult });
      }
    }

    const winningBooking = await getBookingById(chosenBookingId);
    if (!winningBooking) {
      return NextResponse.json({ error: `Chosen booking "${chosenBookingId}" not found.` }, { status: 404 });
    }

    if (actor.role === "coordinator" && !canAccessResource(actor, winningBooking.resource_id)) {
      return NextResponse.json(
        { error: "Forbidden: You are not assigned to manage this resource." },
        { status: 403 },
      );
    }

    // Process resolution atomically
    await adminDb.runTransaction(async (tx) => {
      // 1. Confirm winner
      await updateBookingStatus(
        chosenBookingId,
        "confirmed",
        {
          decision_reason: `Conflict resolved in favor: ${reason}`,
          decision_source: "fallback",
        },
        tx,
      );

      // 2. Process alternates (transition to waitlisted or rejected with credit refund)
      for (const altId of alternateBookingIds) {
        const altBooking = await getBookingById(altId);
        if (!altBooking) continue;

        // Release any locks if alternate had partial locks
        if (altBooking.slot_ids && altBooking.slot_ids.length > 0) {
          releaseSlotLocks(tx, altBooking.slot_ids);
        }

        // Refund credits to alternate user if charged
        if (altBooking.cost_credits > 0) {
          const refundKey = `refund_conflict_${altId}`;
          const creditState = await readCreditState(tx, altBooking.user_id, refundKey);
          writeCredit(tx, creditState, {
            userId: altBooking.user_id,
            delta: altBooking.cost_credits,
            reason: "refund_coordinator_cancel",
            bookingId: altId,
            idempotencyKey: refundKey,
          });
        }

        await updateBookingStatus(
          altId,
          "waitlisted",
          {
            decision_reason: `Conflict resolution: slot allocated to competing request. ${reason}`,
            decision_source: "fallback",
          },
          tx,
        );
      }

      // 3. Audit log
      await writeAudit(tx, {
        actor_id: actor.uid,
        action: "booking_status_changed",
        entity_type: "conflict",
        entity_id: id,
        reason: `Conflict resolved. Winner: ${chosenBookingId}. Reason: ${reason}`,
      });
    });

    // 4. Notify winner
    await createNotification({
      user_id: winningBooking.user_id,
      type: "booking_confirmed",
      title: "Contested Slot Confirmed",
      body: `Your contested booking request has been confirmed by the coordinator! Reason: ${reason}`,
      link: `/requests/${chosenBookingId}`,
      read: false,
    });

    // 5. Notify alternates
    for (const altId of alternateBookingIds) {
      const altBooking = await getBookingById(altId);
      if (altBooking) {
        await createNotification({
          user_id: altBooking.user_id,
          type: "waitlist_promoted",
          title: "Booking Transferred to Waitlist",
          body: `Another request was prioritized for this slot (${reason}). You have been placed on the priority waitlist and credits were refunded.`,
          link: `/requests/${altId}`,
          read: false,
        });
      }
    }

    return NextResponse.json({
      success: true,
      resolved: true,
      conflict_id: id,
      chosen_booking_id: chosenBookingId,
      alternates_count: alternateBookingIds.length,
      reason,
    });
  } catch (error) {
    return authErrorToResponse(error);
  }
}
