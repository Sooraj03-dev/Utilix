// Utilix — student home dashboard (Server Component)
// Owner: A
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarClock,
  ClipboardList,
  Clock,
  Coins,
  GraduationCap,
  Hourglass,
  LayoutDashboard,
  PackageSearch,
  Sparkles,
} from "lucide-react";

import {
  Card,
  Button,
  StatusChip,
  EmptyState,
} from "@/components";
import {
  getUserById,
  listBookingsByUser,
  listWaitlistByUser,
  listNotificationsByUser,
  listResources,
  getActivePolicy,
  freeSessionsLeft,
  isoWeekKey,
} from "@/lib/db";
import { homePathForRole, requireSessionUser } from "@/lib/auth";
import type { Booking } from "@/lib/types";

const ACTIVE_UPCOMING_STATUSES = new Set([
  "submitted",
  "eligibility_passed",
  "allocated",
  "waitlisted",
  "pending_approval",
  "confirmed",
]);

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Slot IDs end with `_YYYYMMDDTHHmm` (UTC). */
function slotIdToLabel(slotId: string): string {
  const match = /_(\d{8})T(\d{4})$/.exec(slotId);
  if (!match) return slotId.slice(-16);
  const y = match[1].slice(0, 4);
  const m = match[1].slice(4, 6);
  const d = match[1].slice(6, 8);
  return `${d}/${m}/${y} ${match[2].slice(0, 2)}:${match[2].slice(2)} UTC`;
}

