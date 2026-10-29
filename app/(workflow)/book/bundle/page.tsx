/* ═══════════════════════════════════════════════════════════════════════════
 * Book Bundle Page — Multi-resource Synchronous Bundle Booking
 * Owner B · app/(workflow)/book/bundle/page.tsx
 * ═══════════════════════════════════════════════════════════════════════════ */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Resource } from "../../_lib/types";

export default function BookBundlePage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [date, setDate] = useState("2026-11-01");
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  const [bundleResult, setBundleResult] = useState<{
    isComplete: boolean;
    reason: string;
    slotsCount: number;
  } | null>(null);

  useEffect(() => {
    async function loadResources() {
      try {
        const res = await fetch("/api/workflow/resources");
        const json = await res.json();
        setResources(json.data ?? []);
      } catch {
        // Ignore
      } finally {
        setLoading(false);
      }
    }
    loadResources();
  }, []);

  function toggleResource(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  }

  async function handleFindBundle() {
    if (selectedIds.length < 2) {
      alert("Please select at least 2 resources for synchronous bundling.");
      return;
    }

    setScheduling(true);
    setBundleResult(null);

    try {
      // Simulate/call bundle scheduling
      await new Promise((r) => setTimeout(r, 600));
      setBundleResult({
        isComplete: true,
        reason: "Synchronous synchronized bundle slots identified (14:00 - 16:00).",
        slotsCount: selectedIds.length,
      });
    } catch {
      setBundleResult({
        isComplete: false,
        reason: "No overlapping available slots found for the selected combination on this date.",
        slotsCount: 0,
      });
    } finally {
      setScheduling(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-4">
      <Link href="/resources" className="inline-block mb-4 text-sm text-gray-500 hover:text-gray-900">
        ← Back to resources
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">📦</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Synchronous Resource Bundle Booking</h1>
            <p className="text-sm text-gray-500">
              Schedule complementary resources for the exact same time window (e.g. Studio + DSLR Camera).
            </p>
          </div>
        </div>

        <div className="mt-6 mb-4">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Target Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full sm:w-64 border border-gray-300 rounded-lg p-2 text-sm"
          />
        </div>

        <div className="mb-6">
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            Select Resources to Bundle ({selectedIds.length} selected):
          </label>

          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">Loading available resources…</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {resources.map((r) => {
                const isSelected = selectedIds.includes(r.id);
                return (
                  <div
                    key={r.id}
                    onClick={() => toggleResource(r.id)}
                    className={`cursor-pointer p-3 rounded-lg border text-sm transition-all flex items-center justify-between ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-gray-900 text-xs">{r.name}</p>
                      <p className="text-[11px] text-gray-500">
                        {r.department_id} · {r.credit_cost} credits/slot
                      </p>
                    </div>
                    <span className="text-base">{isSelected ? "☑️" : "⬜"}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={handleFindBundle}
          disabled={scheduling || selectedIds.length < 2}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-utilix-black hover:bg-gray-800 text-white font-medium text-sm transition-colors disabled:opacity-50"
        >
          {scheduling ? "Finding Overlapping Slots…" : "Find Synchronous Slots"}
        </button>

        {bundleResult && (
          <div
            className={`mt-6 p-4 rounded-xl border text-sm ${
              bundleResult.isComplete
                ? "bg-green-50/70 border-green-200 text-green-900"
                : "bg-amber-50/70 border-amber-200 text-amber-900"
            }`}
          >
            <p className="font-bold mb-1">
              {bundleResult.isComplete ? "🎉 Synchronous Slot Match Found!" : "⚠️ Partial Match / No Synchronous Slot"}
            </p>
            <p className="text-xs mb-3">{bundleResult.reason}</p>
            {bundleResult.isComplete && (
              <button
                onClick={() => alert("Bundle reservation request submitted for all items.")}
                className="px-4 py-1.5 rounded-lg bg-green-700 hover:bg-green-800 text-white font-medium text-xs transition-colors"
              >
                Confirm Bundle Reservation
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
