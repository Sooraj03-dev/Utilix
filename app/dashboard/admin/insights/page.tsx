import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/auth/pages";
import { fetchAIInsights } from "./ai-insights-adapter";
import { loadAdminKpis, type AdminKpiReport } from "@/lib/db/kpis";
import type { AIInsightsResponse } from "@/lib/types";
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Cpu,
  BarChart2,
  TrendingUp,
  Scale,
  Flame,
  ArrowDownRight,
  Lightbulb,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/components/utils";

export const dynamic = "force-dynamic";

export default async function AdminInsightsPage() {
  const user = await requireSessionUser();
  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  let aiInsights: AIInsightsResponse | null = null;
  let aiError: string | null = null;

  try {
    aiInsights = await fetchAIInsights({ timeoutMs: 2500 });
  } catch (err: unknown) {
    aiError =
      err instanceof Error
        ? err.message
        : "Failed to connect to the Utilix AI service.";
  }

  // Load fallback local KPIs if AI service is offline
  let localKpis: AdminKpiReport | null = null;
  if (!aiInsights) {
    try {
      localKpis = await loadAdminKpis(30);
    } catch (kpiErr) {
      console.error("[AdminInsightsPage] Error loading local KPI fallback:", kpiErr);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="rounded-2xl border-[3px] border-[#111111] bg-white p-6 shadow-[4px_4px_0px_0px_#111111]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FFD60A] border-[2px] border-[#111111] text-xs font-black tracking-wide uppercase shadow-[2px_2px_0px_0px_#111111] mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#111111]" />
              AI Allocation Engine Telemetry
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
              Campus Intelligence & Fairness Insights
            </h1>
            <p className="mt-1 text-sm text-[#555555] font-medium max-w-2xl">
              Deep telemetry from the Utilix AI service evaluating equipment utilization,
              equity distribution coefficients, and autonomous resource balancing suggestions.
            </p>
          </div>

          <div>
            {aiInsights ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border-[2px] border-[#111111] bg-[#D8F3DC] text-xs font-black text-[#111111] shadow-[2px_2px_0px_0px_#111111]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2D6A4F] animate-pulse" />
                Live AI Service Telemetry
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border-[2px] border-[#111111] bg-[#FFE5D9] text-xs font-black text-[#9D0208] shadow-[2px_2px_0px_0px_#111111]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D00000]" />
                AI Service Offline (Fallback Active)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Fallback Path: When AI Service is Unreachable ── */}
      {!aiInsights && (
        <div className="space-y-6">
          {/* Error Banner with Retry */}
          <div className="rounded-2xl border-[3px] border-[#111111] bg-[#FFF0F0] p-6 shadow-[4px_4px_0px_0px_#111111]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF4D4D] border-[2px] border-[#111111] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_#111111] text-white">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#111111]">
                    AI Telemetry Microservice Unreachable
                  </h3>
                  <p className="text-xs sm:text-sm text-[#555555] mt-0.5">
                    {aiError || "The FastAPI AI service did not respond within the allocated timeout window."}
                  </p>
                </div>
              </div>

              <Link
                href="/dashboard/admin/insights"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-[2px] border-[#111111] bg-[#FFD60A] hover:bg-[#FFE047] text-xs font-black text-[#111111] shadow-[2px_2px_0px_0px_#111111] min-h-[44px]"
              >
                <RotateCcw className="w-4 h-4" />
                Retry Connection
              </Link>
            </div>
          </div>

          {/* Local Card: "Basic insights (AI unavailable)" */}
          {localKpis && (
            <div className="rounded-2xl border-[3px] border-[#111111] bg-white p-6 shadow-[4px_4px_0px_0px_#111111]">
              <div className="flex items-center justify-between pb-4 border-b-[2px] border-[#111111]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FFF9E6] border-[2px] border-[#111111] flex items-center justify-center shadow-[2px_2px_0px_0px_#111111]">
                    <Cpu className="w-4 h-4 text-[#111111]" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-[#111111]">
                      Basic insights (AI unavailable)
                    </h2>
                    <p className="text-xs text-[#555555] font-medium">
                      Calculated from local Firestore ledger & booking history over the last 30 days.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#111111]">
                  Deterministic Fallback
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                {/* Overall Utilisation */}
                <div className="p-4 rounded-xl border-[2px] border-[#111111] bg-[#FAF8F5] shadow-[2px_2px_0px_0px_#111111]">
                  <div className="text-xs font-black uppercase text-[#555555] mb-1">
                    Overall Utilisation Rate
                  </div>
                  <div className="text-2xl font-black text-[#111111]">
                    {localKpis.overallUtilisationRate}%
                  </div>
                  <p className="text-xs text-[#666666] mt-1 font-medium">
                    {localKpis.bookedSlotHours} hrs booked out of {localKpis.availableSlotHours} hrs capacity.
                  </p>
                </div>

                {/* Fairness Score */}
                <div className="p-4 rounded-xl border-[2px] border-[#111111] bg-[#FAF8F5] shadow-[2px_2px_0px_0px_#111111]">
                  <div className="text-xs font-black uppercase text-[#555555] mb-1">
                    Campus Fairness Metric
                  </div>
                  <div className="text-2xl font-black text-[#111111]">
                    {localKpis.fairness.score} / 100
                  </div>
                  <p className="text-xs text-[#666666] mt-1 font-medium">
                    {localKpis.fairness.label} (Gini: {localKpis.fairness.gini})
                  </p>
                </div>

                {/* Active Students */}
                <div className="p-4 rounded-xl border-[2px] border-[#111111] bg-[#FAF8F5] shadow-[2px_2px_0px_0px_#111111]">
                  <div className="text-xs font-black uppercase text-[#555555] mb-1">
                    Student Participation
                  </div>
                  <div className="text-2xl font-black text-[#111111]">
                    {localKpis.activeUsers.activeUsersCount} / {localKpis.activeUsers.totalUsersCount}
                  </div>
                  <p className="text-xs text-[#666666] mt-1 font-medium">
                    {localKpis.activeUsers.activeRate}% active allocation rate.
                  </p>
                </div>
              </div>

              {/* Contended and Underused Breakdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t-[2px] border-[#111111]/15">
                {/* Top Contended */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-[#D90429]" />
                    <h3 className="text-sm font-black text-[#111111] uppercase tracking-wide">
                      High Contention Equipment
                    </h3>
                  </div>
                  {localKpis.topContendedResources.length === 0 ? (
                    <p className="text-xs text-[#666666] italic">No high-contention bottlenecks observed.</p>
                  ) : (
                    <ul className="space-y-2">
                      {localKpis.topContendedResources.slice(0, 4).map((r) => (
                        <li
                          key={r.resourceId}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-[#CCCCCC] bg-[#FAF8F5] text-xs font-medium"
                        >
                          <span className="font-bold text-[#111111]">{r.name}</span>
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-white border border-[#DDDDDD] text-[#D90429]">
                            {r.waitlistCount} on waitlist
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Underused */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ArrowDownRight className="w-4 h-4 text-[#0077B6]" />
                    <h3 className="text-sm font-black text-[#111111] uppercase tracking-wide">
                      Underutilized Resources (&lt; 20%)
                    </h3>
                  </div>
                  {localKpis.underusedResources.length === 0 ? (
                    <p className="text-xs text-[#666666] italic">No severely underused resources observed.</p>
                  ) : (
                    <ul className="space-y-2">
                      {localKpis.underusedResources.slice(0, 4).map((r) => (
                        <li
                          key={r.resourceId}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-[#CCCCCC] bg-[#FAF8F5] text-xs font-medium"
                        >
                          <span className="font-bold text-[#111111]">{r.name}</span>
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-white border border-[#DDDDDD] text-[#0077B6]">
                            {r.utilisationRate}% utilization
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Live AI Insights Path: When AI Service is Connected ── */}
      {aiInsights && (
        <div className="space-y-6">
          {/* 1. Narrative Executive Summary */}
          {aiInsights.narrative && aiInsights.narrative.length > 0 && (
            <div className="rounded-2xl border-[3px] border-[#111111] bg-[#FFF9E6] p-6 shadow-[4px_4px_0px_0px_#111111]">
              <div className="flex items-center gap-2 pb-3 border-b-[2px] border-[#111111]/20">
                <Lightbulb className="w-5 h-5 text-[#111111]" />
                <h2 className="text-base sm:text-lg font-black text-[#111111]">
                  AI Synthesis & Key Findings
                </h2>
              </div>
              <ul className="mt-4 space-y-2.5">
                {aiInsights.narrative.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-sm font-medium text-[#222222] leading-relaxed"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#111111] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 2. Core Telemetry Metrics (Fairness, Gini, Jain) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Jain's Fairness Index */}
            <div className="rounded-2xl border-[3px] border-[#111111] bg-white p-5 shadow-[4px_4px_0px_0px_#111111]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[#555555]">
                  Jain&apos;s Fairness Index
                </span>
                <Scale className="w-4 h-4 text-[#111111]" />
              </div>
              <div className="mt-2 text-3xl font-black text-[#111111]">
                {aiInsights.jainFairnessIndex}
              </div>
              <p className="mt-1 text-xs text-[#666666] font-medium">
                Scale 0 to 1.0 (1.0 = mathematically perfect parity across all teams).
              </p>
            </div>

            {/* Gini Coefficient */}
            <div className="rounded-2xl border-[3px] border-[#111111] bg-white p-5 shadow-[4px_4px_0px_0px_#111111]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[#555555]">
                  Gini Inequality Index
                </span>
                <TrendingUp className="w-4 h-4 text-[#111111]" />
              </div>
              <div className="mt-2 text-3xl font-black text-[#111111]">
                {aiInsights.giniCoefficient}
              </div>
              <p className="mt-1 text-xs text-[#666666] font-medium">
                {aiInsights.giniCoefficient <= 0.35
                  ? "Evenly distributed across student body."
                  : "Moderate skew in booking distribution."}
              </p>
            </div>

            {/* AI Decision Health */}
            <div className="rounded-2xl border-[3px] border-[#111111] bg-white p-5 shadow-[4px_4px_0px_0px_#111111]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[#555555]">
                  Engine Fairness Rating
                </span>
                <ShieldCheck className="w-4 h-4 text-[#111111]" />
              </div>
              <div className="mt-2 text-2xl font-black text-[#111111] flex items-center gap-2">
                <span className="inline-block px-2.5 py-0.5 rounded-lg bg-[#D8F3DC] border border-[#111111] text-xs">
                  {aiInsights.jainFairnessIndex >= 0.85 ? "High Equity" : "Review Needed"}
                </span>
              </div>
              <p className="mt-2 text-xs text-[#666666] font-medium">
                Deterministic weights actively counteracting monopolization.
              </p>
            </div>
          </div>

          {/* 3. Underused & Over-Contended Resources Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Equipment Utilization */}
            <div className="rounded-2xl border-[3px] border-[#111111] bg-white p-6 shadow-[4px_4px_0px_0px_#111111]">
              <div className="flex items-center justify-between pb-3 border-b-[2px] border-[#111111]">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-[#111111]" />
                  <h3 className="text-base font-black text-[#111111]">
                    Equipment Utilization Telemetry
                  </h3>
                </div>
                <span className="text-xs text-[#666666] font-bold">From AI Service</span>
              </div>

              <div className="mt-4 space-y-3.5">
                {Object.entries(aiInsights.equipmentUtilization).map(([resId, rate]) => {
                  const percent = Math.round(rate * 100);
                  const isUnderused = percent < 45;
                  const isSaturated = percent >= 85;

                  return (
                    <div key={resId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="font-mono text-[#111111]">{resId}</span>
                        <span
                          className={cn(
                            "px-1.5 py-0.2 rounded font-black",
                            isSaturated && "text-[#D90429]",
                            isUnderused && "text-[#0077B6]",
                            !isSaturated && !isUnderused && "text-[#111111]"
                          )}
                        >
                          {percent}%
                          {isUnderused && " (Underutilized)"}
                          {isSaturated && " (Saturated)"}
                        </span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-[#FAF8F5] border border-[#111111] overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all duration-300",
                            isSaturated && "bg-[#FF4D4D]",
                            isUnderused && "bg-[#48CAE4]",
                            !isSaturated && !isUnderused && "bg-[#FFD60A]"
                          )}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Contention Rates */}
            <div className="rounded-2xl border-[3px] border-[#111111] bg-white p-6 shadow-[4px_4px_0px_0px_#111111]">
              <div className="flex items-center justify-between pb-3 border-b-[2px] border-[#111111]">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-[#D90429]" />
                  <h3 className="text-base font-black text-[#111111]">
                    Demand Contention Rates
                  </h3>
                </div>
                <span className="text-xs text-[#666666] font-bold">Requests / Slot Ratio</span>
              </div>

              <div className="mt-4 space-y-3">
                {Object.entries(aiInsights.contentionRate).map(([resId, rate]) => {
                  const isHighContention = rate >= 2.0;

                  return (
                    <div
                      key={resId}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border-[2px] border-[#111111] text-xs font-medium",
                        isHighContention ? "bg-[#FFF9E6]" : "bg-[#FAF8F5]"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {isHighContention ? (
                          <Flame className="w-4 h-4 text-[#D90429] shrink-0" />
                        ) : (
                          <ShieldCheck className="w-4 h-4 text-[#2D6A4F] shrink-0" />
                        )}
                        <span className="font-mono font-bold text-[#111111]">{resId}</span>
                      </div>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-lg border border-[#111111] font-black",
                          isHighContention
                            ? "bg-[#FFE5E5] text-[#D90429]"
                            : "bg-white text-[#111111]"
                        )}
                      >
                        {rate}x contention
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Autonomous Redistribution Recommendations */}
          <div className="rounded-2xl border-[3px] border-[#111111] bg-white p-6 shadow-[4px_4px_0px_0px_#111111]">
            <div className="flex items-center justify-between pb-3 border-b-[2px] border-[#111111]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#FFD60A]" />
                <h3 className="text-base font-black text-[#111111]">
                  AI Resource Redistribution Recommendations
                </h3>
              </div>
              <span className="text-xs text-[#555555] font-bold">
                {aiInsights.recommendations.length} Active Suggestions
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {aiInsights.recommendations.map((rec, idx) => {
                const urgency = (rec.urgency || "MEDIUM").toUpperCase();
                const isHigh = urgency === "HIGH";

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border-[2px] border-[#111111] bg-[#FAF8F5] shadow-[2px_2px_0px_0px_#111111] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-wider",
                            isHigh
                              ? "bg-[#FFE5E5] border-[#111111] text-[#D90429]"
                              : "bg-[#FFF9E6] border-[#111111] text-[#111111]"
                          )}
                        >
                          {urgency} Priority
                        </span>
                        <span className="text-xs font-black text-[#111111]">
                          {rec.resource}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-[#333333] leading-relaxed">
                        {rec.action}
                      </p>
                    </div>

                    <Link
                      href="/dashboard/admin/policy"
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-[2px] border-[#111111] bg-white hover:bg-[#FFD60A] text-xs font-black text-[#111111] shadow-[2px_2px_0px_0px_#111111] min-h-[44px]"
                    >
                      <span>Adjust Policy</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
