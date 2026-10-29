/* ═══════════════════════════════════════════════════════════════════════════
 * Request Detail Page — View a single booking request with full details,
 * status, AI explanation, and alternative suggestions.
 * Owner B · app/(workflow)/requests/[id]/page.tsx
 *
 * ⚠️ MOCK: Displays in-memory data only.
 * ═══════════════════════════════════════════════════════════════════════════ */
"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import type { BookingRequest, RequestStatus } from "../../_lib/types";

const STATUS_STYLES: Record<
  RequestStatus,
  { bg: string; text: string; label: string; icon: string }
> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending", icon: "⏳" },
  approved: { bg: "bg-green-100", text: "text-green-800", label: "Approved", icon: "✅" },
  rejected: { bg: "bg-red-100", text: "text-red-800", label: "Rejected", icon: "❌" },
  cancelled: { bg: "bg-gray-100", text: "text-gray-600", label: "Cancelled", icon: "🚫" },
  waitlisted: { bg: "bg-blue-100", text: "text-blue-800", label: "Waitlisted", icon: "📋" },
  "checked-out": { bg: "bg-purple-100", text: "text-purple-800", label: "Checked Out", icon: "📦" },
  returned: { bg: "bg-gray-100", text: "text-gray-600", label: "Returned", icon: "✔️" },
};

export default function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [request, setRequest] = useState<BookingRequest | null>(null);
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
        if (!json.success) throw new Error(json.error);
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
    if (!confirm("Are you sure you want to cancel this request?")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/workflow/requests/${id}/cancel`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setRequest(json.data);
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

  const style = STATUS_STYLES[request.status] ?? STATUS_STYLES.pending;
  const canCancel = ["pending", "waitlisted"].includes(request.status);

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/requests"
        className="inline-block mb-4 text-sm text-gray-500 hover:text-utilix-black"
      >
        ← Back to requests
      </Link>

      {/* Status Banner */}
      <div
        className={`rounded-xl p-5 mb-6 ${style.bg} border border-opacity-30`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{style.icon}</span>
          <div>
            <h2 className={`text-lg font-bold ${style.text}`}>
              {style.label}
            </h2>
            {request.rank != null && (
              <p className={`text-sm ${style.text} opacity-80`}>
                Ranked #{request.rank} by AI allocation
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Request Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h1 className="text-xl font-bold text-utilix-black mb-4">
          {request.resourceName}
        </h1>

        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <span className="text-gray-500 block">Request ID</span>
            <span className="font-mono font-medium">{request.id}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Date</span>
            <span className="font-medium">{request.date}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Time</span>
            <span className="font-medium">
              {request.startTime} – {request.endTime}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Department</span>
            <span className="font-medium">{request.department}</span>
          </div>
          {request.headcount != null && (
            <div>
              <span className="text-gray-500 block">Headcount</span>
              <span className="font-medium">{request.headcount} people</span>
            </div>
          )}
          <div>
            <span className="text-gray-500 block">Submitted</span>
            <span className="font-medium">
              {new Date(request.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Purpose</h3>
          <p className="text-utilix-black">{request.purpose}</p>
        </div>

        {request.notes && (
          <div className="border-t border-gray-100 pt-4 mt-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Additional Details
            </h3>
            <p className="text-gray-700">{request.notes}</p>
          </div>
        )}

        {request.rejectionReason && (
          <div className="border-t border-gray-100 pt-4 mt-4">
            <h3 className="text-sm font-medium text-red-500 mb-1">
              Rejection Reason
            </h3>
            <p className="text-red-700">{request.rejectionReason}</p>
          </div>
        )}
      </div>

      {/* AI Explanation */}
      {request.studentExplanation && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-utilix-black mb-3 flex items-center gap-2">
            <span className="text-utilix-yellow">🤖</span> AI Allocation
            Explanation
          </h2>
          <p className="text-gray-700">{request.studentExplanation}</p>
          <p className="text-xs text-gray-400 mt-3">
            Generated by AI fairness engine · explanation source: mock
          </p>
        </div>
      )}

      {/* Alternative Suggestions */}
      {request.alternatives && request.alternatives.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-utilix-black mb-3 flex items-center gap-2">
            💡 Suggested Alternatives
          </h2>
          <div className="space-y-3">
            {request.alternatives.map((alt, i) => (
              <div
                key={i}
                className="flex items-center justify-between border border-gray-100 rounded-lg p-4 hover:border-utilix-yellow transition-colors"
              >
                <div>
                  <p className="font-medium text-utilix-black text-sm">
                    {alt.resourceName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {alt.date} · {alt.startTime}–{alt.endTime}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{alt.reason}</p>
                </div>
                <Link
                  href={`/book/${alt.resourceId}?date=${alt.date}&start=${alt.startTime}&end=${alt.endTime}`}
                  className="bg-utilix-cream text-utilix-black text-sm font-medium px-4 py-2
                             rounded-lg hover:bg-utilix-yellow transition-colors whitespace-nowrap"
                >
                  Book This
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="bg-red-50 text-red-700 font-medium px-5 py-2.5 rounded-lg
                       border border-red-200 hover:bg-red-100 transition-colors text-sm
                       disabled:opacity-50"
          >
            {cancelling ? "Cancelling…" : "Cancel Request"}
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

      {/* Mock notice */}
      <div className="mt-6 text-center text-xs text-gray-400">
        ⚠️ Mock mode — displaying in-memory data only
      </div>
    </div>
  );
}
