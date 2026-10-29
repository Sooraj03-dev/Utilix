/* POST /api/workflow/checkout — Check out resource to student
 * Owner B · app/api/workflow/checkout/route.ts
 * Integrated: routes through the shared workflow adapter, and in production
 * mode additionally records Member A's checkout ledger entry and enforces
 * coordinator→resource assignment (canAccessResource).
 */

import { NextRequest, NextResponse } from "next/server";
import { getWorkflowCaller, handleWorkflowError } from "@/app/(workflow)/_lib/auth";
import { workflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";
import type { CheckoutData } from "@/app/(workflow)/_lib/types";

export async function POST(request: NextRequest) {
  try {
    const actor = await getWorkflowCaller(request, ["coordinator", "admin"]);
    const body = (await request.json().catch(() => ({}))) as CheckoutData & {
      notes?: string;
    };

    if (!body.bookingId) {
      return NextResponse.json(
        { ok: false, success: false, error: { code: "MISSING_PARAM", message: "bookingId is required" } },
        { status: 400 },
      );
    }

    // Production-only guards and ledger records (Member A integrations).
    // In mock mode the adapter's in-memory store is authoritative.
    if (!workflowAdapter.isMock) {
      const [{ getBookingById }, { getUserProfileByUid }, { recordCheckin }] = await Promise.all([
        import("@/lib/db/bookings"),
        import("@/lib/db/users"),
        import("@/lib/db/checkouts"),
      ]);

      const booking = await getBookingById(body.bookingId);
      if (!booking) {
        return NextResponse.json(
          { ok: false, success: false, error: { code: "NOT_FOUND", message: `Booking "${body.bookingId}" not found` } },
          { status: 404 },
        );
      }

      // Coordinator→resource assignment check (Member A authorization rules).
      if (actor.role === "coordinator") {
        const profile = await getUserProfileByUid(actor.uid).catch(() => null);
        const assigned = profile?.assignedResourceIds ?? [];
        if (!assigned.includes(booking.resource_id)) {
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

      try {
        await recordCheckin({
          bookingId: body.bookingId,
          checkedOutBy: actor.uid,
          conditionBefore: body.itemCondition || "good",
          notes: body.conditionNotes || body.notes || null,
          photoUrl: null,
        });
      } catch (ledgerError) {
        console.warn("Checkout ledger record failed (booking state unchanged):", ledgerError);
      }
    }

    const result = await workflowAdapter.checkoutBooking(body.bookingId, actor, body);

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
