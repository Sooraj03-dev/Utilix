/* ═══════════════════════════════════════════════════════════════════════════
 * Returns & Equipment Handoff Page — Coordinator Returns Desk
 * Owner B · app/(workflow)/returns/page.tsx
 * ═══════════════════════════════════════════════════════════════════════════ */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Booking } from "../_lib/types";

interface HandoffBooking extends Booking {
  isOverdue?: boolean;
}

function checkIsOverdue(slotEnd: string): boolean {
  return new Date(slotEnd).getTime() < Date.now();
}

export default function ReturnsPage() {
  const [bookings, setBookings] = useState<HandoffBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function refreshBookings() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workflow/requests");
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to load bookings");
      const all: Booking[] = json.data ?? [];
      const handoff: HandoffBooking[] = all
        .filter((b) => ["confirmed", "checked_out"].includes(b.status))
        .map((b) => ({
          ...b,
          isOverdue: b.status === "checked_out" && checkIsOverdue(b.slot_end),
        }));
      setBookings(handoff);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/workflow/requests");
        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message || "Failed to load bookings");
        const all: Booking[] = json.data ?? [];
        const handoff: HandoffBooking[] = all
          .filter((b) => ["confirmed", "checked_out"].includes(b.status))
          .map((b) => ({
            ...b,
            isOverdue: b.status === "checked_out" && checkIsOverdue(b.slot_end),
          }));
        setBookings(handoff);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load bookings");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleCheckout(bookingId: string) {
    const condition = prompt("Item condition at checkout (e.g., pristine, normal, minor scuffs):", "pristine");
    if (!condition) return;
    const notes = prompt("Inspection notes (optional):", "Power cable and lenses verified.");

    setActionLoading(bookingId);
    try {
      const res = await fetch("/api/workflow/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          itemCondition: condition,
          conditionNotes: notes || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Checkout failed");
      await refreshBookings();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCheckin(bookingId: string) {
    const condition = prompt("Item condition upon return (e.g., pristine, good, damaged):", "good");
    if (!condition) return;
    const notes = prompt("Return inspection notes (optional):", "All accessories returned in working order.");

    setActionLoading(bookingId);
    try {
      const res = await fetch("/api/workflow/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          itemCondition: condition,
          conditionNotes: notes || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Checkin failed");
      await refreshBookings();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Checkin failed");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipment Handoff & Returns Desk</h1>
          <p className="text-sm text-gray-500">
            Check out equipment to verified students, inspect return condition, and flag overdue items.
          </p>
        </div>
        <button
          onClick={refreshBookings}
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
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">📦</div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">No Active Handoffs</h2>
          <p className="text-sm text-gray-500">There are no bookings currently confirmed or checked out.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const isOverdue = b.isOverdue ?? false;

            return (
              <div
                key={b.id}
                className={`bg-white rounded-xl border p-5 shadow-sm transition-all ${
                  isOverdue ? "border-red-300 bg-red-50/20" : "border-gray-200"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-bold text-gray-900 text-base">{b.resource_id}</span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                          b.status === "checked_out"
                            ? isOverdue
                              ? "bg-red-100 text-red-800 font-bold"
                              : "bg-purple-100 text-purple-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {isOverdue ? "⚠️ OVERDUE" : b.status === "checked_out" ? "Checked Out" : "Confirmed"}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">ID: {b.id}</span>
                    </div>

                    <p className="text-xs text-gray-600 mb-2">
                      Borrower: <span className="font-semibold text-gray-900">{b.user_id}</span> · Slot Window:{" "}
                      <span className="font-semibold text-gray-900">
                        {b.slot_start.slice(0, 10)} ({b.slot_start.slice(11, 16)} – {b.slot_end.slice(11, 16)})
                      </span>
                    </p>

                    {b.decision_reason && (
                      <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                        Condition/Log: {b.decision_reason}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {b.status === "confirmed" && (
                      <button
                        onClick={() => handleCheckout(b.id)}
                        disabled={actionLoading === b.id}
                        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-sm transition-colors disabled:opacity-50"
                      >
                        Check Out Item
                      </button>
                    )}

                    {b.status === "checked_out" && (
                      <button
                        onClick={() => handleCheckin(b.id)}
                        disabled={actionLoading === b.id}
                        className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs shadow-sm transition-colors disabled:opacity-50"
                      >
                        Check In & Inspect
                      </button>
                    )}

                    <Link
                      href={`/requests/${b.id}`}
                      className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-medium"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
