"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Scale,
  Sparkles,
  Award,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Info,
} from "lucide-react";
import { cn } from "./utils";
import { AllocationDecision } from "./types";

export interface DecisionPanelProps {
  decision?: AllocationDecision;
  compact?: boolean;
  className?: string;
}

const DEFAULT_DEMO_DECISION: AllocationDecision = {
  requestId: "REQ-2026-882",
  resourceName: "Prusa XL 5-Toolhead 3D Printer (Slot: 14:00 - 17:00)",
  outcome: "APPROVED",
  score: 88,
  maxPossibleScore: 100,
  headlineSummary: "Approved: High-impact Capstone + Cross-disciplinary team boost",
  plainLanguageReason:
    "Your reservation was selected over 3 competing requests because your team pairs Mechanical Engineering with Architecture for an accredited Capstone deadline, and both members maintain a 100% on-time return trust record.",
  ruleCitations: [
    "Rule 1: Academic Curricular Priority",
    "Rule 3: Cross-Disciplinary Team Multiplier (+15%)",
    "Rule 5: Reliable Return Trust Rating (+10%)",
    "Rule 8: Anti-Hoarding Slot Limit Check (Passed)",
  ],
  factors: [
    {
      factor: "Academic Milestone Urgency",
      weight: "High",
      status: "positive",
      description: "Senior Capstone submission due within 10 days.",
      pointsContribution: "+35 pts",
    },
    {
      factor: "Interdisciplinary Team Composition",
      weight: "High",
      status: "positive",
      description: "Team includes ME + Architecture students working collaboratively.",
      pointsContribution: "+25 pts",
    },
    {
      factor: "Reliability & Return Reputation",
      weight: "Medium",
      status: "positive",
      description: "Zero strikes in the past 60 days, verified on-time check-in history.",
      pointsContribution: "+20 pts",
    },
    {
      factor: "Resource Quota Usage",
      weight: "Normal",
      status: "positive",
      description: "Under weekly cap of 6 hours for high-precision 3D fabrication.",
      pointsContribution: "+8 pts",
    },
  ],
  alternativeSlots: [
    "Tomorrow, 09:00 - 12:00 (Low demand window)",
    "Friday, 13:00 - 16:00 (Open baseline)",
  ],
  coordinatorNotes: "Verified student has completed Lab Safety Level 2 certification.",
  timestamp: "Oct 29, 2026 • 11:15 AM",
};

