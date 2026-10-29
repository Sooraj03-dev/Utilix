import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/auth/pages";
import {
  Scale,
  Percent,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Sparkles,
  Sliders,
  ScrollText,
  Flame,
  Layers,
  Wrench,
  ShieldCheck,
  TrendingDown,
  Info,
  Download,
} from "lucide-react";
import { loadAdminKpis } from "@/lib/db/kpis";
import { EmptyState } from "@/components/EmptyState";
import type { FairnessLabel } from "@/lib/kpis";

export const revalidate = 60;

const STATUS_LABELS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  confirmed: { label: "Confirmed Bookings", icon: CheckCircle2, color: "bg-[#22C55E]" },
  checked_out: { label: "Active In-Use", icon: Clock, color: "bg-[#38BDF8]" },
  returned: { label: "Successfully Returned", icon: CheckCircle2, color: "bg-[#4ADE80]" },
  waitlisted: { label: "Waitlist Queue", icon: Clock, color: "bg-[#F59E0B]" },
  rejected: { label: "Declined by Fair Rules", icon: AlertTriangle, color: "bg-[#EF4444]" },
  cancelled: { label: "Student Cancelled", icon: Clock, color: "bg-[#9CA3AF]" },
  submitted: { label: "Intake / Pending", icon: Clock, color: "bg-[#FFD60A]" },
  pending_approval: { label: "Coordinator Review", icon: ShieldCheck, color: "bg-[#F59E0B]" },
};

