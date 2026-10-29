/* POST /api/workflow/conflicts/[id]/resolve — Administrative conflict override with reason
 * Owner B · app/api/workflow/conflicts/[id]/resolve/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { getWorkflowCaller, handleWorkflowError } from "@/app/(workflow)/_lib/auth";
import { workflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await getWorkflowCaller(request, ["coordinator", "admin"]);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { resolution, overrideReason } = body;

    if (!overrideReason || overrideReason.trim().length === 0) {
      return NextResponse.json(
        { ok: false, success: false, error: { code: "REASON_REQUIRED", message: "Documented overrideReason is required for administrative conflict overrides" } },
        { status: 400 },
      );
    }

    const result = await workflowAdapter.resolveConflict(id, actor, resolution || "approve_override", overrideReason);

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
