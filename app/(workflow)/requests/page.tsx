/* ═══════════════════════════════════════════════════════════════════════════
 * My Requests Page — View all booking requests with status
 * Owner B · app/(workflow)/requests/page.tsx
 *
 * ⚠️ MOCK: Displays in-memory requests only.
 * ═══════════════════════════════════════════════════════════════════════════ */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BookingRequest, RequestStatus } from "../_lib/types";

const STATUS_STYLES: Record<RequestStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending" },
  approved: { bg: "bg-green-100", text: "text-green-800", label: "Approved" },
  rejected: { bg: "bg-red-100", text: "text-red-800", label: "Rejected" },
  cancelled: { bg: "bg-gray-100", text: "text-gray-600", label: "Cancelled" },
  waitlisted: { bg: "bg-blue-100", text: "text-blue-800", label: "Waitlisted" },
  "checked-out": { bg: "bg-purple-100", text: "text-purple-800", label: "Checked Out" },
  returned: { bg: "bg-gray-100", text: "text-gray-600", label: "Returned" },
};

type FilterStatus = RequestStatus | "all";

export default function RequestsPage() {
  const [requests, setRequests] = useState<BookingRequest[]>([]);
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
        if (!json.success) throw new Error(json.error);
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
            Track your booking requests and their status.
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
            "pending",
            "approved",
            "waitlisted",
            "rejected",
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
            const style = STATUS_STYLES[req.status] ?? STATUS_STYLES.pending;
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
                      {req.resourceName}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {req.date} · {req.startTime}–{req.endTime}
                    </p>
                  </div>
                  <span
                    className={`ml-3 px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
                  >
                    {style.label}
                  </span>
                </div>

                <p className="text-sm text-gray-600 truncate">{req.purpose}</p>

                {/* Rank info */}
                {req.rank != null && (
                  <p className="text-xs text-gray-400 mt-2">
                    Ranked #{req.rank} by AI allocation
                    {req.studentExplanation && (
                      <span className="ml-1">· {req.studentExplanation}</span>
                    )}
                  </p>
                )}

                {/* Alternatives */}
                {req.alternatives && req.alternatives.length > 0 && (
                  <div className="mt-2 text-xs text-blue-600">
                    💡 {req.alternatives.length} alternative slot
                    {req.alternatives.length > 1 ? "s" : ""} suggested
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                  <span>ID: {req.id}</span>
                  <span>
                    Submitted{" "}
                    {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Mock notice */}
      {!loading && requests.length > 0 && (
        <div className="mt-6 text-center text-xs text-gray-400">
          ⚠️ Mock mode — displaying in-memory data only
        </div>
      )}
    </div>
  );
}
