"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Sliders,
  Coins,
  Clock,
  Scale,
  Sparkles,
  History,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Save,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  Input,
  Select,
  Button,
} from "@/components";
import type { Policy, PeakDefinition, TiebreakMethod, Weekday } from "@/lib/types";
import {
  normalizeWeights,
  diffPolicies,
  isPolicyEqual,
} from "@/lib/policy-diff";
import {
  savePolicyAction,
  restorePolicyAction,
  type PolicyFormData,
} from "../actions";

const TIEBREAK_LABELS: Record<TiebreakMethod, { title: string; desc: string }> = {
  fewest_sessions_month: {
    title: "1. Fewest Sessions This Month",
    desc: "Prioritizes students with least equipment time in current month.",
  },
  earliest_request: {
    title: "2. Earliest Submission Timestamp",
    desc: "Standard FIFO order when priority scores are tied.",
  },
  seeded_lottery: {
    title: "3. Deterministic Seeded Lottery",
    desc: "Pseudorandom seed tiebreak ensuring mathematically fair arbitration.",
  },
};

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface PolicyEditorProps {
  activePolicy: Policy;
  history: Policy[];
}

export function PolicyEditor({ activePolicy, history }: PolicyEditorProps) {
  const router = useRouter();

  // Form State
  const [monthlyCredits, setMonthlyCredits] = useState<number>(activePolicy.monthly_credits);
  const [freeSessionsPerWeek, setFreeSessionsPerWeek] = useState<number>(activePolicy.free_sessions_per_week);
  const [maxActiveBookings, setMaxActiveBookings] = useState<number>(activePolicy.max_active_bookings);
  const [slotMinutes, setSlotMinutes] = useState<number>(activePolicy.slot_minutes);
  const [cancelRefundHours, setCancelRefundHours] = useState<number>(activePolicy.cancel_refund_hours);
  const [deadlineWindowDays, setDeadlineWindowDays] = useState<number>(activePolicy.deadline_window_days);

  // Weights (0 to 100 scale)
  const initialNorm = normalizeWeights(activePolicy.weights);
  const [weights, setWeights] = useState({
    usage_fairness: Math.round(initialNorm.usage_fairness),
    waiting_time: Math.round(initialNorm.waiting_time),
    declared_need: Math.round(initialNorm.declared_need),
    interdisciplinary_bonus: Math.round(initialNorm.interdisciplinary_bonus),
  });

  // Tiebreak Order
  const [tiebreakOrder, setTiebreakOrder] = useState<TiebreakMethod[]>(
    activePolicy.tiebreak_order || ["fewest_sessions_month", "earliest_request", "seeded_lottery"]
  );

  // Peak slots
  const [peakSlots, setPeakSlots] = useState<PeakDefinition[]>(
    activePolicy.peak_definition || []
  );

  // State management
  const [isSaving, setIsSaving] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Compute live normalized shares
  const normalizedLive = useMemo(() => {
    return normalizeWeights(weights);
  }, [weights]);

  // Check diff against active policy
  const currentDiffs = useMemo(() => {
    const candidate = {
      monthly_credits: monthlyCredits,
      free_sessions_per_week: freeSessionsPerWeek,
      max_active_bookings: maxActiveBookings,
      slot_minutes: slotMinutes,
      cancel_refund_hours: cancelRefundHours,
      deadline_window_days: deadlineWindowDays,
      weights: {
        usage_fairness: normalizedLive.usage_fairness / 100,
        waiting_time: normalizedLive.waiting_time / 100,
        declared_need: normalizedLive.declared_need / 100,
        interdisciplinary_bonus: normalizedLive.interdisciplinary_bonus / 100,
      },
      tiebreak_order: tiebreakOrder,
      peak_definition: peakSlots,
    };
    return diffPolicies(activePolicy, candidate);
  }, [
    activePolicy,
    monthlyCredits,
    freeSessionsPerWeek,
    maxActiveBookings,
    slotMinutes,
    cancelRefundHours,
    deadlineWindowDays,
    normalizedLive,
    tiebreakOrder,
    peakSlots,
  ]);

  const hasChanges = currentDiffs.length > 0;

  // Move tiebreak item up
  const moveTiebreakUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...tiebreakOrder];
    const temp = newOrder[index - 1];
    newOrder[index - 1] = newOrder[index];
    newOrder[index] = temp;
    setTiebreakOrder(newOrder);
  };

  // Move tiebreak item down
  const moveTiebreakDown = (index: number) => {
    if (index === tiebreakOrder.length - 1) return;
    const newOrder = [...tiebreakOrder];
    const temp = newOrder[index + 1];
    newOrder[index + 1] = newOrder[index];
    newOrder[index] = temp;
    setTiebreakOrder(newOrder);
  };

  // Add peak slot
  const addPeakSlot = () => {
    setPeakSlots([
      ...peakSlots,
      { weekday: 1 as Weekday, start: "17:00", end: "21:00" },
    ]);
  };

  // Remove peak slot
  const removePeakSlot = (index: number) => {
    setPeakSlots(peakSlots.filter((_, i) => i !== index));
  };

  // Update peak slot
  const updatePeakSlot = (index: number, field: keyof PeakDefinition, value: any) => {
    const updated = [...peakSlots];
    updated[index] = { ...updated[index], [field]: value };
    setPeakSlots(updated);
  };

  // Submit Handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) {
      setMessage({
        text: "No changes detected. You must modify at least one policy parameter to create a new version.",
        type: "error",
      });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const payload: PolicyFormData = {
      monthly_credits: monthlyCredits,
      free_sessions_per_week: freeSessionsPerWeek,
      max_active_bookings: maxActiveBookings,
      slot_minutes: slotMinutes,
      cancel_refund_hours: cancelRefundHours,
      deadline_window_days: deadlineWindowDays,
      weights,
      tiebreak_order: tiebreakOrder,
      peak_definition: peakSlots,
    };

    try {
      const res = await savePolicyAction(payload);
      if (!res.success) {
        setMessage({ text: res.error || "Failed to save policy.", type: "error" });
      } else {
        setMessage({
          text: `Success! Created new Policy version v${res.version}. Diff: ${res.diffSummary}`,
          type: "success",
        });
        router.refresh();
      }
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : "An unexpected error occurred.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  // Restore Handler
  const handleRestore = async (version: number) => {
    if (!confirm(`Create a new policy version by restoring configuration from v${version}?`)) {
      return;
    }

    setRestoringVersion(version);
    setMessage(null);

    try {
      const res = await restorePolicyAction(version);
      if (!res.success) {
        setMessage({ text: res.error || "Failed to restore version.", type: "error" });
      } else {
        setMessage({
          text: `Restored! Created Policy v${res.newVersion} matching v${res.restoredFrom}.`,
          type: "success",
        });
        router.refresh();
      }
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : "Error restoring version.", type: "error" });
    } finally {
      setRestoringVersion(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Toast alert banner */}
      {message && (
        <div
          className={`p-4 rounded-xl border-[2.5px] border-[#111111] text-sm font-bold flex items-start gap-3 ${
            message.type === "success"
              ? "bg-[#DCFCE7] text-[#166534]"
              : "bg-[#FEE2E2] text-[#EF4444]"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* "What this changes" Panel */}
      <section aria-label="Active Policy Impact" className="p-6 rounded-2xl border-[3px] border-[#111111] bg-[#FFD60A] shadow-[4px_4px_0px_0px_#111111]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border-[2px] border-[#111111] bg-white text-xs font-black uppercase tracking-wide">
              <Zap className="w-3.5 h-3.5" />
              Active System Policy • Version {activePolicy.version}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight mt-2">
              What This Policy Changes Across Utilix
            </h2>
            <p className="text-xs sm:text-sm text-[#111111]/80 font-semibold mt-1">
              Changes take effect immediately across all student dashboards, eligibility checks, and AI allocation rounds.
            </p>
          </div>
        </div>

        {/* 3 Headline Metrics */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border-[2.5px] border-[#111111] bg-white shadow-[2px_2px_0px_0px_#111111]">
            <span className="text-xs font-black uppercase text-[#4A4A4A] tracking-wider">
              Free Weekly Sessions
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#111111]">{freeSessionsPerWeek}</span>
              <span className="text-xs text-[#4A4A4A] font-semibold">sessions / week</span>
            </div>
            <p className="text-xs text-[#4A4A4A] mt-1">
              {freeSessionsPerWeek !== activePolicy.free_sessions_per_week && (
                <span className="text-[#EF4444] font-bold">
                  (Changing from {activePolicy.free_sessions_per_week})
                </span>
              )}
            </p>
          </div>

          <div className="p-4 rounded-xl border-[2.5px] border-[#111111] bg-white shadow-[2px_2px_0px_0px_#111111]">
            <span className="text-xs font-black uppercase text-[#4A4A4A] tracking-wider">
              Monthly Credit Grant
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#111111]">{monthlyCredits}</span>
              <span className="text-xs text-[#4A4A4A] font-semibold">credits / month</span>
            </div>
            <p className="text-xs text-[#4A4A4A] mt-1">
              {monthlyCredits !== activePolicy.monthly_credits && (
                <span className="text-[#EF4444] font-bold">
                  (Changing from {activePolicy.monthly_credits})
                </span>
              )}
            </p>
          </div>

          <div className="p-4 rounded-xl border-[2.5px] border-[#111111] bg-white shadow-[2px_2px_0px_0px_#111111]">
            <span className="text-xs font-black uppercase text-[#4A4A4A] tracking-wider">
              Max Active Bookings
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#111111]">{maxActiveBookings}</span>
              <span className="text-xs text-[#4A4A4A] font-semibold">concurrent slots</span>
            </div>
            <p className="text-xs text-[#4A4A4A] mt-1">
              {maxActiveBookings !== activePolicy.max_active_bookings && (
                <span className="text-[#EF4444] font-bold">
                  (Changing from {activePolicy.max_active_bookings})
                </span>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Main 2-Column Layout: Editor Form & Version History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (8 cols): Versioned Policy Editor Form */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl border-[3px] border-[#111111] bg-white shadow-[4px_4px_0px_0px_#111111] space-y-6">
            <div>
              <h3 className="text-xl font-black text-[#111111] tracking-tight flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#111111]" />
                Fair Allocation Parameters
              </h3>
              <p className="text-xs text-[#4A4A4A] font-medium mt-0.5">
                Adjust campus sharing limits and allocation weights. Submitting creates a new immutable version.
              </p>
            </div>

            {/* Section 1: Credits & Free Access */}
            <div className="space-y-4 pt-2 border-t-[2px] border-[#111111]/10">
              <h4 className="text-sm font-black uppercase tracking-wider text-[#111111] flex items-center gap-1.5">
                <Coins className="w-4 h-4" />
                1. Credits & Free Access
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  type="number"
                  min={0}
                  step={1}
                  label="Monthly Credits Grant *"
                  helperText="Credits automatically granted on 1st of month"
                  value={monthlyCredits}
                  onChange={(e) => setMonthlyCredits(Number(e.target.value))}
                  required
                />
                <Input
                  type="number"
                  min={0}
                  step={1}
                  label="Free Sessions per Week *"
                  helperText="Weekly 0-credit baseline sessions"
                  value={freeSessionsPerWeek}
                  onChange={(e) => setFreeSessionsPerWeek(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            {/* Section 2: Session Limits */}
            <div className="space-y-4 pt-4 border-t-[2px] border-[#111111]/10">
              <h4 className="text-sm font-black uppercase tracking-wider text-[#111111] flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                2. Booking Limits & Deadlines
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  type="number"
                  min={1}
                  step={1}
                  label="Max Concurrent Bookings *"
                  helperText="Active unreturned sessions per student"
                  value={maxActiveBookings}
                  onChange={(e) => setMaxActiveBookings(Number(e.target.value))}
                  required
                />
                <Input
                  type="number"
                  min={15}
                  step={15}
                  label="Standard Slot Minutes *"
                  helperText="Default time granularity (e.g. 60m)"
                  value={slotMinutes}
                  onChange={(e) => setSlotMinutes(Number(e.target.value))}
                  required
                />
                <Input
                  type="number"
                  min={0}
                  step={1}
                  label="Cancellation Refund Window (Hours) *"
                  helperText="Hours before start for 100% refund"
                  value={cancelRefundHours}
                  onChange={(e) => setCancelRefundHours(Number(e.target.value))}
                  required
                />
                <Input
                  type="number"
                  min={1}
                  step={1}
                  label="Deadline Need Window (Days) *"
                  helperText="Days before coursework due date"
                  value={deadlineWindowDays}
                  onChange={(e) => setDeadlineWindowDays(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            {/* Section 3: Priority Weights (0-100 with live normalized share) */}
            <div className="space-y-4 pt-4 border-t-[2px] border-[#111111]/10">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black uppercase tracking-wider text-[#111111] flex items-center gap-1.5">
                  <Scale className="w-4 h-4" />
                  3. Allocation Priority Weights (0 to 100)
                </h4>
                <span className="text-xs font-black text-[#111111] bg-[#FFF9E6] px-2 py-0.5 rounded border border-[#111111]">
                  Sums to 100%
                </span>
              </div>
              <p className="text-xs text-[#4A4A4A] font-medium">
                Adjust the relative importance of each fairness factor. Normalized shares are computed live and strictly sum to 100%.
              </p>

              {/* Live Weight Distribution Bar */}
              <div className="h-4 w-full rounded-full border-[2px] border-[#111111] overflow-hidden flex bg-[#FAF8F5]">
                <div style={{ width: `${normalizedLive.usage_fairness}%` }} className="h-full bg-[#22C55E]" title={`Usage: ${normalizedLive.usage_fairness}%`} />
                <div style={{ width: `${normalizedLive.waiting_time}%` }} className="h-full bg-[#38BDF8]" title={`Waiting: ${normalizedLive.waiting_time}%`} />
                <div style={{ width: `${normalizedLive.declared_need}%` }} className="h-full bg-[#FFD60A]" title={`Need: ${normalizedLive.declared_need}%`} />
                <div style={{ width: `${normalizedLive.interdisciplinary_bonus}%` }} className="h-full bg-[#C084FC]" title={`Interdisciplinary: ${normalizedLive.interdisciplinary_bonus}%`} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Usage Fairness */}
                <div className="p-3.5 rounded-xl border-[2px] border-[#111111] bg-[#FAF8F5] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-[#111111]">Usage Fairness</label>
                    <span className="text-xs font-bold text-[#166534] bg-[#DCFCE7] px-2 py-0.5 rounded border border-[#166534]">
                      {normalizedLive.usage_fairness}% share
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={weights.usage_fairness}
                    onChange={(e) => setWeights({ ...weights, usage_fairness: Number(e.target.value) })}
                    className="w-full accent-[#22C55E] cursor-pointer"
                  />
                  <div className="text-[11px] text-[#4A4A4A]">Raw weight value: {weights.usage_fairness}</div>
                </div>

                {/* Waiting Time */}
                <div className="p-3.5 rounded-xl border-[2px] border-[#111111] bg-[#FAF8F5] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-[#111111]">Waiting Time</label>
                    <span className="text-xs font-bold text-[#0369A1] bg-[#E0F2FE] px-2 py-0.5 rounded border border-[#0369A1]">
                      {normalizedLive.waiting_time}% share
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={weights.waiting_time}
                    onChange={(e) => setWeights({ ...weights, waiting_time: Number(e.target.value) })}
                    className="w-full accent-[#38BDF8] cursor-pointer"
                  />
                  <div className="text-[11px] text-[#4A4A4A]">Raw weight value: {weights.waiting_time}</div>
                </div>

                {/* Declared Need */}
                <div className="p-3.5 rounded-xl border-[2px] border-[#111111] bg-[#FAF8F5] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-[#111111]">Declared Academic Need</label>
                    <span className="text-xs font-bold text-[#854D0E] bg-[#FEF08A] px-2 py-0.5 rounded border border-[#854D0E]">
                      {normalizedLive.declared_need}% share
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={weights.declared_need}
                    onChange={(e) => setWeights({ ...weights, declared_need: Number(e.target.value) })}
                    className="w-full accent-[#FFD60A] cursor-pointer"
                  />
                  <div className="text-[11px] text-[#4A4A4A]">Raw weight value: {weights.declared_need}</div>
                </div>

                {/* Interdisciplinary Bonus */}
                <div className="p-3.5 rounded-xl border-[2px] border-[#111111] bg-[#FAF8F5] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-[#111111]">Interdisciplinary Bonus</label>
                    <span className="text-xs font-bold text-[#6B21A8] bg-[#F3E8FF] px-2 py-0.5 rounded border border-[#6B21A8]">
                      {normalizedLive.interdisciplinary_bonus}% share
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={weights.interdisciplinary_bonus}
                    onChange={(e) => setWeights({ ...weights, interdisciplinary_bonus: Number(e.target.value) })}
                    className="w-full accent-[#C084FC] cursor-pointer"
                  />
                  <div className="text-[11px] text-[#4A4A4A]">Raw weight value: {weights.interdisciplinary_bonus}</div>
                </div>
              </div>
            </div>

            {/* Section 4: Tiebreak Order (Reorderable) */}
            <div className="space-y-4 pt-4 border-t-[2px] border-[#111111]/10">
              <h4 className="text-sm font-black uppercase tracking-wider text-[#111111] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                4. Tie-Breaker Execution Order
              </h4>
              <p className="text-xs text-[#4A4A4A] font-medium">
                When students tie on overall allocation score, criteria are evaluated in this strict priority:
              </p>

              <div className="space-y-2">
                {tiebreakOrder.map((method, index) => {
                  const meta = TIEBREAK_LABELS[method] || { title: method, desc: "" };
                  return (
                    <div
                      key={method}
                      className="p-3 rounded-xl border-[2px] border-[#111111] bg-[#FAF8F5] flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-black text-sm text-[#111111]">
                          #{index + 1}. {meta.title.replace(/^[0-9]\.\s*/, "")}
                        </div>
                        <p className="text-xs text-[#4A4A4A] font-medium">{meta.desc}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveTiebreakUp(index)}
                          disabled={index === 0}
                          aria-label={`Move ${method} up`}
                          className="p-1.5 rounded-lg border-[1.5px] border-[#111111] bg-white hover:bg-[#FFD60A] disabled:opacity-30 disabled:hover:bg-white min-h-[36px] min-w-[36px] flex items-center justify-center"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveTiebreakDown(index)}
                          disabled={index === tiebreakOrder.length - 1}
                          aria-label={`Move ${method} down`}
                          className="p-1.5 rounded-lg border-[1.5px] border-[#111111] bg-white hover:bg-[#FFD60A] disabled:opacity-30 disabled:hover:bg-white min-h-[36px] min-w-[36px] flex items-center justify-center"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 5: Peak Slots Definition */}
            <div className="space-y-4 pt-4 border-t-[2px] border-[#111111]/10">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wider text-[#111111] flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    5. Peak Hours Schedule
                  </h4>
                  <p className="text-xs text-[#4A4A4A] font-medium mt-0.5">
                    Hours when baseline free sessions are restricted and credit costs apply.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addPeakSlot}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border-[2px] border-[#111111] bg-[#FFD60A] font-black text-xs min-h-[44px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Peak Window
                </button>
              </div>

              {peakSlots.length === 0 ? (
                <p className="text-xs font-bold text-[#4A4A4A] p-4 text-center border-[2px] border-dashed border-[#111111]/30 rounded-xl">
                  No peak slots configured. All availability windows operate under standard rules.
                </p>
              ) : (
                <div className="space-y-2">
                  {peakSlots.map((slot, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border-[2px] border-[#111111] bg-[#FAF8F5] flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={slot.weekday}
                          onChange={(e) => updatePeakSlot(idx, "weekday", Number(e.target.value))}
                          className="px-2 py-1 text-xs font-bold rounded-lg border-[1.5px] border-[#111111] bg-white"
                        >
                          {WEEKDAY_NAMES.map((name, dayNum) => (
                            <option key={dayNum} value={dayNum}>
                              {name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="time"
                          value={slot.start}
                          onChange={(e) => updatePeakSlot(idx, "start", e.target.value)}
                          className="px-2 py-1 text-xs font-bold rounded-lg border-[1.5px] border-[#111111] bg-white"
                        />
                        <span className="text-xs font-bold text-[#4A4A4A]">to</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(e) => updatePeakSlot(idx, "end", e.target.value)}
                          className="px-2 py-1 text-xs font-bold rounded-lg border-[1.5px] border-[#111111] bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removePeakSlot(idx)}
                        aria-label="Remove peak slot"
                        className="p-1.5 text-[#EF4444] hover:bg-[#FEE2E2] rounded-lg border-[1.5px] border-[#111111] min-h-[36px] min-w-[36px] flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Diff Preview before saving */}
            {hasChanges && (
              <div className="p-4 rounded-xl border-[2px] border-[#111111] bg-[#FFF9E6] space-y-2">
                <span className="text-xs font-black uppercase text-[#111111]">
                  Pending Changes to be committed as v{activePolicy.version + 1}:
                </span>
                <ul className="text-xs font-semibold text-[#111111] list-disc list-inside space-y-1">
                  {currentDiffs.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-between gap-4">
              <span className="text-xs text-[#4A4A4A] font-semibold">
                {!hasChanges ? "No changes made yet" : `${currentDiffs.length} change(s) staged`}
              </span>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSaving}
                disabled={!hasChanges}
                leftIcon={<Save className="w-4 h-4" />}
                className="min-h-[44px]"
              >
                Create Policy Version v{activePolicy.version + 1}
              </Button>
            </div>
          </div>
        </form>

        {/* Right Column (5 cols): Version History List & Restore */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl border-[3px] border-[#111111] bg-white shadow-[4px_4px_0px_0px_#111111] space-y-4">
            <div>
              <h3 className="text-xl font-black text-[#111111] tracking-tight flex items-center gap-2">
                <History className="w-5 h-5 text-[#111111]" />
                Policy Version History
              </h3>
              <p className="text-xs text-[#4A4A4A] font-medium mt-0.5">
                Every policy update creates a new immutable version. You can restore any historical version as a new active version.
              </p>
            </div>

            <div className="divide-y-[2px] divide-[#111111]/10 max-h-[750px] overflow-y-auto">
              {history.map((versionItem, index) => {
                const isActive = versionItem.is_active;
                const nextOlder = history[index + 1];
                const versionDiffs = nextOlder ? diffPolicies(nextOlder, versionItem) : ["Initial system policy version"];
                const isRestoring = restoringVersion === versionItem.version;

                return (
                  <div key={versionItem.id} className="py-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-base text-[#111111]">
                          Version v{versionItem.version}
                        </span>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border-[1.5px] border-[#111111] bg-[#22C55E] text-[#111111] font-black text-xs uppercase shadow-[1px_1px_0px_0px_#111111]">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </span>
                        )}
                      </div>

                      {!isActive && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          isLoading={isRestoring}
                          onClick={() => handleRestore(versionItem.version)}
                          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                          className="min-h-[44px] text-xs font-black"
                        >
                          Restore as New
                        </Button>
                      )}
                    </div>

                    <div className="text-xs text-[#4A4A4A] font-semibold">
                      Author: <span className="text-[#111111] font-bold">{versionItem.created_by || "system"}</span> •{" "}
                      {versionItem.created_at?.slice(0, 10)}
                    </div>

                    {/* Diff description */}
                    <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-[#111111]/20 text-xs">
                      <span className="font-bold text-[#4A4A4A] block mb-0.5">Changes:</span>
                      <ul className="list-disc list-inside space-y-0.5 text-[#111111]">
                        {versionDiffs.slice(0, 3).map((d, idx) => (
                          <li key={idx} className="capitalize">{d}</li>
                        ))}
                        {versionDiffs.length > 3 && (
                          <li className="text-[#4A4A4A]">+{versionDiffs.length - 3} more updates</li>
                        )}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