export function DecisionPanel({
  decision = DEFAULT_DEMO_DECISION,
  compact = false,
  className,
}: DecisionPanelProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);

  const outcomeColors = {
    APPROVED: {
      badgeBg: "bg-[#22C55E] text-[#111111]",
      icon: CheckCircle2,
      scoreFill: "bg-[#22C55E]",
    },
    WAITLISTED: {
      badgeBg: "bg-[#F59E0B] text-[#111111]",
      icon: Clock,
      scoreFill: "bg-[#F59E0B]",
    },
    ESCALATED: {
      badgeBg: "bg-[#38BDF8] text-[#111111]",
      icon: Scale,
      scoreFill: "bg-[#38BDF8]",
    },
    BLOCKED: {
      badgeBg: "bg-[#EF4444] text-white",
      icon: AlertTriangle,
      scoreFill: "bg-[#EF4444]",
    },
  }[decision.outcome];

  const OutcomeIcon = outcomeColors.icon;

  return (
    <div
      className={cn(
        "rounded-3xl border-[4px] border-[#111111] bg-[#FFF8E7] p-5 sm:p-7 shadow-[7px_7px_0px_0px_#111111] transition-all relative overflow-hidden",
        className
      )}
    >
      {/* Decorative Corner Geometric Accent */}
      <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none select-none overflow-hidden">
        <div className="w-8 h-8 bg-[#FFD60A] border-b-[3px] border-l-[3px] border-[#111111] absolute top-0 right-0 rotate-0" />
      </div>

      {/* Top Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FFD60A] border-[3px] border-[#111111] shadow-[3px_3px_0px_#111] flex items-center justify-center flex-shrink-0">
            <Scale className="w-6 h-6 text-[#111111] stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase bg-[#38BDF8] text-[#111111] border-[1.5px] border-[#111111] px-2 py-0.5 rounded-md">
                Signature Fair Allocation Logic
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#FFFEF2] border-[1.5px] border-[#111111] text-[#111111] font-mono font-bold">
                {decision.requestId}
              </span>
            </div>
            <h4 className="text-lg sm:text-2xl font-black text-[#111111] tracking-tight mt-1">
              Why this decision?
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2 mr-6 sm:mr-0">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border-[2.5px] border-[#111111] shadow-[2.5px_2.5px_0px_#111]",
              outcomeColors.badgeBg
            )}
          >
            <OutcomeIcon className="w-3.5 h-3.5 stroke-[3]" />
            <span>{decision.outcome}</span>
          </span>
          {compact && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-9 h-9 rounded-xl bg-[#FFF8E7] border-[2px] border-[#111111] shadow-[2px_2px_0px_#111] flex items-center justify-center text-[#111111] hover:bg-[#FFD60A] active:translate-x-0.5 active:translate-y-0.5 transition"
              aria-label={isExpanded ? "Collapse panel" : "Expand panel"}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4 stroke-[3]" /> : <ChevronDown className="w-4 h-4 stroke-[3]" />}
            </button>
          )}
        </div>
      </div>

      {/* Plain Language Explanation (Signature box) */}
      <div className="mt-5 p-4 rounded-2xl bg-[#FFFEF2] border-[3px] border-[#111111] shadow-[3px_3px_0px_#111]">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#FFD60A] border-[2px] border-[#111111] flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-[#111111] stroke-[2.5]" />
          </div>
          <div className="text-xs sm:text-sm text-[#111111] leading-relaxed space-y-1">
            <p className="font-black text-[#111111] text-sm sm:text-base">
              {decision.headlineSummary}
            </p>
            <p className="font-medium text-[#111111]/90">
              {decision.plainLanguageReason}
            </p>
          </div>
        </div>
      </div>

      {/* Expanded Factor Breakdown */}
      {isExpanded && (
        <div className="mt-5 space-y-5 pt-4 border-t-[3px] border-[#111111]">
          {/* Composite Fairness Score Bar */}
          <div className="bg-[#FFFEF2] p-4 rounded-2xl border-[3px] border-[#111111] shadow-[3px_3px_0px_#111]">
            <div className="flex items-center justify-between text-xs sm:text-sm mb-2 font-black text-[#111111]">
              <span className="flex items-center gap-1.5">
                <Award className="w-4 h-4 stroke-[2.5]" />
                Fairness Priority Composite Score
              </span>
              <span className="font-mono text-base px-2 py-0.5 rounded bg-[#FFD60A] border-[2px] border-[#111111]">
                {decision.score} / {decision.maxPossibleScore} pts
              </span>
            </div>
            {/* Chunky Brutalist Progress Bar */}
            <div className="w-full bg-[#E5DCC5] rounded-full h-4 border-[2.5px] border-[#111111] overflow-hidden p-0.5">
              <div
                className={cn("h-full rounded-full border-r-[2px] border-[#111111] transition-all duration-300", outcomeColors.scoreFill)}
                style={{ width: `${(decision.score / decision.maxPossibleScore) * 100}%` }}
              />
            </div>
            <p className="text-[11px] font-bold text-[#111111]/70 mt-2">
              Scores are calculated mathematically to prevent hoarding while guaranteeing accredited project deadlines.
            </p>
          </div>

          {/* Factor Items Grid */}
          <div>
            <h5 className="text-xs font-black uppercase tracking-wider text-[#111111] mb-2.5">
              Evaluation Factors Breakdown
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {decision.factors.map((f, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-[#FFFEF2] rounded-2xl border-[2.5px] border-[#111111] shadow-[3px_3px_0px_#111] flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-[#111111] truncate">
                      {f.factor}
                    </span>
                    <span className="text-[10px] uppercase font-mono font-black px-2 py-0.5 rounded-full bg-[#FFD60A] text-[#111111] border-[1.5px] border-[#111111]">
                      {f.weight} Wt
                    </span>
                  </div>
                  <p className="text-xs font-medium text-[#111111]/80 mt-1 leading-snug">
                    {f.description}
                  </p>
                  {f.pointsContribution && (
                    <span className="text-xs font-black text-[#22C55E] mt-2 self-end bg-[#22C55E]/15 px-2 py-0.5 rounded border border-[#111111]">
                      {f.pointsContribution}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Rule Citations */}
          <div className="p-3.5 bg-[#FFFEF2] rounded-2xl border-[2.5px] border-[#111111] shadow-[3px_3px_0px_#111]">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#111111] block mb-2">
              Fair Allocation Rules Applied
            </span>
            <div className="flex flex-wrap gap-2">
              {decision.ruleCitations.map((rule, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl bg-[#FFD60A] border-[2px] border-[#111111] text-[#111111] shadow-[1.5px_1.5px_0px_#111]"
                >
                  <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                  {rule}
                </span>
              ))}
            </div>
          </div>

          {/* Footnote timestamp & coordinator note */}
          {decision.coordinatorNotes && (
            <div className="flex items-start gap-2 text-xs font-bold text-[#111111]/80">
              <Info className="w-4 h-4 text-[#111111] flex-shrink-0 mt-0.5 stroke-[2.5]" />
              <span>Coordinator Note: {decision.coordinatorNotes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
