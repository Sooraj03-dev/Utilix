/* ═══════════════════════════════════════════════════════════════════════════
 * Resource Detail Page — View resource details and available time slots
 * Owner B · app/(workflow)/resources/[id]/page.tsx
 * ═══════════════════════════════════════════════════════════════════════════ */
"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import type { Resource, TimeSlot } from "../../_lib/types";

export default function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [resource, setResource] = useState<Resource | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default to tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(defaultDate);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/workflow/resources/${id}/slots?date=${selectedDate}`,
        );
        const json = await res.json();

        if (!json.success) throw new Error(json.error);
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
    "in-use": "bg-blue-100 text-blue-800",
    maintenance: "bg-orange-100 text-orange-800",
    retired: "bg-gray-100 text-gray-500",
  };

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
            <p className="text-gray-500 mt-1">{resource.department}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              statusColors[resource.status] ?? "bg-gray-100 text-gray-500"
            }`}
          >
            {resource.status}
          </span>
        </div>

        <p className="text-gray-700 mb-4">{resource.description}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500 block">Location</span>
            <span className="font-medium">{resource.location}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Category</span>
            <span className="font-medium capitalize">{resource.category}</span>
          </div>
          {resource.category === "space" && (
            <div>
              <span className="text-gray-500 block">Capacity</span>
              <span className="font-medium">
                {resource.capacity} people
              </span>
            </div>
          )}
          <div>
            <span className="text-gray-500 block">Booking Duration</span>
            <span className="font-medium">
              {resource.minDurationMinutes}–{resource.maxDurationMinutes} min
            </span>
          </div>
        </div>

        {resource.requiresTraining && (
          <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-800">
            🎓 <strong>Training required</strong> — You must complete the
            safety training before booking this resource.
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-4">
          {resource.tags.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 bg-utilix-cream text-utilix-black text-xs rounded-full"
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
            min={defaultDate}
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
