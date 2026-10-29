/* ═══════════════════════════════════════════════════════════════════════════
 * Book Resource Page — Booking form with validation
 * Owner B · app/(workflow)/book/[id]/page.tsx
 *
 * Core workflow: select slot → enter purpose/details → validate → submit
 * Shows processing, success, waitlisted, conflict, and error states.
 * ═══════════════════════════════════════════════════════════════════════════ */
"use client";

import { useEffect, useState, use, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type {
  Resource,
  BookingFormData,
  BookingRequest,
  ValidationError,
} from "../../_lib/types";
import { validateBookingForm } from "../../_lib/validation";

type PageState = "loading" | "form" | "submitting" | "success" | "error";

function BookFormInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [resource, setResource] = useState<Resource | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdRequest, setCreatedRequest] = useState<BookingRequest | null>(
    null,
  );
  const [isWaitlisted, setIsWaitlisted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    [],
  );

  // Initialize form data directly from search parameters without useEffect setState
  const [formData, setFormData] = useState<BookingFormData>(() => ({
    resourceId: id,
    date: searchParams.get("date") ?? "",
    startTime: searchParams.get("start") ?? "",
    endTime: searchParams.get("end") ?? "",
    purpose: "",
    notes: "",
    headcount: undefined,
  }));

  // Fetch resource details
  useEffect(() => {
    async function fetchResource() {
      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split("T")[0];

        const res = await fetch(
          `/api/workflow/resources/${id}/slots?date=${dateStr}`,
        );
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error?.message || json.error || "Failed to load resource");
        }
        setResource(json.data.resource);
        setPageState("form");
      } catch (err) {
        setPageState("error");
        setSubmitError(err instanceof Error ? err.message : "Failed to load resource details.");
      }
    }
    fetchResource();
  }, [id]);

  function updateField<K extends keyof BookingFormData>(
    key: K,
    value: BookingFormData[K],
  ) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setValidationErrors((prev) => prev.filter((e) => e.field !== key));
  }

  function fieldError(field: string): string | undefined {
    return validationErrors.find((e) => e.field === field)?.message;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validation = validateBookingForm(formData, resource);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    setPageState("submitting");
    setSubmitError(null);

    try {
      const res = await fetch("/api/workflow/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (!json.success) {
        if (json.errors) {
          setValidationErrors(json.errors);
          setPageState("form");
        } else {
          throw new Error(
            json.error?.message || json.error || "Submission failed.",
          );
        }
        return;
      }

      const bookingData = json.data.booking ?? json.data;
      setIsWaitlisted(Boolean(json.data.waitlisted));
      setCreatedRequest({
        id: bookingData.id,
        resourceId: bookingData.resource_id ?? id,
        resourceName: resource?.name ?? bookingData.resource_id ?? id,
        userId: bookingData.user_id,
        status: bookingData.status,
        purpose: bookingData.purpose ?? formData.purpose,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        costCredits: bookingData.cost_credits,
        createdAt: bookingData.created_at,
        updatedAt: bookingData.updated_at,
      });
      setPageState("success");
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "An unexpected error occurred.",
      );
      setPageState("error");
    }
  }

  const isSpace =
    resource?.type === "studio" || resource?.type === "project_room";

  if (pageState === "loading") {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-utilix-yellow border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading booking form…</p>
        </div>
      </div>
    );
  }

  if (pageState === "submitting") {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 border-3 border-utilix-yellow border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-utilix-black mb-2">
            Processing your request…
          </h2>
          <p className="text-gray-500 text-sm">
            Acquiring slot lock and evaluating allocation policy.
          </p>
        </div>
      </div>
    );
  }

  if (pageState === "success" && createdRequest) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-white rounded-xl border border-green-200 p-8 text-center">
          <div className="text-5xl mb-4">{isWaitlisted ? "📋" : "✅"}</div>
          <h2 className="text-xl font-bold text-utilix-black mb-2">
            {isWaitlisted ? "Added to Waitlist" : "Request Submitted!"}
          </h2>
          <p className="text-gray-600 mb-6">
            {isWaitlisted
              ? "The requested slot is currently contested. You have been placed on the priority waitlist."
              : "Your booking request has been locked and recorded under the active policy."}
          </p>

          <div className="bg-utilix-cream rounded-lg p-4 text-left mb-6 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-500">Request ID</span>
                <p className="font-mono font-medium">{createdRequest.id}</p>
              </div>
              <div>
                <span className="text-gray-500">Status</span>
                <p className="font-medium capitalize">{createdRequest.status}</p>
              </div>
              <div>
                <span className="text-gray-500">Resource</span>
                <p className="font-medium">{createdRequest.resourceName}</p>
              </div>
              <div>
                <span className="text-gray-500">Date &amp; Time</span>
                <p className="font-medium">
                  {createdRequest.date} · {createdRequest.startTime}–
                  {createdRequest.endTime}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Purpose</span>
                <p className="font-medium">{createdRequest.purpose}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Link
              href={`/requests/${createdRequest.id}`}
              className="bg-utilix-yellow text-utilix-black font-medium px-6 py-2.5 rounded-lg
                         hover:bg-yellow-400 transition-colors text-sm"
            >
              View Request
            </Link>
            <Link
              href="/resources"
              className="bg-white text-utilix-black font-medium px-6 py-2.5 rounded-lg
                         border border-gray-300 hover:bg-gray-50 transition-colors text-sm"
            >
              Browse More Resources
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-utilix-black mb-2">
            Something went wrong
          </h2>
          <p className="text-red-600 mb-6">
            {submitError ?? "An unexpected error occurred."}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setPageState("form")}
              className="bg-utilix-yellow text-utilix-black font-medium px-6 py-2.5 rounded-lg
                         hover:bg-yellow-400 transition-colors text-sm"
            >
              Try Again
            </button>
            <Link
              href="/resources"
              className="bg-white text-utilix-black font-medium px-6 py-2.5 rounded-lg
                         border border-gray-300 hover:bg-gray-50 transition-colors text-sm"
            >
              Back to Resources
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href={`/resources/${id}`}
        className="inline-block mb-4 text-sm text-gray-500 hover:text-utilix-black"
      >
        ← Back to {resource?.name ?? "resource"}
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-utilix-black mb-1">
          Book Resource
        </h1>
        {resource && (
          <p className="text-gray-500 mb-6">
            {resource.name} · {resource.location}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-utilix-black mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => updateField("date", e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2
                focus:ring-utilix-yellow ${
                  fieldError("date")
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300"
                }`}
            />
            {fieldError("date") && (
              <p className="text-red-600 text-sm mt-1">{fieldError("date")}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-utilix-black mb-1">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => updateField("startTime", e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2
                  focus:ring-utilix-yellow ${
                    fieldError("startTime")
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300"
                  }`}
              />
              {fieldError("startTime") && (
                <p className="text-red-600 text-sm mt-1">
                  {fieldError("startTime")}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-utilix-black mb-1">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => updateField("endTime", e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2
                  focus:ring-utilix-yellow ${
                    fieldError("endTime")
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300"
                  }`}
              />
              {fieldError("endTime") && (
                <p className="text-red-600 text-sm mt-1">
                  {fieldError("endTime")}
                </p>
              )}
            </div>
          </div>

          {resource && (
            <p className="text-xs text-gray-500">
              Maximum session duration: {resource.max_session_minutes} minutes · Cost: {resource.credit_cost} credits
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-utilix-black mb-1">
              Purpose <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.purpose}
              onChange={(e) => updateField("purpose", e.target.value)}
              placeholder="e.g., Printing enclosure for capstone sensor module"
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2
                focus:ring-utilix-yellow ${
                  fieldError("purpose")
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300"
                }`}
            />
            {fieldError("purpose") && (
              <p className="text-red-600 text-sm mt-1">
                {fieldError("purpose")}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-utilix-black mb-1">
              Additional Details
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Materials needed, special requirements, etc."
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-utilix-yellow
                         resize-none"
            />
          </div>

          {isSpace && (
            <div>
              <label className="block text-sm font-medium text-utilix-black mb-1">
                Number of People
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={formData.headcount ?? ""}
                onChange={(e) =>
                  updateField(
                    "headcount",
                    e.target.value ? parseInt(e.target.value, 10) : undefined,
                  )
                }
                placeholder="Number of participants"
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2
                  focus:ring-utilix-yellow ${
                    fieldError("headcount")
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300"
                  }`}
              />
              {fieldError("headcount") && (
                <p className="text-red-600 text-sm mt-1">
                  {fieldError("headcount")}
                </p>
              )}
            </div>
          )}

          {resource && resource.status !== "available" && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-800">
              ⚠️ This resource is currently <strong>{resource.status}</strong>{" "}
              and cannot be booked at this time.
            </div>
          )}

          <button
            type="submit"
            disabled={resource?.status !== "available"}
            className="w-full bg-utilix-yellow text-utilix-black font-semibold py-3 rounded-lg
                       hover:bg-yellow-400 transition-colors disabled:opacity-50
                       disabled:cursor-not-allowed"
          >
            Submit Booking Request
          </button>
        </form>
      </div>
    </div>
  );
}

export default function BookResourcePage({
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
      <BookFormInner params={params} />
    </Suspense>
  );
}
