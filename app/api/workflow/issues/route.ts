/* GET & POST /api/workflow/issues — Report and list equipment issues
 * Owner B · app/api/workflow/issues/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { getWorkflowCaller, handleWorkflowError } from "@/app/(workflow)/_lib/auth";
import { workflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";

export async function GET(request: NextRequest) {
  try {
    await getWorkflowCaller(request);
    return NextResponse.json({
      ok: true,
      success: true,
      data: [],
      _mock: workflowAdapter.isMock,
    });
  } catch (error) {
    return handleWorkflowError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getWorkflowCaller(request);
    const body = await request.json().catch(() => ({}));
    const { bookingId, description, severity } = body;

    if (!bookingId || !description) {
      return NextResponse.json(
        { ok: false, success: false, error: { code: "MISSING_PARAM", message: "bookingId and description are required" } },
        { status: 400 },
      );
    }

    const result = await workflowAdapter.reportIssue(bookingId, user, description, severity);

    return NextResponse.json({
      ok: true,
      success: true,
      data: result,
      _mock: workflowAdapter.isMock,
    });
  } catch (error) {
    return handleWorkflowError(error);
  }
}
