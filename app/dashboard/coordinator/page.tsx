import React from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  ArrowRight,
  ShieldAlert,
  UserCheck,
  Check,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth/pages";
import {
  listResources,
  bookingsCol,
  getUserById,
  docToEntity,
} from "@/lib/db";
import type { Booking, Resource, User } from "@/lib/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  StatusChip,
  Badge,
  EmptyState,
  Button,
} from "@/components";

function isSameDay(isoString: string, targetDate: Date): boolean {
  try {
    const d = new Date(isoString);
    return (
      d.getUTCFullYear() === targetDate.getUTCFullYear() &&
      d.getUTCMonth() === targetDate.getUTCMonth() &&
      d.getUTCDate() === targetDate.getUTCDate()
    );
  } catch {
    return false;
  }
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    });
  } catch {
    return isoString;
  }
}

export default async function CoordinatorDashboardPage() {
  const sessionUser = await getSessionUser();
  const allResources = await listResources();

  // Filter resources managed by current coordinator (or all if admin)
  const managedResources = allResources.filter((res) => {
    if (!sessionUser || sessionUser.role === "admin") return true;
    return (
      res.coordinator_id === sessionUser.uid ||
      Boolean(sessionUser.assignedResourceIds?.includes(res.id))
    );
  });

  const resourceMap = new Map<string, Resource>(
    allResources.map((r) => [r.id, r])
  );
  const managedResourceIds = new Set(managedResources.map((r) => r.id));

  // Query active bookings
  const bookingsSnap = await bookingsCol().get();
  const allBookings = bookingsSnap.docs
    .map((d) => docToEntity<Booking>(d.id, d.data()))
    .filter((b): b is Booking => b !== null);

  const now = new Date();
  const nowIso = now.toISOString();

  // Pickups today: confirmed/allocated bookings scheduled for today on managed resources
  const todayPickups = allBookings.filter((b) => {
    if (!managedResourceIds.has(b.resource_id)) return false;
    const isToday = isSameDay(b.slot_start, now);
    return (b.status === "confirmed" || b.status === "allocated") && isToday;
  });

  // Returns today or overdue: checked_out bookings for managed resources
  const activeCheckouts = allBookings.filter((b) => {
    if (!managedResourceIds.has(b.resource_id)) return false;
    return b.status === "checked_out";
  });

  const todayReturns = activeCheckouts.filter((b) => {
    const isToday = isSameDay(b.slot_end, now);
    const isPastDue = b.slot_end < nowIso;
    return isToday || isPastDue;
  });

  // Pending approvals
  const pendingApprovals = allBookings.filter((b) => {
    if (!managedResourceIds.has(b.resource_id)) return false;
    return b.status === "pending_approval" || b.status === "submitted";
  });

  // Fetch student info for pickups and returns
  const relevantUserIds = [
    ...new Set([
      ...todayPickups.map((b) => b.user_id),
      ...todayReturns.map((b) => b.user_id),
    ]),
  ];

  const userMap = new Map<string, User>();
  await Promise.all(
    relevantUserIds.map(async (uid) => {
      try {
        const u = await getUserById(uid);
        if (u) userMap.set(uid, u);
      } catch {
        // Fallback gracefully
      }
    })
  );

  const overdueCount = todayReturns.filter((b) => b.slot_end < nowIso).length;

  return (
    <div className="space-y-8">
      {/* Pending approvals alert banner if any */}
      {pendingApprovals.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl border-[3px] border-[#111111] bg-[#FFD60A] shadow-[4px_4px_0px_0px_#111111] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-white border-[2px] border-[#111111] shrink-0">
              <ShieldAlert className="w-6 h-6 text-[#111111]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#111111] tracking-tight">
                {pendingApprovals.length} Reservation{pendingApprovals.length === 1 ? "" : "s"} Awaiting Coordinator Review
              </h2>
              <p className="text-sm font-medium text-[#111111]/80 mt-0.5">
                Students have requested restricted resources requiring safety or lab supervisor approval.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/coordinator/resources"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border-[2.5px] border-[#111111] bg-white font-black text-sm text-[#111111] shadow-[2px_2px_0px_0px_#111111] hover:bg-[#FFF9E6] shrink-0 min-h-[44px]"
          >
            Review Managed Resources
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      )}

      {/* Metric summary stat cards */}
      <section aria-label="Key Operational Stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="p-5 rounded-2xl border-[3px] border-[#111111] bg-white shadow-[4px_4px_0px_0px_#111111]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-[#4A4A4A]">
              Managed Resources
            </span>
            <div className="p-2 rounded-xl bg-[#FFF9E6] border-[2px] border-[#111111]">
              <Layers className="w-4 h-4 text-[#111111]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#111111]">{managedResources.length}</span>
            <span className="text-xs text-[#4A4A4A] font-semibold">equipment & spaces</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border-[3px] border-[#111111] bg-white shadow-[4px_4px_0px_0px_#111111]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-[#4A4A4A]">
              Today&apos;s Pickups
            </span>
            <div className="p-2 rounded-xl bg-[#FFF9E6] border-[2px] border-[#111111]">
              <Package className="w-4 h-4 text-[#111111]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#111111]">{todayPickups.length}</span>
            <span className="text-xs text-[#4A4A4A] font-semibold">scheduled handovers</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border-[3px] border-[#111111] bg-white shadow-[4px_4px_0px_0px_#111111]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-[#4A4A4A]">
              Returns Due Today
            </span>
            <div className="p-2 rounded-xl bg-[#FFF9E6] border-[2px] border-[#111111]">
              <Clock className="w-4 h-4 text-[#111111]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#111111]">{todayReturns.length}</span>
            {overdueCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-xs font-black text-[#EF4444] bg-[#FEE2E2] px-2 py-0.5 rounded-md border-[1.5px] border-[#111111]">
                <AlertTriangle className="w-3 h-3" />
                {overdueCount} Overdue
              </span>
            ) : (
              <span className="text-xs text-[#4A4A4A] font-semibold">on schedule</span>
            )}
          </div>
        </div>

        <div className="p-5 rounded-2xl border-[3px] border-[#111111] bg-white shadow-[4px_4px_0px_0px_#111111]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-[#4A4A4A]">
              Pending Approvals
            </span>
            <div className="p-2 rounded-xl bg-[#FFF9E6] border-[2px] border-[#111111]">
              <ShieldAlert className="w-4 h-4 text-[#111111]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#111111]">{pendingApprovals.length}</span>
            <span className="text-xs text-[#4A4A4A] font-semibold">needs decision</span>
          </div>
        </div>
      </section>

      {/* Main content grid: Pickups and Returns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section 1: Today's Pickups */}
        <section aria-label="Today's Scheduled Pickups" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-[#111111] tracking-tight flex items-center gap-2">
                <Package className="w-5 h-5 text-[#111111]" />
                Today&apos;s Pickups
              </h2>
              <p className="text-xs text-[#4A4A4A] font-medium mt-0.5">
                Students scheduled to collect resources today
              </p>
            </div>
            <span className="text-xs font-black px-2.5 py-1 rounded-full border-[2px] border-[#111111] bg-[#FFF9E6]">
              {todayPickups.length} scheduled
            </span>
          </div>

          {todayPickups.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No Pickups Scheduled Today"
              description="There are no confirmed equipment or space reservations starting today."
            />
          ) : (
            <div className="space-y-3">
              {todayPickups.map((booking) => {
                const resource = resourceMap.get(booking.resource_id);
                const user = userMap.get(booking.user_id);
                return (
                  <div
                    key={booking.id}
                    className="p-4 rounded-2xl border-[3px] border-[#111111] bg-white shadow-[3px_3px_0px_0px_#111111] transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black text-[#111111] text-base">
                          {resource?.name || booking.resource_id}
                        </h3>
                        <p className="text-xs text-[#4A4A4A] font-bold mt-0.5">
                          Student: {user?.name || user?.email || booking.user_id}
                          {user?.department_id && ` • ${user.department_id}`}
                        </p>
                      </div>
                      <StatusChip status={booking.status} />
                    </div>

                    <div className="mt-3 pt-3 border-t-[1.5px] border-[#111111]/15 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="inline-flex items-center gap-1.5 font-bold text-[#111111]">
                        <Clock className="w-3.5 h-3.5 text-[#4A4A4A]" />
                        <span>
                          {formatTime(booking.slot_start)} – {formatTime(booking.slot_end)} UTC
                        </span>
                      </div>
                      <div className="font-semibold text-[#4A4A4A]">
                        Purpose: <span className="text-[#111111]">{booking.purpose || "Academic Project"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 2: Today's Returns (with overdue flagged) */}
        <section aria-label="Today's Scheduled Returns" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-[#111111] tracking-tight flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#111111]" />
                Today&apos;s Returns
              </h2>
              <p className="text-xs text-[#4A4A4A] font-medium mt-0.5">
                Active checkouts due back today or overdue
              </p>
            </div>
            <span className="text-xs font-black px-2.5 py-1 rounded-full border-[2px] border-[#111111] bg-[#FFF9E6]">
              {todayReturns.length} active
            </span>
          </div>

          {todayReturns.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No Pending Returns"
              description="All checked-out resources are either returned or scheduled for subsequent days."
            />
          ) : (
            <div className="space-y-3">
              {todayReturns.map((booking) => {
                const resource = resourceMap.get(booking.resource_id);
                const user = userMap.get(booking.user_id);
                const isOverdue = booking.slot_end < nowIso;

                return (
                  <div
                    key={booking.id}
                    className={`p-4 rounded-2xl border-[3px] border-[#111111] shadow-[3px_3px_0px_0px_#111111] transition-all ${
                      isOverdue ? "bg-[#FFF1F2]" : "bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-[#111111] text-base">
                            {resource?.name || booking.resource_id}
                          </h3>
                          {/* Status shown with icon + label, never color alone */}
                          {isOverdue && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border-[2px] border-[#111111] bg-[#EF4444] text-white font-black text-xs uppercase tracking-wide shadow-[1px_1px_0px_0px_#111111]">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              OVERDUE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#4A4A4A] font-bold mt-0.5">
                          Borrower: {user?.name || user?.email || booking.user_id}
                          {user?.department_id && ` • ${user.department_id}`}
                        </p>
                      </div>
                      <StatusChip status={booking.status} />
                    </div>

                    <div className="mt-3 pt-3 border-t-[1.5px] border-[#111111]/15 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="inline-flex items-center gap-1.5 font-bold text-[#111111]">
                        <Clock className="w-3.5 h-3.5 text-[#4A4A4A]" />
                        <span>Due: {formatTime(booking.slot_end)} UTC</span>
                      </div>
                      <span className="text-[#4A4A4A] font-semibold">
                        Cost: {booking.cost_credits} Credits
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Quick navigation actions */}
      <section aria-label="Coordinator Quick Actions" className="pt-4 border-t-[3px] border-[#111111]/10">
        <h2 className="text-lg font-black text-[#111111] tracking-tight mb-4">
          Coordinator Management Tools
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/dashboard/coordinator/resources"
            className="p-5 rounded-2xl border-[3px] border-[#111111] bg-white hover:bg-[#FFF9E6] shadow-[4px_4px_0px_0px_#111111] flex items-center justify-between transition-all group"
          >
            <div>
              <h3 className="font-black text-[#111111] text-base group-hover:underline">
                Resource Catalog & Availability Schedules
              </h3>
              <p className="text-xs text-[#4A4A4A] font-medium mt-1">
                Configure equipment specs, edit recurring availability windows, and set maintenance blocks.
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#111111] shrink-0 ml-3" />
          </Link>

          <Link
            href="/dashboard/coordinator/training"
            className="p-5 rounded-2xl border-[3px] border-[#111111] bg-white hover:bg-[#FFF9E6] shadow-[4px_4px_0px_0px_#111111] flex items-center justify-between transition-all group"
          >
            <div>
              <h3 className="font-black text-[#111111] text-base group-hover:underline">
                Student Safety & Training Certifications
              </h3>
              <p className="text-xs text-[#4A4A4A] font-medium mt-1">
                Process student training requests, review prerequisites, and issue certified safety badges.
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#111111] shrink-0 ml-3" />
          </Link>
        </div>
      </section>
    </div>
  );
}