function FairnessBadge({ score, label, gini }: { score: number; label: FairnessLabel; gini: number }) {
  let bgClass = "bg-[#DCFCE7] text-[#166534] border-[#166534]";
  let Icon = CheckCircle2;

  if (label === "Fairly even") {
    bgClass = "bg-[#FEF3C7] text-[#92400E] border-[#92400E]";
    Icon = Sparkles;
  } else if (label === "Uneven") {
    bgClass = "bg-[#FEE2E2] text-[#991B1B] border-[#991B1B]";
    Icon = AlertTriangle;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-3xl font-black text-[#111111]">{score}</span>
        <span className="text-sm font-bold text-[#4A4A4A]">/ 100</span>
        {/* Status is never shown by color alone: icon + label */}
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border-[2px] font-black text-xs uppercase tracking-wide shadow-[1.5px_1.5px_0px_0px_#111111] ${bgClass}`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </span>
      </div>
      <p className="text-xs text-[#4A4A4A] font-semibold">
        Gini Index: <code className="font-mono font-bold text-[#111111]">{gini}</code> (0.0 = perfect parity)
      </p>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const user = await requireSessionUser();
  if (user.role !== "admin") {
    redirect("/dashboard");
  }
  const kpis = await loadAdminKpis(30);

  // Status breakdown total
  const statusEntries = Object.entries(kpis.bookingsByStatus);
  const totalStatusCount = statusEntries.reduce((sum, [, count]) => sum + count, 0);

  // Department breakdown sorted
  const deptEntries = Object.entries(kpis.sessionsByDepartment).sort((a, b) => b[1] - a[1]);
  const maxDeptSessions = Math.max(...deptEntries.map(([, count]) => count), 1);

  return (
    <div className="space-y-8">
      {/* 4 Core KPI Cards */}
      <section aria-label="Campus Key Performance Indicators" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* KPI 1: Utilisation Rate */}
        <div className="p-5 rounded-2xl border-[3px] border-[#111111] bg-white shadow-[4px_4px_0px_0px_#111111] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-[#4A4A4A]">
                Utilisation Rate
              </span>
              <div className="p-2 rounded-xl bg-[#FFF9E6] border-[2px] border-[#111111]">
                <Percent className="w-4 h-4 text-[#111111]" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#111111]">
                {kpis.overallUtilisationRate}%
              </span>
            </div>
          </div>
          <p className="mt-3 text-xs text-[#4A4A4A] font-semibold pt-2 border-t-[1.5px] border-[#111111]/10">
            {kpis.bookedSlotHours} booked hrs / {kpis.availableSlotHours} open hrs (last 30 days)
          </p>
        </div>

        {/* KPI 2: Total Bookings */}
        <div className="p-5 rounded-2xl border-[3px] border-[#111111] bg-white shadow-[4px_4px_0px_0px_#111111] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-[#4A4A4A]">
                Total Bookings
              </span>
              <div className="p-2 rounded-xl bg-[#FFF9E6] border-[2px] border-[#111111]">
                <Calendar className="w-4 h-4 text-[#111111]" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#111111]">
                {kpis.totalBookings}
              </span>
              <span className="text-xs text-[#4A4A4A] font-semibold">requests evaluated</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-[#4A4A4A] font-semibold pt-2 border-t-[1.5px] border-[#111111]/10">
            Across {kpis.totalResources} lab spaces & hardware kits
          </p>
        </div>

        {/* KPI 3: Active Users */}
        <div className="p-5 rounded-2xl border-[3px] border-[#111111] bg-white shadow-[4px_4px_0px_0px_#111111] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-[#4A4A4A]">
                Active Students
              </span>
              <div className="p-2 rounded-xl bg-[#FFF9E6] border-[2px] border-[#111111]">
                <Users className="w-4 h-4 text-[#111111]" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#111111]">
                {kpis.activeUsers.activeUsersCount}
              </span>
              <span className="text-xs text-[#4A4A4A] font-semibold">
                / {kpis.activeUsers.totalUsersCount} ({kpis.activeUsers.activeRate}%)
              </span>
            </div>
          </div>
          <p className="mt-3 text-xs text-[#4A4A4A] font-semibold pt-2 border-t-[1.5px] border-[#111111]/10">
            Students with at least 1 booking in 30 days
          </p>
        </div>

        {/* KPI 4: Fairness Score */}
        <div className="p-5 rounded-2xl border-[3px] border-[#111111] bg-white shadow-[4px_4px_0px_0px_#111111] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-[#4A4A4A]">
                Campus Fairness Score
              </span>
              <div className="p-2 rounded-xl bg-[#FFF9E6] border-[2px] border-[#111111]">
                <Scale className="w-4 h-4 text-[#111111]" />
              </div>
            </div>
            <div className="mt-3">
              <FairnessBadge
                score={kpis.fairness.score}
                label={kpis.fairness.label}
                gini={kpis.fairness.gini}
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-[#4A4A4A] font-semibold pt-2 border-t-[1.5px] border-[#111111]/10">
            Formula: 100 × (1 - Gini) over all registered students
          </p>
        </div>
      </section>

      {/* Grid: Status Breakdown & Department Distribution (Simple CSS Bars) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status Breakdown Section */}
        <section aria-label="Bookings by Lifecycle Status" className="p-6 rounded-2xl border-[3px] border-[#111111] bg-white shadow-[4px_4px_0px_0px_#111111] space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-[#111111] tracking-tight flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#111111]" />
                Reservation Status Breakdown
              </h2>
              <p className="text-xs text-[#4A4A4A] font-medium mt-0.5">
                Evaluation distribution over the last 30 days
              </p>
            </div>
            <span className="text-xs font-black px-2.5 py-1 rounded-full border-[2px] border-[#111111] bg-[#FFF9E6]">
              {totalStatusCount} total
            </span>
          </div>

          {statusEntries.length === 0 ? (
            <p className="text-xs font-bold text-[#4A4A4A] py-6 text-center">
              No reservation activity recorded in the evaluation window.
            </p>
          ) : (
            <div className="space-y-3.5">
              {statusEntries.map(([statusKey, count]) => {
                const config = STATUS_LABELS[statusKey] || {
                  label: statusKey.replace(/_/g, " "),
                  icon: Info,
                  color: "bg-[#9CA3AF]",
                };
                const Icon = config.icon;
                const percentage = totalStatusCount > 0 ? Math.round((count / totalStatusCount) * 100) : 0;

                return (
                  <div key={statusKey} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-[#111111]">
                        <Icon className="w-3.5 h-3.5 text-[#4A4A4A]" />
                        {config.label}
                      </span>
                      <span className="text-[#4A4A4A]">
                        {count} ({percentage}%)
                      </span>
                    </div>

                    {/* Simple CSS bar */}
                    <div className="h-3 w-full rounded-full border-[1.5px] border-[#111111] bg-[#FAF8F5] overflow-hidden">
                      <div
                        className={`h-full ${config.color} transition-all duration-300`}
                        style={{ width: `${Math.max(percentage, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Department Distribution Section */}
        <section aria-label="Department Sessions and Utilisation" className="p-6 rounded-2xl border-[3px] border-[#111111] bg-white shadow-[4px_4px_0px_0px_#111111] space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-[#111111] tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#111111]" />
                Department Distribution
              </h2>
              <p className="text-xs text-[#4A4A4A] font-medium mt-0.5">
                Session activity & equipment usage per campus faculty
              </p>
            </div>
          </div>

          {deptEntries.length === 0 ? (
            <p className="text-xs font-bold text-[#4A4A4A] py-6 text-center">
              No department session data available.
            </p>
          ) : (
            <div className="space-y-3.5">
              {deptEntries.map(([deptId, sessionsCount]) => {
                const deptMeta = kpis.departmentDetails[deptId] || { name: deptId, code: deptId.toUpperCase() };
                const percentage = Math.round((sessionsCount / maxDeptSessions) * 100);
                const deptUtil = kpis.utilisationByDepartment[deptId] ?? 0;

                return (
                  <div key={deptId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#111111] truncate max-w-[200px] sm:max-w-xs">
                        {deptMeta.name} ({deptMeta.code})
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[#111111]">{sessionsCount} sessions</span>
                        <span className="text-xs font-semibold text-[#4A4A4A]">({deptUtil}% util)</span>
                      </div>
                    </div>

                    {/* Simple CSS bar */}
                    <div className="h-3 w-full rounded-full border-[1.5px] border-[#111111] bg-[#FAF8F5] overflow-hidden">
                      <div
                        className="h-full bg-[#FFD60A] transition-all duration-300"
                        style={{ width: `${Math.max(percentage, 3)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Contention & Underutilized Equipment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Contended Resources */}
        <section aria-label="High Contention Equipment" className="p-6 rounded-2xl border-[3px] border-[#111111] bg-white shadow-[4px_4px_0px_0px_#111111] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-[#111111] tracking-tight flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#EF4444]" />
                Top Contended Resources
              </h2>
              <p className="text-xs text-[#4A4A4A] font-medium mt-0.5">
                Highest waitlist pressure and unfulfilled requests
              </p>
            </div>
          </div>

          {kpis.topContendedResources.length === 0 ? (
            <div className="p-6 rounded-xl border-[2px] border-dashed border-[#111111]/25 bg-[#FAF8F5] text-center">
              <p className="text-xs font-bold text-[#4A4A4A]">
                No contention hotspots detected. All requests currently accommodated.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {kpis.topContendedResources.slice(0, 5).map((item) => (
                <div
                  key={item.resourceId}
                  className="p-3.5 rounded-xl border-[2px] border-[#111111] bg-[#FFF9E6] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div>
                    <h3 className="font-black text-sm text-[#111111]">{item.name}</h3>
                    <p className="text-xs text-[#4A4A4A] font-semibold">
                      ID: {item.resourceId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border-[1.5px] border-[#111111] bg-[#FEE2E2] text-[#991B1B] text-xs font-black">
                      <Flame className="w-3.5 h-3.5" />
                      Score: {item.contentionScore}
                    </span>
                    <span className="text-xs text-[#4A4A4A] font-semibold">
                      ({item.waitlistCount} waitlist, {item.unfulfilledBookings} declined)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Underused Resources (< 20% utilisation) */}
        <section aria-label="Underutilized Resources" className="p-6 rounded-2xl border-[3px] border-[#111111] bg-white shadow-[4px_4px_0px_0px_#111111] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-[#111111] tracking-tight flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-[#4A4A4A]" />
                Underutilized Resources (&lt; 20%)
              </h2>
              <p className="text-xs text-[#4A4A4A] font-medium mt-0.5">
                Available equipment suitable for interdisciplinary cross-booking
              </p>
            </div>
          </div>

          {kpis.underusedResources.length === 0 ? (
            <div className="p-6 rounded-xl border-[2px] border-dashed border-[#111111]/25 bg-[#FAF8F5] text-center">
              <p className="text-xs font-bold text-[#4A4A4A]">
                All active resources meet or exceed the 20% minimum utilization threshold.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {kpis.underusedResources.slice(0, 5).map((item) => (
                <div
                  key={item.resourceId}
                  className="p-3.5 rounded-xl border-[2px] border-[#111111] bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div>
                    <h3 className="font-black text-sm text-[#111111]">{item.name}</h3>
                    <p className="text-xs text-[#4A4A4A] font-semibold">
                      {item.bookedHours}h booked of {item.availableHours}h open
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border-[1.5px] border-[#111111] bg-[#FAF8F5] text-[#111111] text-xs font-black">
                    {item.utilisationRate}% Utilisation
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Admin Module Navigation Cards */}
      <section aria-label="Administrative Modules" className="pt-4 border-t-[3px] border-[#111111]/10">
        <h2 className="text-lg font-black text-[#111111] tracking-tight mb-4">
          Administrative Controls & Policy Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/admin/policy"
            className="p-5 rounded-2xl border-[3px] border-[#111111] bg-white hover:bg-[#FFF9E6] shadow-[4px_4px_0px_0px_#111111] flex flex-col justify-between transition-all group min-h-[140px]"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase text-[#4A4A4A]">Allocation Rules</span>
                <Sliders className="w-5 h-5 text-[#111111]" />
              </div>
              <h3 className="font-black text-base text-[#111111] group-hover:underline">
                Fair Quotas & Policies
              </h3>
              <p className="text-xs text-[#4A4A4A] font-medium mt-1">
                Tune the 4 allocation weights, tiebreak order, and weekly session limits.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-black text-[#111111]">
              Manage Rules <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          <Link
            href="/dashboard/admin/insights"
            className="p-5 rounded-2xl border-[3px] border-[#111111] bg-white hover:bg-[#FFF9E6] shadow-[4px_4px_0px_0px_#111111] flex flex-col justify-between transition-all group min-h-[140px]"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase text-[#4A4A4A]">Algorithmic Engine</span>
                <Sparkles className="w-5 h-5 text-[#111111]" />
              </div>
              <h3 className="font-black text-base text-[#111111] group-hover:underline">
                AI Telemetry & Insights
              </h3>
              <p className="text-xs text-[#4A4A4A] font-medium mt-1">
                Live FastAPI telemetry, Jain&apos;s index, and slot recommendation tuning.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-black text-[#111111]">
              View Insights <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>

          <Link
            href="/dashboard/admin/audit"
            className="p-5 rounded-2xl border-[3px] border-[#111111] bg-white hover:bg-[#FFF9E6] shadow-[4px_4px_0px_0px_#111111] flex flex-col justify-between transition-all group min-h-[140px]"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase text-[#4A4A4A]">Transparency Log</span>
                <ScrollText className="w-5 h-5 text-[#111111]" />
              </div>
              <h3 className="font-black text-base text-[#111111] group-hover:underline">
                Algorithmic Audit Trails
              </h3>
              <p className="text-xs text-[#4A4A4A] font-medium mt-1">
                Inspect immutable decision records and verify policy compliance.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-black text-[#111111]">
              Inspect Audit Log <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </Link>
          <a
            href="/dashboard/admin/export"
            download
            className="p-5 rounded-2xl border-[3px] border-[#111111] bg-white hover:bg-[#FFF9E6] shadow-[4px_4px_0px_0px_#111111] flex flex-col justify-between transition-all group min-h-[140px]"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase text-[#4A4A4A]">Data Export</span>
                <Download className="w-5 h-5 text-[#111111]" />
              </div>
              <h3 className="font-black text-base text-[#111111] group-hover:underline">
                Export Utilisation CSV
              </h3>
              <p className="text-xs text-[#4A4A4A] font-medium mt-1">
                Stream a complete CSV report of campus equipment utilization rates.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-black text-[#111111]">
              Download CSV Report <Download className="w-3.5 h-3.5 ml-1" />
            </div>
          </a>
        </div>
      </section>
    </div>
  );
}
