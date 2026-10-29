/* POST /api/workflow/waitlist/join — Join slot waitlist
 * Owner B · app/api/workflow/waitlist/join/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { getWorkflowCaller, handleWorkflowError } from "@/app/(workflow)/_lib/auth";
import { workflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";

export async function POST(request: NextRequest) {
  try {
    const user = await getWorkflowCaller(request);
    const body = await request.json().catch(() => ({}));
    const { resourceId, slotId } = body;

    if (!resourceId || !slotId) {
      return NextResponse.json(
        { ok: false, success: false, error: { code: "MISSING_PARAM", message: "resourceId and slotId are required" } },
        { status: 400 },
      );
    }

    const result = await workflowAdapter.joinWaitlist(resourceId, slotId, user);

    return NextResponse.json({
      ok: true,
      success: true,
      data: result.waitlistEntry,
      waitlistEntry: result.waitlistEntry,
      _mock: workflowAdapter.isMock,
    });
  } catch (error) {
    return handleWorkflowError(error);
  }
}
