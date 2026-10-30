import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import {
  getUserById,
  getActivePolicy,
  freeSessionsLeft,
  isoWeekKey,
  listBookingsByUser,
  listNotificationsByUser,
} from "@/lib/db";
import { findDemoAccountByUid } from "@/lib/auth/demo-accounts";
import { isMockAuthEnabled } from "@/lib/auth/config";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest | Request) {
  try {
    const sessionUser = await getCurrentUser(request);
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Unauthorized: Active session required." },
        { status: 401 },
      );
    }

    const uid = sessionUser.uid;
    const isMock = isMockAuthEnabled();
    const demoAccount = findDemoAccountByUid(uid);

    let userDoc: any = null;
    let policy: any = null;
    let userBookings: any[] = [];
    let userNotifications: any[] = [];

    if (isMock) {
      policy = { monthly_credits: 10, free_sessions_per_week: 2 };
      userDoc = {
        department_id: demoAccount?.department_id || demoAccount?.department || "dept_eng",
        year: 2,
        credit_balance: demoAccount?.credit_balance ?? (sessionUser.role === "student" ? 20 : 0),
        free_sessions_used: 0,
      };
    } else {
      [userDoc, policy, userBookings, userNotifications] = await Promise.all([
        getUserById(uid).catch(() => null),
        getActivePolicy().catch(() => null),
        listBookingsByUser(uid).catch(() => []),
        listNotificationsByUser(uid, 50).catch(() => []),
      ]);
    }

    const department_id =
      userDoc?.department_id ||
      demoAccount?.department_id ||
      demoAccount?.department ||
      "dept_eng";

    const year = userDoc?.year ?? 1;

    const credit_balance =
      userDoc?.credit_balance ??
      demoAccount?.credit_balance ??
      (sessionUser.role === "student" ? 20 : 0);

    const monthly_credits = policy?.monthly_credits ?? 10;
    const free_sessions_used = userDoc?.free_sessions_used ?? 0;
    const free_sessions_left = policy
      ? freeSessionsLeft(
          userDoc ?? {
            free_sessions_used,
            free_sessions_week: isoWeekKey(new Date()),
          },
          policy,
        )
      : Math.max(0, 2 - free_sessions_used);

    // Active bookings
    const activeStatuses = new Set([
      "submitted",
      "eligibility_passed",
      "allocated",
      "waitlisted",
      "pending_approval",
      "confirmed",
      "checked_out",
    ]);

    const activeBookingCount = userBookings.filter((b) =>
      activeStatuses.has(b.status),
    ).length;

    // Reliability calculation: on-time returns / completed
    const completedBookings = userBookings.filter(
      (b) => b.status === "returned",
    );
    let onTimeCount = 0;
    for (const b of completedBookings) {
      if (b.updated_at && b.slot_end) {
        if (new Date(b.updated_at).getTime() <= new Date(b.slot_end).getTime() + 15 * 60 * 1000) {
          onTimeCount++;
        }
      } else {
        onTimeCount++;
      }
    }

    const reliability =
      completedBookings.length === 0
        ? 100
        : Math.round((onTimeCount / completedBookings.length) * 100);

    const unreadNotificationCount = userNotifications.filter(
      (n) => !n.read,
    ).length;

    return NextResponse.json({
      user: {
        uid: sessionUser.uid,
        email: sessionUser.email,
        displayName: sessionUser.displayName,
        role: sessionUser.role,
        department_id,
        year,
        credit_balance,
        monthly_credits,
        free_sessions_used,
        free_sessions_left,
        active_booking_count: activeBookingCount,
        reliability,
        assignedResourceIds: sessionUser.assignedResourceIds ?? [],
        trainingVerified: sessionUser.trainingVerified ?? false,
        unread_notification_count: unreadNotificationCount,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
