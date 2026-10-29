/* POST /api/workflow/checkin — Check in returned resource and inspect condition
 * Owner B · app/api/workflow/checkin/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { getWorkflowCaller, handleWorkflowError } from "@/app/(workflow)/_lib/auth";
import { workflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";
import type { CheckinData } from "@/app/(workflow)/_lib/types";

export async function POST(request: NextRequest) {
  try {
    const actor = await getWorkflowCaller(request, ["coordinator", "admin"]);
    const body = (await request.json().catch(() => ({}))) as CheckinData;

    if (!body.bookingId) {
      return NextResponse.json(
        { ok: false, success: false, error: { code: "MISSING_PARAM", message: "bookingId is required" } },
        { status: 400 },
      );
    }

    const result = await workflowAdapter.checkinBooking(body.bookingId, actor, body);

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
