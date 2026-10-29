/* GET /api/workflow/resources — List campus resources
 * POST /api/workflow/resources — (reserved, returns 501)
 *
 * ⚠️ MOCK: Returns in-memory data, not persisted to any database.
 */

import { NextRequest, NextResponse } from "next/server";
import { workflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") ?? undefined;
    const department = searchParams.get("department") ?? undefined;
    const search = searchParams.get("q") ?? undefined;

    const resources = await workflowAdapter.listResources({
      category,
      department,
      search,
    });

    return NextResponse.json({
      success: true,
      data: resources,
      _mock: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: "Resource creation not implemented. Requires Firebase (Owner A)." },
    { status: 501 },
  );
}
