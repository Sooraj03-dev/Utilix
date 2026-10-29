/* GET & POST /api/workflow/issues — Report and list equipment issues
 * Owner B · app/api/workflow/issues/route.ts
 * Integrated: lists real issue reports from Member A's store with role
 * scoping, and POST accepts both the rich issue form (resourceId + notes,
 * with automatic maintenance on damage) and Member B's booking-based report
 * (adapter audit). Both share the same authenticated envelope.
 */

import { NextRequest, NextResponse } from "next/server";
import { getWorkflowCaller, handleWorkflowError } from "@/app/(workflow)/_lib/auth";
import { workflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";
import { listIssues } from "@/lib/db/issues";
import type { IssueCategory, IssueStatus } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const actor = await getWorkflowCaller(request, ["student", "coordinator", "admin"]);
    const url = new URL(request.url);
    const resourceId = url.searchParams.get("resourceId") || url.searchParams.get("resource_id") || undefined;
    const status = (url.searchParams.get("status") as IssueStatus) || undefined;

    // Students only view their own issues; coordinators/admins can view all or filtered
    const filter = {
      resourceId,
      status,
      userId: actor.role === "student" ? actor.uid : undefined,
    };

    const issues = workflowAdapter.isMock ? [] : await listIssues(filter);

    return NextResponse.json({
      ok: true,
      success: true,
      data: issues,
      issues,
      _mock: workflowAdapter.isMock,
    });
  } catch (error) {
    return handleWorkflowError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getWorkflowCaller(request, ["student", "coordinator", "admin"]);
    const body = await request.json().catch(() => ({}));
    const resourceId = body?.resourceId ?? body?.resource_id;
    const bookingId: string | undefined = body?.bookingId || (body?.booking_id as string | undefined);
    const notes: string | undefined = body?.notes;
    const description: string | undefined = body?.description;

    // Member B shape: booking-based report written to the audit trail.
    if (!resourceId && bookingId && description) {
      if (typeof workflowAdapter.reportIssue !== "function") {
        throw new Error("Issue reporting is not supported in this mode.");
      }
      const result = await workflowAdapter.reportIssue(
        bookingId,
        actor,
        description,
        body?.severity ?? "medium",
      );
      return NextResponse.json({ ok: true, success: true, data: result, issue: result, _mock: workflowAdapter.isMock });
    }

    // Member A shape: full issue record.
    if (!resourceId) {
      return NextResponse.json(
        { ok: false, success: false, error: { code: "MISSING_PARAM", message: "resourceId is required." } },
        { status: 400 },
      );
    }
    if (!notes || notes.trim().length === 0) {
      return NextResponse.json(
        { ok: false, success: false, error: { code: "MISSING_PARAM", message: "Detailed notes are required." } },
        { status: 400 },
      );
    }

    const [{ createIssue }, { getResourceById, updateResource }, { writeAudit }] = await Promise.all([
      import("@/lib/db/issues"),
      import("@/lib/db/resources"),
      import("@/lib/db/audit"),
    ]);
    const validCategories: IssueCategory[] = ["damage", "malfunction", "missing", "other"];
    const issueCategory: IssueCategory = validCategories.includes(body?.category as IssueCategory)
      ? (body?.category as IssueCategory)
      : "malfunction";

    const resource = await getResourceById(resourceId);
    if (!resource) {
      return NextResponse.json(
        { ok: false, success: false, error: { code: "NOT_FOUND", message: `Resource "${resourceId}" not found.` } },
        { status: 404 },
      );
    }

    const issue = await createIssue({
      bookingId: bookingId || null,
      resourceId,
      userId: actor.uid,
      category: issueCategory,
      notes: notes.trim(),
      photoUrl: body?.photoUrl || null,
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

    return NextResponse.json({ ok: true, success: true, issue, data: issue, _mock: false }, { status: 201 });
  } catch (error) {
    return handleWorkflowError(error);
  }
}
