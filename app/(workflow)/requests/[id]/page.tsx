/* ═══════════════════════════════════════════════════════════════════════════
 * Request Detail Page — View a single booking request with full details,
 * status, AI explanation, and alternative suggestions.
 * Owner B · app/(workflow)/requests/[id]/page.tsx
 * ═══════════════════════════════════════════════════════════════════════════ */
"use client";

import { useEffect, useState, use, Suspense } from "react";
import Link from "next/link";
import type { Booking, BookingStatus } from "../../_lib/types";
import { canTransition } from "@/lib/types/status";
import { DecisionExplanation } from "../../_components/DecisionExplanation";

const STATUS_STYLES: Record<
  BookingStatus,
  { bg: string; text: string; label: string; icon: string }
> = {
  submitted: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Submitted", icon: "⏳" },
  eligibility_passed: { bg: "bg-blue-100", text: "text-blue-800", label: "Eligibility Passed", icon: "✔️" },
  allocated: { bg: "bg-indigo-100", text: "text-indigo-800", label: "Allocated", icon: "🎯" },
  waitlisted: { bg: "bg-amber-100", text: "text-amber-800", label: "Waitlisted", icon: "📋" },
  pending_approval: { bg: "bg-orange-100", text: "text-orange-800", label: "Pending Approval", icon: "⏳" },
  confirmed: { bg: "bg-green-100", text: "text-green-800", label: "Confirmed", icon: "✅" },
  checked_out: { bg: "bg-purple-100", text: "text-purple-800", label: "Checked Out", icon: "📦" },
  returned: { bg: "bg-teal-100", text: "text-teal-800", label: "Returned", icon: "🔄" },
  cancelled: { bg: "bg-gray-100", text: "text-gray-600", label: "Cancelled", icon: "🚫" },
  rejected: { bg: "bg-red-100", text: "text-red-800", label: "Rejected", icon: "❌" },
  no_show: { bg: "bg-rose-100", text: "text-rose-800", label: "No Show", icon: "⚠️" },
};

function RequestDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [request, setRequest] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    async function fetchRequest() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/workflow/requests/${id}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message || json.error || "Failed to load request");
        setRequest(json.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Request not found");
      } finally {
        setLoading(false);
      }
    }
    fetchRequest();
  }, [id]);

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/workflow/requests/${id}/cancel`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || json.error || "Failed to cancel request");
      setRequest(json.data.booking ?? json.data);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to cancel request");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-utilix-yellow border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading request…</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
          <p className="font-medium">Request not found</p>
          <p className="text-sm mt-1">{error ?? "This request does not exist."}</p>
          <Link
            href="/requests"
            className="inline-block mt-4 text-sm font-medium text-utilix-black hover:text-utilix-yellow"
          >
            ← Back to requests
          </Link>
        </div>
      </div>
    );
  }

  const style = STATUS_STYLES[request.status] ?? STATUS_STYLES.submitted;
  const isCancellable = canTransition(request.status, "cancelled");

  const date = request.slot_start ? request.slot_start.split("T")[0] : "";
  const startTime = request.slot_start ? request.slot_start.slice(11, 16) : "";
  const endTime = request.slot_end ? request.slot_end.slice(11, 16) : "";

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/requests"
        className="inline-block mb-4 text-sm text-gray-500 hover:text-utilix-black"
      >
        ← Back to requests
      </Link>

      {/* Status Banner */}
      <div className={`rounded-xl p-5 mb-6 ${style.bg} border border-opacity-30`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{style.icon}</span>
          <div>
            <h2 className={`text-lg font-bold ${style.text}`}>
              {style.label}
            </h2>
            <p className={`text-sm ${style.text} opacity-80`}>
              Policy Version: {request.policy_version} · Credits: {request.cost_credits}
            </p>
          </div>
        </div>
      </div>

      {/* Request Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h1 className="text-xl font-bold text-utilix-black mb-4">
          Booking for {request.resource_id}
        </h1>

        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <span className="text-gray-500 block">Booking ID</span>
            <span className="font-mono font-medium">{request.id}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Date</span>
            <span className="font-medium">{date}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Time</span>
            <span className="font-medium">
              {startTime} – {endTime}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">User ID</span>
            <span className="font-medium">{request.user_id}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Credits Charged</span>
            <span className="font-medium">{request.cost_credits} credits</span>
          </div>
          <div>
            <span className="text-gray-500 block">Submitted</span>
            <span className="font-medium">
              {new Date(request.created_at).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Purpose</h3>
          <p className="text-utilix-black">{request.purpose}</p>
        </div>

        {request.decision_reason && (
          <div className="border-t border-gray-100 pt-4 mt-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Decision Reason
            </h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded-lg text-sm">
              {request.decision_reason}
            </p>
          </div>
        )}
      </div>

      {/* Decision Transparency & AI/Fallback Explanation */}
      <DecisionExplanation booking={request} />

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        {isCancellable && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="bg-red-50 text-red-700 font-medium px-5 py-2.5 rounded-lg
                       border border-red-200 hover:bg-red-100 transition-colors text-sm
                       disabled:opacity-50"
          >
            {cancelling ? "Cancelling…" : "Cancel Booking"}
          </button>
        )}
        <Link
          href="/resources"
          className="bg-white text-utilix-black font-medium px-5 py-2.5 rounded-lg
                     border border-gray-300 hover:bg-gray-50 transition-colors text-sm"
        >
          Browse Resources
        </Link>
      </div>
    </div>
  );
}

export default function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-utilix-yellow border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <RequestDetailContent params={params} />
    </Suspense>
  );
}
