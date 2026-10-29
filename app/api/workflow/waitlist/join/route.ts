/* POST /api/workflow/waitlist/join — Join slot waitlist
 * Owner B · app/api/workflow/waitlist/join/route.ts
 * Integrated: mock mode joins through the adapter's in-memory store; in
 * production mode Member A's complete duplicate/position handling runs
 * (resource existence check, 409 on duplicate entry, ordered position).
 */

import { NextRequest, NextResponse } from "next/server";
import { getWorkflowCaller, handleWorkflowError } from "@/app/(workflow)/_lib/auth";
import { workflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";

export async function POST(request: NextRequest) {
  try {
    const user = await getWorkflowCaller(request);
    const body = await request.json().catch(() => ({}));
    const resourceId = body?.resourceId ?? body?.resource_id;
    const slotId = body?.slotId ?? body?.slot_id;
    const bookingId: string | undefined = body?.bookingId;

    if (!resourceId || !slotId) {
      return NextResponse.json(
        { ok: false, success: false, error: { code: "MISSING_PARAM", message: "resourceId and slotId are required" } },
        { status: 400 },
      );
    }

    if (workflowAdapter.isMock) {
      const result = await workflowAdapter.joinWaitlist(resourceId, slotId, user);
      return NextResponse.json({
        ok: true,
        success: true,
        data: result.waitlistEntry,
        waitlistEntry: result.waitlistEntry,
        _mock: true,
      });
    }

    // Production path (Member A logic): duplicate + resource validation.
    const [{ getResourceById }, { listWaitlistByUser, listWaitlistForSlot, createWaitlistEntry }, { writeAudit }] =
      await Promise.all([
        import("@/lib/db/resources"),
        import("@/lib/db/waitlist"),
        import("@/lib/db/audit"),
      ]);

    const resource = await getResourceById(resourceId);
    if (!resource) {
      return NextResponse.json(
        { ok: false, success: false, error: { code: "NOT_FOUND", message: `Resource "${resourceId}" not found.` } },
        { status: 404 },
      );
    }

    // Check duplicate waitlist entry
    const existingUserWaitlists = await listWaitlistByUser(user.uid);
    const alreadyJoined = existingUserWaitlists.some(
      (entry) => entry.resource_id === resourceId && entry.slot_id === slotId,
    );
    if (alreadyJoined) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          error: { code: "CONFLICT", message: "You are already on the waitlist for this resource and time slot." },
        },
        { status: 409 },
      );
    }

    // Determine position
    const slotWaitlists = await listWaitlistForSlot(resourceId, slotId);
    const position = slotWaitlists.length + 1;

    const waitlistEntry = await createWaitlistEntry({
      resource_id: resourceId,
      slot_id: slotId,
      booking_id: bookingId || "",
      user_id: user.uid,
      position,
      score: 0,
    });

    await writeAudit(undefined, {
      actor_id: user.uid,
      action: "slot_locked",
      entity_type: "waitlist",
      entity_id: waitlistEntry.id,
      reason: `User joined waitlist at position #${position}`,
    });

    return NextResponse.json({
      ok: true,
      success: true,
      data: waitlistEntry,
      waitlistEntry,
      position,
      message: `Successfully joined waitlist at position #${position}.`,
      _mock: false,
    });
  } catch (error) {
    return handleWorkflowError(error);
  }
}
