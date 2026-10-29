import { NextResponse } from "next/server";
import { authErrorToResponse, requireRole } from "../../../../lib/auth/server";
import { getResourceById } from "@/lib/db/resources";
import { getUserById, getUserProfileByUid } from "@/lib/db/users";
import { hasTraining } from "@/lib/db/training";
import { countSessionsLast30Days } from "@/lib/db/bookings";
import { getActivePolicy } from "@/lib/db/policy";
import { getWorkflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";

export async function GET(request: Request) {
  try {
    const actor = await requireRole(request, ["student", "coordinator", "admin"]);
    const url = new URL(request.url);
    const resourceId = url.searchParams.get("resourceId") || url.searchParams.get("resource_id");
    let targetUserId = url.searchParams.get("userId") || url.searchParams.get("user_id") || actor.uid;

    if (!resourceId) {
      return NextResponse.json({ error: "resourceId query parameter is required." }, { status: 400 });
    }

    // Students may only check their own eligibility
    if (actor.role === "student" && targetUserId !== actor.uid) {
      targetUserId = actor.uid;
    }

    const adapter = getWorkflowAdapter();
    if (adapter.isMock) {
      const mockResult = await (adapter as any).checkEligibility?.(targetUserId, resourceId);
      if (mockResult) {
        return NextResponse.json({ success: true, ...mockResult });
      }
    }

    const resource = await getResourceById(resourceId);
    if (!resource) {
      return NextResponse.json({ error: `Resource "${resourceId}" not found.` }, { status: 404 });
    }

    const userEntity = await getUserById(targetUserId);
    const profile = await getUserProfileByUid(targetUserId);
    const policy = await getActivePolicy().catch(() => ({
      max_active_bookings_per_user: 3,
      slot_minutes: 60,
    }));

    const reasons: string[] = [];

    // 1. Check account active status
    const accountActive = userEntity ? userEntity.active !== false : true;
    if (!accountActive) {
      reasons.push("Account is deactivated. Contact campus facilities administrator.");
    }

    // 2. Check training requirement
    let trainingVerified = true;
    if (resource.requires_training) {
      trainingVerified = await hasTraining(targetUserId, resource.requires_training);
      if (!trainingVerified) {
        reasons.push(`Missing mandatory certification: "${resource.requires_training}". Complete quiz before booking.`);
      }
    }

    // 3. Check active concurrent bookings count
    const recentSessionsCount = await countSessionsLast30Days(targetUserId).catch(() => 0);
    const maxActive = (policy as any).max_active_bookings_per_user || 3;
    const bookingLimitPassed = recentSessionsCount <= maxActive;
    if (!bookingLimitPassed) {
      reasons.push(`Maximum concurrent bookings reached (${maxActive}). Complete an active booking before reserving more.`);
    }

    // 4. Check credit balance
    const currentCredits = userEntity ? userEntity.credit_balance : (profile ? 10 : 10);
    const hasCredits = currentCredits >= resource.credit_cost;
    if (!hasCredits) {
      reasons.push(`Insufficient credits. Required: ${resource.credit_cost}, available balance: ${currentCredits}.`);
    }

    const eligible = accountActive && trainingVerified && bookingLimitPassed && hasCredits;

    return NextResponse.json({
      success: true,
      eligible,
      user_id: targetUserId,
      resource_id: resourceId,
      checks: {
        account_active: accountActive,
        training_verified: trainingVerified,
        training_required: resource.requires_training,
        credit_balance: currentCredits,
        credit_cost: resource.credit_cost,
        has_sufficient_credits: hasCredits,
        booking_limit_passed: bookingLimitPassed,
      },
      reasons,
    });
  } catch (error) {
    return authErrorToResponse(error);
  }
}
