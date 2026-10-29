import { NextResponse } from "next/server";
import { authErrorToResponse, requireRole } from "../../../../lib/auth/server";
import { createIssue, listIssues } from "@/lib/db/issues";
import { updateResource, getResourceById } from "@/lib/db/resources";
import { writeAudit } from "@/lib/db/audit";
import type { IssueCategory, IssueStatus } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const actor = await requireRole(request, ["student", "coordinator", "admin"]);
    const url = new URL(request.url);
    const resourceId = url.searchParams.get("resourceId") || url.searchParams.get("resource_id") || undefined;
    const status = (url.searchParams.get("status") as IssueStatus) || undefined;

    // Students only view their own issues; coordinators/admins can view all or filtered
    const filter = {
      resourceId,
      status,
      userId: actor.role === "student" ? actor.uid : undefined,
    };

    const issues = await listIssues(filter);
    return NextResponse.json({ success: true, issues });
  } catch (error) {
    return authErrorToResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireRole(request, ["student", "coordinator", "admin"]);
    const body = await request.json().catch(() => ({}));
    const { resourceId, bookingId, category, notes, photoUrl } = body;

    if (!resourceId) {
      return NextResponse.json({ error: "resourceId is required." }, { status: 400 });
    }
    if (!notes || notes.trim().length === 0) {
      return NextResponse.json({ error: "Detailed notes are required." }, { status: 400 });
    }

    const validCategories: IssueCategory[] = ["damage", "malfunction", "missing", "other"];
    const issueCategory: IssueCategory = validCategories.includes(category) ? category : "malfunction";

    const resource = await getResourceById(resourceId);
    if (!resource) {
      return NextResponse.json({ error: `Resource "${resourceId}" not found.` }, { status: 404 });
    }

    const issue = await createIssue({
      bookingId: bookingId || null,
      resourceId,
      userId: actor.uid,
      category: issueCategory,
      notes: notes.trim(),
      photoUrl: photoUrl || null,
    });

    // If damage reported, mark resource maintenance immediately
    if (issueCategory === "damage") {
      await updateResource(resourceId, { status: "maintenance" });
    }

    await writeAudit(undefined, {
      actor_id: actor.uid,
      action: "issue_reported",
      entity_type: "resource",
      entity_id: resourceId,
      reason: `Issue reported: [${issueCategory}] ${notes.trim().slice(0, 100)}`,
    });

    return NextResponse.json({ success: true, issue }, { status: 201 });
  } catch (error) {
    return authErrorToResponse(error);
  }
}
