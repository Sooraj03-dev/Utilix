/* ═══════════════════════════════════════════════════════════════════════════
 * Returns & Check-in Page — Facility Handover and Equipment Return
 * app/(workflow)/returns/page.tsx
 * ═══════════════════════════════════════════════════════════════════════════ */
"use client";

import { useEffect, useState } from "react";
import type { Booking } from "../_lib/types";
import { useAuth } from "@/lib/auth/context";

export default function ReturnsPage() {
  const { user } = useAuth();
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Return modal state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [returnCondition, setReturnCondition] = useState<"good" | "fair" | "damaged" | "dirty">("good");
  const [returnNotes, setReturnNotes] = useState("");

  const fetchActiveBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workflow/requests");
      const json = await res.json();
      if (!json.success && !json.data) {
        throw new Error(json.error?.message || json.error || "Failed to load bookings");
      }
      const all: Booking[] = json.data || [];
      // Filter for bookings that can be checked in (confirmed) or returned (checked_out)
      const relevant = all.filter((r) => r.status === "confirmed" || r.status === "checked_out");
      setActiveBookings(relevant);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load active bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveBookings();
  }, []);

  const handleCheckin = async (bookingId: string) => {
    setActionLoading(bookingId);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/workflow/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, notes: "Equipment collected by student" }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to complete check-in.");
      }
      setSuccessMsg(`Equipment for booking ${bookingId} successfully checked out!`);
      await fetchActiveBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error during check-in");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteReturn = async () => {
    if (!selectedBooking) return;
    setActionLoading(selectedBooking.id);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/workflow/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: selectedBooking.id,
          condition: returnCondition,
          notes: returnNotes || `Returned in ${returnCondition} condition.`,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to record return.");
      }
      setSuccessMsg(`Booking ${selectedBooking.id} marked as returned! ${json.issue_id ? `(Incident report ${json.issue_id} filed)` : ""}`);
      setSelectedBooking(null);
      setReturnNotes("");
      await fetchActiveBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error recording return");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipment Check-in &amp; Returns</h1>
          <p className="text-sm text-gray-500 mt-1">
            Dispatch reserved items and inspect returned equipment for damages.
          </p>
        </div>
        <button
          onClick={fetchActiveBookings}
          disabled={loading}
          className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {user && user.role === "student" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          ⚠️ <strong>Student View Notice:</strong> Handover collection and return inspection are performed by staff coordinators at the equipment desk.
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
        <div className="text-center py-12 text-gray-500">Loading active equipment sessions...</div>
      ) : activeBookings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">📦</div>
          <h3 className="text-lg font-semibold text-gray-900">No active equipment out</h3>
          <p className="text-sm text-gray-500 mt-1">
            All confirmed reservations are checked in and equipment returned.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden shadow-sm">
          {activeBookings.map((b) => (
            <div key={b.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{(b as any).resource_name || b.resource_id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    b.status === "confirmed" ? "bg-green-100 text-green-800" : "bg-purple-100 text-purple-800"
                  }`}>
                    {b.status === "confirmed" ? "Ready for Pickup" : "In Use (Checked Out)"}
                  </span>
                  <span className="text-xs text-gray-400">ID: {b.id}</span>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Requester:</span> {(b as any).user_name || b.user_id} &bull;{" "}
                  <span className="font-medium">Slot:</span> {new Date(b.slot_start).toLocaleDateString()} {new Date(b.slot_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {b.status === "confirmed" ? (
                  <button
                    onClick={() => handleCheckin(b.id)}
                    disabled={actionLoading === b.id}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
                  >
                    {actionLoading === b.id ? "Processing..." : "Handover / Check In"}
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectedBooking(b)}
                    disabled={actionLoading === b.id}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition shadow-sm disabled:opacity-50"
                  >
                    Complete Return
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Return Inspection Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">
              Inspect &amp; Return Equipment
            </h3>
            <p className="text-sm text-gray-600">
              Booking: <span className="font-semibold">{(selectedBooking as any).resource_name || selectedBooking.resource_id}</span> ({selectedBooking.id})
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Return Condition
              </label>
              <select
                value={returnCondition}
                onChange={(e) => setReturnCondition(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="good">Good (No damage)</option>
                <option value="fair">Fair (Normal minor wear)</option>
                <option value="damaged">Damaged (Requires repair / replacement)</option>
                <option value="dirty">Dirty (Needs cleaning)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Inspection Notes
              </label>
              <textarea
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Note any scratches, missing cables, or condition remarks..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {returnCondition === "damaged" && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                Notice: Marking as Damaged will automatically generate a high-priority maintenance issue report in Firestore.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteReturn}
                disabled={actionLoading === selectedBooking.id}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition disabled:opacity-50"
              >
                {actionLoading === selectedBooking.id ? "Saving..." : "Confirm Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
