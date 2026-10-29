/* ═══════════════════════════════════════════════════════════════════════════
 * Approvals Page — Coordinator/Admin Review Queue
 * app/(workflow)/approvals/page.tsx
 * ═══════════════════════════════════════════════════════════════════════════ */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Booking } from "../_lib/types";
import { useAuth } from "@/lib/auth/context";

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchPendingRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workflow/requests");
      const json = await res.json();
      if (!json.success && !json.data) {
        throw new Error(json.error?.message || json.error || "Failed to load requests");
      }
      const all: Booking[] = json.data || [];
      // Filter for items requiring approval or allocated/submitted
      const pending = all.filter((r) =>
        r.status === "pending_approval" || r.status === "allocated" || r.status === "submitted"
      );
      setRequests(pending);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const handleDecision = async (id: string, action: "approve" | "reject") => {
    setActionLoading(id);
    setError(null);
    setSuccessMsg(null);
    try {
      const endpoint = `/api/workflow/requests/${id}/${action}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: action === "approve" ? "Approved by facility coordinator" : undefined,
          reason: action === "reject" ? "Slot or resource unavailable for requested purpose" : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || `Failed to ${action} booking.`);
      }

      setSuccessMsg(`Booking ${id} successfully ${action}d!`);
      // Refresh list
      await fetchPendingRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Error during ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coordinator Approval Queue</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review, approve, or reject pending equipment and space reservations.
          </p>
        </div>
        <button
          onClick={fetchPendingRequests}
          disabled={loading}
          className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          {loading ? "Refreshing..." : "Refresh Queue"}
        </button>
      </div>

      {user && user.role === "student" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          ⚠️ <strong>Student View Notice:</strong> You are signed in with a Student account. Official approval and rejection actions require a Coordinator or Administrator role.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
          {successMsg}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading pending requests...</div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="text-lg font-semibold text-gray-900">All clear!</h3>
          <p className="text-sm text-gray-500 mt-1">
            No reservations currently require coordinator approval.
          </p>
          <div className="mt-4">
            <Link
              href="/requests"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              View all requests &rarr;
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden shadow-sm">
          {requests.map((req) => (
            <div key={req.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{(req as any).resource_name || req.resource_id}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-medium">
                    {req.status}
                  </span>
                  <span className="text-xs text-gray-400">ID: {req.id}</span>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">User:</span> {(req as any).user_name || req.user_id} &bull;{" "}
                  <span className="font-medium">Slot:</span> {new Date(req.slot_start).toLocaleDateString()} ({new Date(req.slot_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(req.slot_end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})
                </div>
                {req.purpose && (
                  <p className="text-xs text-gray-500 italic">Purpose: "{req.purpose}"</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDecision(req.id, "approve")}
                  disabled={actionLoading === req.id}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
                >
                  {actionLoading === req.id ? "Processing..." : "Approve"}
                </button>
                <button
                  onClick={() => handleDecision(req.id, "reject")}
                  disabled={actionLoading === req.id}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
