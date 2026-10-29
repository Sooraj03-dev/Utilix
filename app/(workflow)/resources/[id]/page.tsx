/* ═══════════════════════════════════════════════════════════════════════════
 * Resource Detail Page — View resource details and available time slots
 * Owner B · app/(workflow)/resources/[id]/page.tsx
 * ═══════════════════════════════════════════════════════════════════════════ */
"use client";

import { useEffect, useState, use, Suspense } from "react";
import Link from "next/link";
import type { Resource, TimeSlot } from "../../_lib/types";

function formatResourceType(type: string): string {
  switch (type) {
    case "printer_3d":
      return "3D Printer";
    case "arduino_kit":
      return "Electronics Kit";
    case "camera":
      return "Camera";
    case "studio":
      return "Recording Studio";
    case "project_room":
      return "Project Room";
    case "lab_instrument":
      return "Lab Instrument";
    default:
      return type.replace(/_/g, " ");
  }
}

function ResourceDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [resource, setResource] = useState<Resource | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("2026-11-01");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/workflow/resources/${id}/slots?date=${selectedDate}`,
        );
        const json = await res.json();

        if (!json.success) throw new Error(json.error?.message || json.error || "Failed to load slots");
        setResource(json.data.resource);
        setSlots(json.data.slots);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load resource");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, selectedDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-utilix-yellow border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading resource…</p>
        </div>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700 max-w-2xl mx-auto mt-8">
        <p className="font-medium">Resource not found</p>
        <p className="text-sm mt-1">{error ?? "The requested resource does not exist."}</p>
        <Link
          href="/resources"
          className="inline-block mt-4 text-sm font-medium text-utilix-black hover:text-utilix-yellow"
        >
          ← Back to resources
        </Link>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    available: "bg-green-100 text-green-800",
    maintenance: "bg-orange-100 text-orange-800",
    retired: "bg-gray-100 text-gray-500",
  };

  const isSpace =
    resource.type === "studio" || resource.type === "project_room";

  const tags = [
    formatResourceType(resource.type),
    resource.restricted ? "Approval Required" : "Instant Allocation",
    `${resource.credit_cost} credits`,
    `Max ${resource.max_session_minutes} min`,
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/resources"
        className="inline-block mb-4 text-sm text-gray-500 hover:text-utilix-black"
      >
        ← Back to resources
      </Link>

      {/* Resource Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-utilix-black">
              {resource.name}
            </h1>
            <p className="text-gray-500 mt-1 capitalize">
              {resource.department_id.replace("dept_", "")} · {formatResourceType(resource.type)}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              statusColors[resource.status] ?? "bg-gray-100 text-gray-500"
            }`}
          >
            {resource.status}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500 block">Location</span>
            <span className="font-medium">{resource.location}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Category</span>
            <span className="font-medium capitalize">{isSpace ? "Space" : "Equipment"}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Credit Cost</span>
            <span className="font-medium">{resource.credit_cost} credits</span>
          </div>
          <div>
            <span className="text-gray-500 block">Max Duration</span>
            <span className="font-medium">
              {resource.max_session_minutes} minutes
            </span>
          </div>
        </div>

        {resource.requires_training && (
          <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-800">
            🎓 <strong>Training required</strong> — You must complete the{" "}
            <strong>{resource.requires_training.replace(/_/g, " ")}</strong> certification
            before booking this resource.
          </div>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 bg-utilix-cream text-utilix-black text-xs rounded-full font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Available Slots */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-utilix-black">
            Available Slots
          </h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min="2026-01-01"
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-utilix-yellow"
          />
        </div>

        {slots.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-3xl mb-2">📅</div>
            <p>No slots available for this date.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className={`rounded-lg border p-4 transition-all ${
                  slot.isAvailable
                    ? "border-gray-200 hover:border-utilix-yellow hover:shadow-sm"
                    : "border-gray-100 bg-gray-50 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-utilix-black">
                    {slot.startTime} – {slot.endTime}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      slot.isAvailable
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {slot.isAvailable ? "Available" : "Taken"}
                  </span>
                </div>
                {slot.isAvailable && resource.status === "available" ? (
                  <Link
                    href={`/book/${resource.id}?date=${slot.date}&start=${slot.startTime}&end=${slot.endTime}`}
                    className="block w-full text-center bg-utilix-yellow text-utilix-black
                               font-medium py-2 rounded-lg text-sm
                               hover:bg-yellow-400 transition-colors"
                  >
                    Book This Slot
                  </Link>
                ) : (
                  <button
                    disabled
                    className="block w-full text-center bg-gray-100 text-gray-400
                               font-medium py-2 rounded-lg text-sm cursor-not-allowed"
                  >
                    Unavailable
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResourceDetailPage({
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
      <ResourceDetailContent params={params} />
    </Suspense>
  );
}