export default async function DashboardPage() {
  const sessionUser = await requireSessionUser();
  const uid = sessionUser.uid;

  const [userDoc, policy, bookings, waitlist, notifications, resources] =
    await Promise.all([
      getUserById(uid).catch(() => null),
      getActivePolicy(),
      listBookingsByUser(uid).catch(() => [] as Booking[]),
      listWaitlistByUser(uid).catch(() => []),
      listNotificationsByUser(uid, 5).catch(() => []),
      listResources().catch(() => []),
    ]);

  const resourceName = (id: string) =>
    resources.find((r) => r.id === id)?.name ?? id;

  const now = new Date().toISOString();
  const upcoming = bookings
    .filter(
      (b) =>
        b.slot_start >= now &&
        ACTIVE_UPCOMING_STATUSES.has(b.status)
    )
    .sort((a, b) => a.slot_start.localeCompare(b.slot_start))
    .slice(0, 5);

  const activeWaitlist = waitlist
    .sort((a, b) => a.position - b.position)
    .slice(0, 5);

  const creditBalance = userDoc?.credit_balance ?? 0;
  const sessionsLeft = freeSessionsLeft(
    userDoc ?? { free_sessions_used: 0, free_sessions_week: isoWeekKey(new Date()) },
    policy
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (userDoc?.account_status === "pending_approval" || sessionUser.accountStatus === "pending_approval") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-14">
        <Card variant="yellow" className="p-6 sm:p-10 text-center space-y-4">
          <Hourglass className="w-12 h-12 mx-auto text-amber-700 stroke-[2.5]" aria-hidden="true" />
          <h1 className="text-2xl font-black tracking-tight text-black">
            Account Pending Institutional Approval
          </h1>
          <p className="text-sm font-bold text-black/75 max-w-lg mx-auto leading-relaxed">
            Hi {sessionUser.displayName}, your registration was received and is currently under review by your department administrator.
          </p>
          <div className="p-4 rounded-2xl bg-white/80 border-[2px] border-black text-xs text-left max-w-md mx-auto space-y-1">
            <div className="flex justify-between">
              <span className="text-black/60 font-bold">Email:</span>
              <span className="font-mono font-black">{sessionUser.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/60 font-bold">Status:</span>
              <span className="font-bold text-amber-800 uppercase">Pending Approval</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/60 font-bold">Department:</span>
              <span className="font-bold text-black">{userDoc?.department_id || "Engineering"}</span>
            </div>
          </div>
          <p className="text-xs text-black/60 font-medium">
            You will receive full laboratory allocation tools once verified by your institution.
          </p>
          <div className="pt-2">
            <Link href="/profile">
              <Button variant="secondary" size="sm">
                View Profile Details
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (userDoc?.account_status === "suspended" || sessionUser.accountStatus === "suspended") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-14">
        <Card className="p-6 sm:p-10 text-center space-y-4 bg-rose-50 border-[3.5px] border-red-600 shadow-[6px_6px_0px_#DC2626]">
          <h1 className="text-2xl font-black tracking-tight text-red-900">
            Account Access Suspended
          </h1>
          <p className="text-sm font-bold text-red-800 max-w-lg mx-auto">
            Your Utilix resource-sharing privileges are currently suspended due to unreturned equipment or policy infractions.
          </p>
        </Card>
      </div>
    );
  }

  if (sessionUser.role !== "student") {
    // Coordinators & admins get a short pointer to their own dashboard.
    return (
      <div className="max-w-3xl mx-auto px-4 py-14">
        <Card variant="yellow" className="p-6 sm:p-10 text-center">
          <LayoutDashboard className="w-10 h-10 mx-auto mb-3" aria-hidden="true" />
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Hi {sessionUser.displayName}, this is the student home.
          </h1>
          <p className="text-sm font-bold mt-2 text-black/75">
            Your {sessionUser.role} tools live on your own dashboard.
          </p>
          <Link href={homePathForRole(sessionUser.role)} className="inline-block mt-6">
            <Button variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Go to my dashboard
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-black/60">
            Utilix · Student home
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Welcome back, {sessionUser.displayName.split(" ")[0]} 👋
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/resources">
            <Button variant="primary" size="md" leftIcon={<PackageSearch className="w-4 h-4" />}>
              Browse resources
            </Button>
          </Link>
          <Link href="/history">
            <Button variant="outline" size="md" leftIcon={<ClipboardList className="w-4 h-4" />}>
              My requests
            </Button>
          </Link>
          <Link href="/dashboard/training">
            <Button variant="secondary" size="md" leftIcon={<GraduationCap className="w-4 h-4" />}>
              Training
            </Button>
          </Link>
        </div>
      </header>

      {/* Stats row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-black/60">
            <Coins className="w-4 h-4" aria-hidden="true" /> Credit balance
          </div>
          <p className="text-3xl font-black mt-2 tabular-nums">{creditBalance}</p>
          <p className="text-xs font-bold text-black/60 mt-1">
            monthly grant: {policy.monthly_credits} credits
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-black/60">
            <Sparkles className="w-4 h-4" aria-hidden="true" /> Free sessions left
          </div>
          <p className="text-3xl font-black mt-2 tabular-nums">{sessionsLeft}</p>
          <p className="text-xs font-bold text-black/60 mt-1">
            of {policy.free_sessions_per_week} · resets Monday (ISO week)
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-black/60">
            <Hourglass className="w-4 h-4" aria-hidden="true" /> Waitlist spots
          </div>
          <p className="text-3xl font-black mt-2 tabular-nums">{waitlist.length}</p>
          <p className="text-xs font-bold text-black/60 mt-1">
            you&apos;re currently queued on
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-black/60">
            <Bell className="w-4 h-4" aria-hidden="true" /> Notifications
          </div>
          <p className="text-3xl font-black mt-2 tabular-nums">{unreadCount}</p>
          <p className="text-xs font-bold text-black/60 mt-1">
            unread
          </p>
        </Card>
      </section>

      {/* Upcoming bookings */}
      <section>
        <h2 className="text-lg font-black tracking-tight mb-3">Upcoming bookings</h2>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No upcoming bookings"
            description="Once a request is allocated it will appear here with its slot and status."
            className="shadow-[6px_6px_0px_0px_#111111]"
          />
        ) : (
          <ul className="space-y-3">
            {upcoming.map((b) => (
              <li key={b.id}>
                <Card className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-black truncate">{resourceName(b.resource_id)}</p>
                    <p className="text-xs font-bold text-black/70 flex items-center gap-1.5 mt-1">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      {formatDate(b.slot_start)} ·{" "}
                      {b.slot_start.slice(11, 16)}–{b.slot_end.slice(11, 16)} UTC
                    </p>
                  </div>
                  <StatusChip status={b.status} size="sm" />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Waitlist positions */}
      <section>
        <h2 className="text-lg font-black tracking-tight mb-3">Waitlist positions</h2>
        {activeWaitlist.length === 0 ? (
          <EmptyState
            icon={Hourglass}
            title="Not on any waitlist"
            description="If a slot you want is taken, joining the waitlist keeps your place here."
            className="shadow-[6px_6px_0px_0px_#111111]"
          />
        ) : (
          <ul className="space-y-3">
            {activeWaitlist.map((w) => (
              <li key={w.id}>
                <Card className="p-4 flex items-center gap-4">
                  <span className="w-10 h-10 rounded-2xl border-[3px] border-[#111111] bg-[#FFD60A] shadow-[2px_2px_0px_#111] flex items-center justify-center font-black tabular-nums">
                    {w.position}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-black truncate">{resourceName(w.resource_id)}</p>
                    <p className="text-xs font-bold text-black/70 mt-0.5">
                      slot {slotIdToLabel(w.slot_id)}
                    </p>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Latest notifications */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black tracking-tight">Latest notifications</h2>
          <Link
            href="/dashboard/notifications"
            className="text-xs font-black underline flex items-center gap-1 min-h-[44px] items-center"
          >
            View all <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
        {notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications yet"
            description="Booking updates, refunds and waitlist promotions will land here."
            className="shadow-[6px_6px_0px_0px_#111111]"
          />
        ) : (
          <ul className="space-y-3">
            {notifications.map((n) => (
              <li key={n.id}>
                <Card className={`p-4 ${n.read ? "" : "bg-[#FFFDF0]"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-black text-sm truncate">{n.title}</p>
                      <p className="text-xs font-bold text-black/70 mt-0.5 line-clamp-2">
                        {n.body}
                      </p>
                    </div>
                    <span className="text-[10px] font-black uppercase shrink-0 rounded-full border-2 border-[#111111] px-2 py-0.5 bg-[#FFF8E7]">
                      {n.read ? "read" : "new"}
                    </span>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
