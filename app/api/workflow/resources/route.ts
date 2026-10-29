/* GET /api/workflow/resources — List campus resources
 *
 * Requirements:
 * - Fetches resources through official database helper `@/lib/db/resources`
 * - Supports filtering by type, department, search query
 * - Returns typed API response matching ApiResponse<Resource[]>
 */

import { NextRequest, NextResponse } from "next/server";
import { workflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";
import type { ApiResponse } from "@/lib/types";
import type { Resource } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") ?? searchParams.get("type") ?? undefined;
    const department = searchParams.get("department") ?? searchParams.get("department_id") ?? undefined;
    const search = searchParams.get("q") ?? searchParams.get("search") ?? undefined;

    const resources = await workflowAdapter.listResources({
      category,
      department,
      search,
    });

    const response: ApiResponse<Resource[]> & { success: boolean; _mock?: boolean } = {
      ok: true,
      success: true,
      data: resources,
      _mock: workflowAdapter.isMock,
    };

    return NextResponse.json(response);
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Failed to fetch resources";
    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: {
          code: "RESOURCE_FETCH_FAILED",
          message: errMessage,
        },
      },
      { status: 500 },
    );
  }
}

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      success: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Resource creation is restricted to administrators via Member A foundation.",
      },
    },
    { status: 501 },
  );
}
