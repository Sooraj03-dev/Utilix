import { NextResponse } from "next/server";
import { authErrorToResponse, requireRole } from "../../../../../../lib/auth/server";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["student", "coordinator", "admin"]);
    return NextResponse.json({ error: "not implemented" }, { status: 501 });
  } catch (error) {
    return authErrorToResponse(error);
  }
}
