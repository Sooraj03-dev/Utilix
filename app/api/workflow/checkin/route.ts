import { NextResponse } from "next/server";
import { authErrorToResponse, requireRole, canAccessResource } from "../../../../lib/auth/server";
import { getBookingById, updateBookingStatus } from "@/lib/db/bookings";
import { recordCheckin } from "@/lib/db/checkouts";
import { writeAudit } from "@/lib/db/audit";
import { getWorkflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";

export async function POST(request: Request) {
  try {
    const actor = await requireRole(request, ["coordinator", "admin"]);
    const body = await request.json().catch(() => ({}));
    const { bookingId, notes, condition, photoUrl } = body;

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId is required." }, { status: 400 });
    }

    const adapter = getWorkflowAdapter();
    if (adapter.isMock) {
      const mockResult = await (adapter as any).checkinBooking?.(bookingId, actor, condition, notes);
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

    if (booking.status !== "confirmed") {
      return NextResponse.json(
        { error: `Cannot check in booking with status "${booking.status}". Must be "confirmed".` },
        { status: 400 },
      );
    }

    await updateBookingStatus(bookingId, "checked_out");

    const checkout = await recordCheckin({
      bookingId,
      checkedOutBy: actor.uid,
      conditionBefore: condition || "good",
      notes: notes || null,
      photoUrl: photoUrl || null,
    });

    await writeAudit(undefined, {
      actor_id: actor.uid,
      action: "checkout",
      entity_type: "booking",
      entity_id: bookingId,
      reason: `Resource checked in and handed over. Condition: ${condition || "good"}`,
    });

    return NextResponse.json({
      success: true,
      booking: { ...booking, status: "checked_out" },
      checkout,
    });
  } catch (error) {
    return authErrorToResponse(error);
  }
}
