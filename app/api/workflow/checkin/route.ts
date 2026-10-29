/* POST /api/workflow/checkin — Check in returned resource and inspect condition
 * Owner B · app/api/workflow/checkin/route.ts
 * Integrated: routes through the shared workflow adapter, and in production
 * mode additionally records Member A's return-condition ledger entry and
 * reports damage issues (resource enters maintenance automatically).
 */

import { NextRequest, NextResponse } from "next/server";
import { getWorkflowCaller, handleWorkflowError } from "@/app/(workflow)/_lib/auth";
import { workflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";
import type { CheckinData } from "@/app/(workflow)/_lib/types";
import type { IssueCategory } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const actor = await getWorkflowCaller(request, ["coordinator", "admin"]);
    const body = (await request.json().catch(() => ({}))) as CheckinData & {
      hasIssue?: boolean;
      issueCategory?: string;
      issueNotes?: string;
    };

    if (!body.bookingId) {
      return NextResponse.json(
        { ok: false, success: false, error: { code: "MISSING_PARAM", message: "bookingId is required" } },
        { status: 400 },
      );
    }

    // Production-only guards and post-return records (Member A integrations).
    if (!workflowAdapter.isMock) {
      const [{ getBookingById }, { getUserProfileByUid }] = await Promise.all([
        import("@/lib/db/bookings"),
        import("@/lib/db/users"),
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
    }

    const result = await workflowAdapter.checkinBooking(body.bookingId, actor, body);

    // Post-return bookkeeping in production: checkout ledger + issue reporting.
    if (!workflowAdapter.isMock) {
      try {
        const [{ recordReturn }, { createIssue }, { updateResource }] = await Promise.all([
          import("@/lib/db/checkouts"),
          import("@/lib/db/issues"),
          import("@/lib/db/resources"),
        ]);

        const condition = body.itemCondition || "good";
        await recordReturn(body.bookingId, {
          conditionAfter: condition,
          notes: body.conditionNotes || null,
        });

        if (body.hasIssue || condition === "damaged" || condition === "poor") {
          const valid: IssueCategory[] = ["damage", "malfunction", "missing", "other"];
          const category: IssueCategory =
            body.issueCategory && valid.includes(body.issueCategory as IssueCategory)
              ? (body.issueCategory as IssueCategory)
              : "damage";

          const booking2 = await (await import("@/lib/db/bookings")).getBookingById(body.bookingId);
          if (booking2) {
            await createIssue({
              bookingId: body.bookingId,
              resourceId: booking2.resource_id,
              userId: booking2.user_id,
              category,
              notes: body.issueNotes || `Condition on return: ${condition}. ${body.conditionNotes || ""}`.trim(),
              photoUrl: null,
            });

            // Automatically place damaged resource into maintenance
            if (category === "damage") {
              await updateResource(booking2.resource_id, { status: "maintenance" });
            }
          }
        }
      } catch (postError) {
        console.warn("Post-return records failed (booking state unchanged):", postError);
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
