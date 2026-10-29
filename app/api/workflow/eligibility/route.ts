/* GET & POST /api/workflow/eligibility — Evaluate booking eligibility
 * Owner B · app/api/workflow/eligibility/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { getWorkflowCaller, handleWorkflowError } from "@/app/(workflow)/_lib/auth";
import { workflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";

export async function GET(request: NextRequest) {
  try {
    const actor = await getWorkflowCaller(request);
    const url = new URL(request.url);
    const resourceId = url.searchParams.get("resourceId") || url.searchParams.get("resource_id");
    const slotStart = url.searchParams.get("slotStart") || url.searchParams.get("slot_start") || undefined;
    const slotEnd = url.searchParams.get("slotEnd") || url.searchParams.get("slot_end") || undefined;
    let targetUserId = url.searchParams.get("userId") || url.searchParams.get("user_id") || actor.uid;

    if (!resourceId) {
      return NextResponse.json(
        { ok: false, success: false, error: { code: "MISSING_PARAM", message: "resourceId parameter is required" } },
        { status: 400 },
      );
    }

    // Students may only check their own eligibility
    if (actor.role === "student" && targetUserId !== actor.uid) {
      targetUserId = actor.uid;
    }

    const result = await workflowAdapter.checkEligibility(targetUserId, resourceId, slotStart, slotEnd);

    return NextResponse.json({
      ok: true,
      success: true,
      data: result,
      ...result,
      _mock: workflowAdapter.isMock,
    });
  } catch (error) {
    return handleWorkflowError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getWorkflowCaller(request);
    const body = await request.json().catch(() => ({}));
    const resourceId = body.resourceId || body.resource_id;
    const slotStart = body.slotStart || body.slot_start;
    const slotEnd = body.slotEnd || body.slot_end;
    let targetUserId = body.userId || body.user_id || actor.uid;

    if (!resourceId) {
      return NextResponse.json(
        { ok: false, success: false, error: { code: "MISSING_PARAM", message: "resourceId parameter is required" } },
        { status: 400 },
      );
    }

    if (actor.role === "student" && targetUserId !== actor.uid) {
      targetUserId = actor.uid;
    }

    const result = await workflowAdapter.checkEligibility(targetUserId, resourceId, slotStart, slotEnd);

    return NextResponse.json({
      ok: true,
      success: true,
      data: result,
      ...result,
      _mock: workflowAdapter.isMock,
    });
  } catch (error) {
    return handleWorkflowError(error);
  }
}
