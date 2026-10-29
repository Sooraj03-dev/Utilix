import { NextResponse } from "next/server";
import { authErrorToResponse, requireRole, canAccessResource } from "../../../../lib/auth/server";
import { getBookingById, updateBookingStatus } from "@/lib/db/bookings";
import { recordReturn } from "@/lib/db/checkouts";
import { updateResource } from "@/lib/db/resources";
import { createIssue } from "@/lib/db/issues";
import { writeAudit } from "@/lib/db/audit";
import { releaseSlotLocks } from "@/lib/db/slots";
import { adminDb } from "@/lib/firebase/admin";
import { getWorkflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";
import type { IssueCategory } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const actor = await requireRole(request, ["coordinator", "admin"]);
    const body = await request.json().catch(() => ({}));
    const { bookingId, conditionAfter, notes, hasIssue, issueCategory, issueNotes } = body;

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId is required." }, { status: 400 });
    }

    const adapter = getWorkflowAdapter();
    if (adapter.isMock) {
      const mockResult = await (adapter as any).checkoutBooking?.(bookingId, actor, conditionAfter, notes, hasIssue);
      if (mockResult) {
        return NextResponse.json({ success: true, ...mockResult });
      }
    }

    const booking = await getBookingById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: `Booking "${bookingId}" not found.` }, { status: 404 });
    }

    if (actor.role === "coordinator" && !canAccessResource(actor, booking.resource_id)) {
      return NextResponse.json(
        { error: "Forbidden: You are not assigned to manage this resource." },
        { status: 403 },
      );
    }

    if (booking.status !== "checked_out") {
      return NextResponse.json(
        { error: `Cannot complete return for booking with status "${booking.status}". Must be "checked_out".` },
        { status: 400 },
      );
    }

    let issueReport = null;

    await adminDb.runTransaction(async (tx) => {
      // 1. Release slot locks
      if (booking.slot_ids && booking.slot_ids.length > 0) {
        releaseSlotLocks(tx, booking.slot_ids);
      }

      // 2. Update booking to returned
      await updateBookingStatus(bookingId, "returned", {}, tx);

      // 3. Record return details in checkouts
      await recordReturn(
        bookingId,
        {
          conditionAfter: conditionAfter || "good",
          notes: notes || null,
        },
        tx,
      );

      // 4. Audit log
      await writeAudit(tx, {
        actor_id: actor.uid,
        action: "return",
        entity_type: "booking",
        entity_id: bookingId,
        reason: `Resource returned. Condition: ${conditionAfter || "good"}`,
      });
    });

    // 5. Handle issue report if equipment damaged or malfunctioned
    if (hasIssue || conditionAfter === "damaged" || conditionAfter === "poor") {
      const category: IssueCategory = (issueCategory as IssueCategory) || "damage";
      issueReport = await createIssue({
        bookingId,
        resourceId: booking.resource_id,
        userId: booking.user_id,
        category,
        notes: issueNotes || `Condition on return: ${conditionAfter || "damaged"}. ${notes || ""}`,
      });

      // Automatically place damaged resource into maintenance
      await updateResource(booking.resource_id, { status: "maintenance" });
    }

    return NextResponse.json({
      success: true,
      booking: { ...booking, status: "returned" },
      issueReport,
    });
  } catch (error) {
    return authErrorToResponse(error);
  }
}
