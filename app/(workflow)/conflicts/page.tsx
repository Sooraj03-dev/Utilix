/* ═══════════════════════════════════════════════════════════════════════════
 * Conflicts Page — Scheduling Conflict & Multi-Request Resolution
 * app/(workflow)/conflicts/page.tsx
 * ═══════════════════════════════════════════════════════════════════════════ */
"use client";

import { useEffect, useState } from "react";
import type { Booking } from "../_lib/types";
import { useAuth } from "@/lib/auth/context";

interface ConflictGroup {
  slotKey: string;
  slotStart: string;
  resourceName: string;
  requests: Booking[];
}

export default function ConflictsPage() {
  const { user } = useAuth();
  const [conflictGroups, setConflictGroups] = useState<ConflictGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingSlot, setResolvingSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchConflicts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workflow/requests");
      const json = await res.json();
      if (!json.success && !json.data) {
        throw new Error(json.error?.message || json.error || "Failed to load requests");
      }
      const all: Booking[] = json.data || [];

      // Group active competing requests by resource + slot_start
      const groups = new Map<string, Booking[]>();
      all.forEach((b) => {
        if (b.status === "submitted" || b.status === "allocated" || b.status === "waitlisted" || b.status === "pending_approval") {
          const key = `${b.resource_id}_${b.slot_start}`;
          const list = groups.get(key) || [];
          list.push(b);
          groups.set(key, list);
        }
      });

      const conflicts: ConflictGroup[] = [];
      groups.forEach((items, key) => {
        if (items.length > 1) {
          conflicts.push({
            slotKey: key,
            slotStart: items[0].slot_start,
            resourceName: (items[0] as any).resource_name || items[0].resource_id,
            requests: items,
          });
        }
      });

      setConflictGroups(conflicts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conflicts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConflicts();
  }, []);

  const handleResolveConflict = async (slotId: string, chosenBookingId: string) => {
    setResolvingSlot(slotId);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/workflow/conflicts/${encodeURIComponent(slotId)}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chosen_booking_id: chosenBookingId,
          reason: "Selected by coordinator via Utilix Fair Allocation panel",
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to resolve conflict.");
      }
      setSuccessMsg(`Conflict resolved! Booking ${chosenBookingId} confirmed, remaining competing requests released & refunded.`);
      await fetchConflicts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error resolving conflict");
    } finally {
      setResolvingSlot(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scheduling Conflict Resolution</h1>
          <p className="text-sm text-gray-500 mt-1">
            Detect competing student demands for the same time slot and commit tie-breaking resolutions.
          </p>
        </div>
        <button
          onClick={fetchConflicts}
          disabled={loading}
          className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          {loading ? "Scanning..." : "Scan Slots"}
        </button>
      </div>

      {user && user.role === "student" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          ⚠️ <strong>Student View Notice:</strong> Conflict adjudication is reserved for Coordinators and Administrators.
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
        <div className="text-center py-12 text-gray-500">Scanning schedule for competing reservations...</div>
      ) : conflictGroups.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">⚖️</div>
          <h3 className="text-lg font-semibold text-gray-900">No active scheduling conflicts</h3>
          <p className="text-sm text-gray-500 mt-1">
            All resource slots have at most one active applicant or have already been cleanly adjudicated.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {conflictGroups.map((group) => (
            <div key={group.slotKey} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{group.resourceName}</h3>
                  <p className="text-xs text-gray-500">
                    Slot Time: {new Date(group.slotStart).toLocaleDateString()} at {new Date(group.slotStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-semibold">
                  {group.requests.length} Competing Requests
                </span>
              </div>

              <div className="divide-y divide-gray-50">
                {group.requests.map((r, idx) => (
                  <div key={r.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium text-gray-900">
                        Candidate #{idx + 1}: {(r as any).user_name || r.user_id}
                        <span className="ml-2 text-xs font-normal text-gray-500">({r.status})</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Purpose: {r.purpose || "Academic project"}
                      </p>
                    </div>

                    <button
                      onClick={() => handleResolveConflict(group.slotKey, r.id)}
                      disabled={resolvingSlot === group.slotKey}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm disabled:opacity-50 shrink-0"
                    >
                      {resolvingSlot === group.slotKey ? "Resolving..." : "Award Slot to this Student"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
