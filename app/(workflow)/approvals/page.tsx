/* ═══════════════════════════════════════════════════════════════════════════
 * Approvals Page — Coordinator approval queue
 * Owner B · app/(workflow)/approvals/page.tsx
 * ═══════════════════════════════════════════════════════════════════════════ */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Booking } from "../_lib/types";

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function fetchPendingRequests() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workflow/requests");
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to load requests");
      const all: Booking[] = json.data ?? [];
      const pending = all.filter((b) => ["pending_approval", "submitted", "allocated"].includes(b.status));
      setRequests(pending);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => fetchPendingRequests());
  }, []);

  async function handleApprove(bookingId: string) {
    const note = prompt("Approval note (optional):", "Approved after schedule check");
    if (note === null) return;

    setActionLoading(bookingId);
    try {
      const res = await fetch(`/api/workflow/requests/${bookingId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to approve");
      setRequests((prev) => prev.filter((r) => r.id !== bookingId));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(bookingId: string) {
    const reason = prompt("Reason for rejection:", "Capacity conflict or maintenance requirement");
    if (!reason) return;

    setActionLoading(bookingId);
    try {
      const res = await fetch(`/api/workflow/requests/${bookingId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to reject");
      setRequests((prev) => prev.filter((r) => r.id !== bookingId));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Rejection failed");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coordinator Approvals Queue</h1>
          <p className="text-sm text-gray-500">
            Review and decide on restricted equipment bookings and allocation requests.
          </p>
        </div>
        <button
          onClick={fetchPendingRequests}
          disabled={loading}
          className="text-sm px-3.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-utilix-yellow border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Queue is clear!</h2>
          <p className="text-sm text-gray-500">No pending booking requests require coordinator approval right now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-bold text-gray-900 text-base">{req.resource_id}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800">
                      {req.status}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">ID: {req.id}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    Student: <span className="font-semibold text-gray-700">{req.user_id}</span> · Slot:{" "}
                    <span className="font-semibold text-gray-700">
                      {req.slot_start.slice(0, 10)} ({req.slot_start.slice(11, 16)} - {req.slot_end.slice(11, 16)})
                    </span>{" "}
                    · Credits: {req.cost_credits}
                  </p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100 mb-2">
                    <span className="font-medium text-gray-900">Declared Purpose: </span>
                    {req.purpose}
                  </p>
                  {req.decision_reason && (
                    <p className="text-xs text-blue-700 bg-blue-50/60 p-2 rounded border border-blue-100">
                      Recommendation: {req.decision_reason}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => handleApprove(req.id)}
                    disabled={actionLoading === req.id}
                    className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium text-xs shadow-sm transition-colors disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    disabled={actionLoading === req.id}
                    className="px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-medium text-xs transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <Link
                    href={`/requests/${req.id}`}
                    className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-medium"
                  >
                    Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
