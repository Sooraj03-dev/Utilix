/* POST /api/workflow/checkout — Check out resource to student
 * Owner B · app/api/workflow/checkout/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { getWorkflowCaller, handleWorkflowError } from "@/app/(workflow)/_lib/auth";
import { workflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";
import type { CheckoutData } from "@/app/(workflow)/_lib/types";

export async function POST(request: NextRequest) {
  try {
    const actor = await getWorkflowCaller(request, ["coordinator", "admin"]);
    const body = (await request.json().catch(() => ({}))) as CheckoutData;

    if (!body.bookingId) {
      return NextResponse.json(
        { ok: false, success: false, error: { code: "MISSING_PARAM", message: "bookingId is required" } },
        { status: 400 },
      );
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
