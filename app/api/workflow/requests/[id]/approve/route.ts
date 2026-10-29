import { NextResponse } from "next/server";
import { authErrorToResponse, requireRole, canAccessResource } from "../../../../../../lib/auth/server";
import { getBookingById, updateBookingStatus } from "@/lib/db/bookings";
import { getResourceById } from "@/lib/db/resources";
import { recordApprovalDecision } from "@/lib/db/approvals";
import { writeAudit } from "@/lib/db/audit";
import { createNotification } from "@/lib/db/notifications";
import { canTransition } from "@/lib/types/status";
import { getWorkflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole(request, ["coordinator", "admin"]);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const adapter = getWorkflowAdapter();

    if (adapter.isMock) {
      const mockResult = await (adapter as any).approveBooking?.(id, actor, body?.note);
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

    // Must be in a state eligible for approval
    const allowedCurrent = ["pending_approval", "submitted", "allocated"];
    if (!allowedCurrent.includes(booking.status)) {
      return NextResponse.json(
        { error: `Cannot approve booking in status "${booking.status}".` },
        { status: 400 },
      );
    }

    // Update status to confirmed
    await updateBookingStatus(id, "confirmed", {
      decision_reason: body.note || "Approved by coordinator",
      decision_source: "fallback",
    });

    const approval = await recordApprovalDecision({
      bookingId: id,
      decidedBy: actor.uid,
      decision: "approved",
      note: body.note || null,
    });

    await writeAudit(undefined, {
      actor_id: actor.uid,
      action: "approval_decided",
      entity_type: "booking",
      entity_id: id,
      reason: body.note || "approved",
    });

    const resource = await getResourceById(booking.resource_id);
    await createNotification({
      user_id: booking.user_id,
      type: "booking_confirmed",
      title: "Booking Request Approved",
      body: `Your request for ${resource?.name || "equipment"} on ${booking.slot_start.slice(0, 10)} has been confirmed!`,
      link: `/requests/${id}`,
      read: false,
    });

    return NextResponse.json({
      success: true,
      booking: { ...booking, status: "confirmed" },
      approval,
    });
  } catch (error) {
    return authErrorToResponse(error);
  }
}
