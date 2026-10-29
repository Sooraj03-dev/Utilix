import { NextResponse } from "next/server";
import { authErrorToResponse, requireRole } from "../../../../../lib/auth/server";
import { getResourceById } from "@/lib/db/resources";
import { createWaitlistEntry, listWaitlistForSlot, listWaitlistByUser } from "@/lib/db/waitlist";
import { writeAudit } from "@/lib/db/audit";
import { getWorkflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";

export async function POST(request: Request) {
  try {
    const actor = await requireRole(request, ["student", "coordinator", "admin"]);
    const body = await request.json().catch(() => ({}));
    const { resourceId, slotId, bookingId } = body;

    if (!resourceId || !slotId) {
      return NextResponse.json(
        { error: "Both resourceId and slotId are required to join the waitlist." },
        { status: 400 },
      );
    }

    const adapter = getWorkflowAdapter();
    if (adapter.isMock) {
      const mockResult = await (adapter as any).joinWaitlist?.(resourceId, slotId, actor);
      if (mockResult) {
        return NextResponse.json({ success: true, ...mockResult });
      }
    }

    const resource = await getResourceById(resourceId);
    if (!resource) {
      return NextResponse.json({ error: `Resource "${resourceId}" not found.` }, { status: 404 });
    }

    // Check duplicate waitlist entry
    const existingUserWaitlists = await listWaitlistByUser(actor.uid);
    const alreadyJoined = existingUserWaitlists.some(
      (entry) => entry.resource_id === resourceId && entry.slot_id === slotId,
    );
    if (alreadyJoined) {
      return NextResponse.json(
        { error: "You are already on the waitlist for this resource and time slot." },
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
      user_id: actor.uid,
      position,
      score: 0,
    });

    await writeAudit(undefined, {
      actor_id: actor.uid,
      action: "slot_locked",
      entity_type: "waitlist",
      entity_id: waitlistEntry.id,
      reason: `User joined waitlist at position #${position}`,
    });

    return NextResponse.json({
      success: true,
      waitlistEntry,
      position,
      message: `Successfully joined waitlist at position #${position}.`,
    });
  } catch (error) {
    return authErrorToResponse(error);
  }
}
