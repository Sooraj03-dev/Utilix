/* POST /api/workflow/conflicts/[id]/resolve — Resolve a scheduling conflict
 * Owner B · app/api/workflow/conflicts/[id]/resolve/route.ts
 * Integrated: mock mode resolves through the adapter (mandatory override
 * reason); in production mode Member A's atomic resolution runs — the chosen
 * booking is confirmed, competing alternates are waitlisted with credit
 * refunds, audit entries and notifications are written.
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

    // Member B shape: { conflictId, resolution, overrideReason }
    // Member A shape: { chosenBookingId, alternateBookingIds, reason }
    const overrideReason: string = (body?.overrideReason ?? body?.reason ?? "").toString().trim();
    if (!overrideReason) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          error: { code: "MISSING_PARAM", message: "Administrative override requires a documented reason." },
        },
        { status: 400 },
      );
    }
    const resolution: string = body?.resolution ? String(body.resolution) : "coordinator_override";

    if (workflowAdapter.isMock) {
      const result = await workflowAdapter.resolveConflict(id, actor, resolution, overrideReason);
      return NextResponse.json({
        ok: true,
        success: true,
        data: result,
        resolved: true,
        conflict_id: id,
        _mock: true,
      });
    }

    // Production path (Member A logic): atomic winner/alternates resolution.
    const chosenBookingId: string | undefined = body?.chosenBookingId;
    if (!chosenBookingId) {
      return NextResponse.json(
        { ok: false, success: false, error: { code: "MISSING_PARAM", message: "chosenBookingId is required." } },
        { status: 400 },
      );
    }
    const alternateBookingIds: string[] = Array.isArray(body?.alternateBookingIds)
      ? body.alternateBookingIds
      : [];

    const [{ adminDb }, { getBookingById, updateBookingStatus }, { writeAudit }, { createNotification }, { releaseSlotLocks }, { readCreditState, writeCredit }, { getUserProfileByUid }] =
      await Promise.all([
        import("@/lib/firebase/admin"),
        import("@/lib/db/bookings"),
        import("@/lib/db/audit"),
        import("@/lib/db/notifications"),
        import("@/lib/db/slots"),
        import("@/lib/db/ledger"),
        import("@/lib/db/users"),
      ]);

    const winningBooking = await getBookingById(chosenBookingId);
    if (!winningBooking) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          error: { code: "NOT_FOUND", message: `Chosen booking "${chosenBookingId}" not found.` },
        },
        { status: 404 },
      );
    }

    // Coordinator→resource assignment check (Member A authorization rules).
    if (actor.role === "coordinator") {
      const profile = await getUserProfileByUid(actor.uid).catch(() => null);
      const assigned = profile?.assignedResourceIds ?? [];
      if (!assigned.includes(winningBooking.resource_id)) {
        return NextResponse.json(
          {
            ok: false,
            success: false,
            error: { code: "FORBIDDEN", message: "You are not assigned to manage this resource." },
          },
          { status: 403 },
        );
      }
    }

    // Process resolution atomically
    await adminDb.runTransaction(async (tx) => {
      // 1. Confirm winner
      await updateBookingStatus(
        chosenBookingId,
        "confirmed",
        {
          decision_reason: `Conflict resolved in favor: ${overrideReason}`,
          decision_source: "fallback",
        },
        tx,
      );

      // 2. Process alternates (transition to waitlisted with credit refund)
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
            decision_reason: `Conflict resolution: slot allocated to competing request. ${overrideReason}`,
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
        reason: `Conflict resolved. Winner: ${chosenBookingId}. Reason: ${overrideReason}`,
      });
    });

    // 4. Notify winner
    await createNotification({
      user_id: winningBooking.user_id,
      type: "booking_confirmed",
      title: "Contested Slot Confirmed",
      body: `Your contested booking request has been confirmed by the coordinator! Reason: ${overrideReason}`,
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
          body: `Another request was prioritized for this slot (${overrideReason}). You have been placed on the priority waitlist and credits were refunded.`,
          link: `/requests/${altId}`,
          read: false,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      success: true,
      resolved: true,
      conflict_id: id,
      chosen_booking_id: chosenBookingId,
      alternates_count: alternateBookingIds.length,
      reason: overrideReason,
      _mock: false,
    });
  } catch (error) {
    return handleWorkflowError(error);
  }
}
