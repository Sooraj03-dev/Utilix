/* ═══════════════════════════════════════════════════════════════════════════
 * Conflicts Resolution Page — Scheduling Conflict Overrides
 * Owner B · app/(workflow)/conflicts/page.tsx
 * ═══════════════════════════════════════════════════════════════════════════ */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Booking } from "../_lib/types";

export default function ConflictsPage() {
  const [waitlistedBookings, setWaitlistedBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function fetchConflicts() {
    setLoading(true);
    try {
      const res = await fetch("/api/workflow/requests");
      const json = await res.json();
      const all: Booking[] = json.data ?? [];
      const contested = all.filter((b) => b.status === "waitlisted");
      setWaitlistedBookings(contested);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => fetchConflicts());
  }, []);

  async function handleOverride(bookingId: string) {
    const overrideReason = prompt("Administrative override reason (MANDATORY for audit log):");
    if (!overrideReason || overrideReason.trim().length === 0) {
      alert("Override reason is required by security policy.");
      return;
    }

    setActionLoading(bookingId);
    try {
      const res = await fetch(`/api/workflow/conflicts/${bookingId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution: "approve_override",
          overrideReason,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Override failed");
      alert("Override recorded in immutable audit log.");
      await fetchConflicts();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Override failed");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Scheduling Contention & Conflicts</h1>
        <p className="text-sm text-gray-500">
          Review contested slots, algorithmic priority rankings, and execute audited administrative overrides.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-utilix-yellow border-t-transparent rounded-full animate-spin" />
        </div>
      ) : waitlistedBookings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">⚖️</div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">No Active Contention</h2>
          <p className="text-sm text-gray-500">All resource reservations are currently conflict-free.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {waitlistedBookings.map((b) => (
            <div key={b.id} className="bg-white rounded-xl border border-amber-200 p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-bold text-gray-900 text-base">{b.resource_id}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800">
                      Waitlisted in Contention
                    </span>
                    <span className="text-xs text-gray-400 font-mono">ID: {b.id}</span>
                  </div>

                  <p className="text-xs text-gray-600 mb-2">
                    Requester: <span className="font-semibold text-gray-900">{b.user_id}</span> · Slot:{" "}
                    <span className="font-semibold text-gray-900">
                      {b.slot_start.slice(0, 10)} ({b.slot_start.slice(11, 16)} – {b.slot_end.slice(11, 16)})
                    </span>
                  </p>

                  <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded border border-amber-200">
                    Contention Note: {b.decision_reason || "Queued behind active slot lock."}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => handleOverride(b.id)}
                    disabled={actionLoading === b.id}
                    className="px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-medium text-xs shadow-sm transition-colors disabled:opacity-50"
                  >
                    Execute Audited Override
                  </button>
                  <Link
                    href={`/requests/${b.id}`}
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
