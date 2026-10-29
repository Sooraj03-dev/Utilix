"use client";

import React, { useState } from "react";
import type { Booking } from "../_lib/types";

interface DecisionExplanationProps {
  booking: Booking;
}

export function DecisionExplanation({ booking }: DecisionExplanationProps) {
  const [expanded, setExpanded] = useState(false);

  const isConfirmed = ["confirmed", "allocated", "pending_approval", "checked_out", "returned"].includes(
    booking.status,
  );
  const isWaitlisted = booking.status === "waitlisted";
  const source = booking.decision_source || "fallback";

  const scorePercent = Math.round((booking.allocation_score ?? 0.8) * 100);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mt-6">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              isConfirmed ? "bg-green-500" : isWaitlisted ? "bg-amber-500" : "bg-gray-400"
            }`}
          />
          <div>
            <h3 className="font-bold text-gray-900 text-base">Allocation Transparency & Decision Details</h3>
            <p className="text-xs text-gray-500">
              Evaluated under Policy {booking.policy_version || "v1"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
              source === "ai"
                ? "bg-purple-50 text-purple-700 border-purple-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}
          >
            {source === "ai" ? "✨ AI Allocation Engine" : "⚙️ Deterministic Fallback"}
          </span>

          <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-gray-100 text-gray-700">
            Score: {scorePercent}/100
          </span>
        </div>
      </div>

      {/* Main explanation body */}
      <div className="p-5">
        <div className="bg-amber-50/60 border border-amber-200/70 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2.5">
            <span className="text-lg">📢</span>
            <div>
              <p className="text-sm font-semibold text-amber-950 mb-0.5">Plain-Language Decision Summary</p>
              <p className="text-sm text-amber-900 leading-relaxed">
                {booking.decision_reason ||
                  (isConfirmed
                    ? "Your reservation was confirmed based on fair usage balance, project urgency, and available equipment capacity."
                    : "Slot is currently occupied or contended. Your request has been queued on the priority waitlist.")}
              </p>
            </div>
          </div>
        </div>

        {/* Toggleable Factor Breakdown */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1.5 transition-colors"
        >
          <span>{expanded ? "▼ Hide" : "▶ View"} Policy Factors & Scoring Weights</span>
        </button>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                <div className="flex justify-between font-medium text-gray-700 mb-1">
                  <span>Usage Fairness</span>
                  <span className="text-gray-500">Weight: 35%</span>
                </div>
                <p className="text-gray-500">Prioritizes students with fewer equipment sessions this month.</p>
              </div>

              <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                <div className="flex justify-between font-medium text-gray-700 mb-1">
                  <span>Queue Waiting Time</span>
                  <span className="text-gray-500">Weight: 25%</span>
                </div>
                <p className="text-gray-500">Rewards requests submitted earlier in the scheduling cycle.</p>
              </div>

              <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                <div className="flex justify-between font-medium text-gray-700 mb-1">
                  <span>Academic Need & Urgency</span>
                  <span className="text-gray-500">Weight: 20%</span>
                </div>
                <p className="text-gray-500">Evaluates course deadlines, capstone milestones, and urgency.</p>
              </div>

              <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                <div className="flex justify-between font-medium text-gray-700 mb-1">
                  <span>Interdisciplinary Collaboration</span>
                  <span className="text-gray-500">Weight: 20%</span>
                </div>
                <p className="text-gray-500">Supports cross-departmental team projects and diversity.</p>
              </div>
            </div>

            <div className="text-[11px] text-gray-400 mt-2">
              Rule reference: Utilix Campus Resource Allocation Policy (v1). Non-discriminatory algorithmic allocation with coordinator oversight.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
