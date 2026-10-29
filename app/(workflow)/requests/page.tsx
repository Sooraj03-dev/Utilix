/* ═══════════════════════════════════════════════════════════════════════════
 * My Requests Page — View all booking requests with status
 * Owner B · app/(workflow)/requests/page.tsx
 * ═══════════════════════════════════════════════════════════════════════════ */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Booking, BookingStatus } from "../_lib/types";

const STATUS_STYLES: Record<
  BookingStatus,
  { bg: string; text: string; label: string }
> = {
  submitted: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Submitted" },
  eligibility_passed: { bg: "bg-blue-100", text: "text-blue-800", label: "Eligibility Passed" },
  allocated: { bg: "bg-indigo-100", text: "text-indigo-800", label: "Allocated" },
  waitlisted: { bg: "bg-amber-100", text: "text-amber-800", label: "Waitlisted" },
  pending_approval: { bg: "bg-orange-100", text: "text-orange-800", label: "Pending Approval" },
  confirmed: { bg: "bg-green-100", text: "text-green-800", label: "Confirmed" },
  checked_out: { bg: "bg-purple-100", text: "text-purple-800", label: "Checked Out" },
  returned: { bg: "bg-teal-100", text: "text-teal-800", label: "Returned" },
  cancelled: { bg: "bg-gray-100", text: "text-gray-600", label: "Cancelled" },
  rejected: { bg: "bg-red-100", text: "text-red-800", label: "Rejected" },
  no_show: { bg: "bg-rose-100", text: "text-rose-800", label: "No Show" },
};

type FilterStatus = BookingStatus | "all";

export default function RequestsPage() {
  const [requests, setRequests] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");

  useEffect(() => {
    async function fetchRequests() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/workflow/requests");
        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message || json.error || "Failed to load requests");
        setRequests(json.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load requests");
      } finally {
        setLoading(false);
      }
    }
    fetchRequests();
  }, []);

  const filtered =
    filter === "all"
      ? requests
      : requests.filter((r) => r.status === filter);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-utilix-black">My Requests</h1>
          <p className="text-gray-600 mt-1">
            Track your resource bookings, allocations, and waitlist status.
          </p>
        </div>
        <Link
          href="/resources"
          className="bg-utilix-yellow text-utilix-black font-medium px-4 py-2 rounded-lg
                     hover:bg-yellow-400 transition-colors text-sm"
        >
          + New Booking
        </Link>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {(
          [
            "all",
            "confirmed",
            "allocated",
            "waitlisted",
            "submitted",
            "cancelled",
          ] as FilterStatus[]
        ).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
              ${
                filter === status
                  ? "bg-utilix-yellow text-utilix-black"
                  : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
              }`}
          >
            {status === "all"
              ? `All (${requests.length})`
              : `${STATUS_STYLES[status]?.label ?? status} (${requests.filter((r) => r.status === status).length})`}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-utilix-yellow border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Loading requests…</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Failed to load requests</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-lg font-medium text-gray-900">
            {filter === "all" ? "No requests yet" : `No ${filter} requests`}
          </h3>
          <p className="text-gray-500 mt-1">
            {filter === "all"
              ? "Book a resource to get started."
              : "Try a different filter or create a new booking."}
          </p>
          {filter === "all" && (
            <Link
              href="/resources"
              className="inline-block mt-4 bg-utilix-yellow text-utilix-black font-medium
                         px-6 py-2.5 rounded-lg hover:bg-yellow-400 transition-colors text-sm"
            >
              Browse Resources
            </Link>
          )}
        </div>
      )}

      {/* Request List */}
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((req) => {
            const style = STATUS_STYLES[req.status] ?? STATUS_STYLES.submitted;
            const date = req.slot_start ? req.slot_start.split("T")[0] : "";
            const startTime = req.slot_start ? req.slot_start.slice(11, 16) : "";
            const endTime = req.slot_end ? req.slot_end.slice(11, 16) : "";

            return (
              <Link
                key={req.id}
                href={`/requests/${req.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-5
                           hover:shadow-md hover:border-utilix-yellow transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-utilix-black truncate">
                      {req.resource_id}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {date} · {startTime}–{endTime}
                    </p>
                  </div>
                  <span
                    className={`ml-3 px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
                  >
                    {style.label}
                  </span>
                </div>

                <p className="text-sm text-gray-600 truncate">{req.purpose}</p>

                {/* Decision reason */}
                {req.decision_reason && (
                  <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded">
                    💡 {req.decision_reason}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                  <span>Booking ID: {req.id}</span>
                  <span>
                    Created: {new Date(req.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
