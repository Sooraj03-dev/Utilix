/* ═══════════════════════════════════════════════════════════════════════════
 * Resources Page — Browse campus equipment and spaces
 * Owner B · app/(workflow)/resources/page.tsx
 * ═══════════════════════════════════════════════════════════════════════════ */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Resource, ResourceCategory } from "../_lib/types";

type FilterCategory = ResourceCategory | "all";

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<FilterCategory>("all");

  useEffect(() => {
    async function fetchResources() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (category !== "all") params.set("category", category);
        if (search) params.set("q", search);

        const res = await fetch(`/api/workflow/resources?${params}`);
        const json = await res.json();

        if (!json.success) throw new Error(json.error?.message || json.error || "Failed to load resources");
        setResources(json.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load resources");
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(fetchResources, 300);
    return () => clearTimeout(timer);
  }, [category, search]);

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-utilix-black">
          Campus Resources
        </h1>
        <p className="text-gray-600 mt-1">
          Browse and book equipment or spaces for your academic projects.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search resources by name or location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-utilix-yellow
                     bg-white text-utilix-black placeholder-gray-400"
        />
        <div className="flex gap-2">
          {(["all", "equipment", "space"] as FilterCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${
                  category === cat
                    ? "bg-utilix-yellow text-utilix-black"
                    : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
                }`}
            >
              {cat === "all" ? "All" : cat === "equipment" ? "Equipment" : "Spaces"}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-utilix-yellow border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Loading resources…</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Something went wrong</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && resources.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="text-lg font-medium text-gray-900">
            No resources found
          </h3>
          <p className="text-gray-500 mt-1">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}

      {/* Resource Grid */}
      {!loading && !error && resources.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Resource Card Component ─────────────────────────────────────────────

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

function ResourceCard({ resource }: { resource: Resource }) {
  const statusColors: Record<string, string> = {
    available: "bg-green-100 text-green-800",
    maintenance: "bg-orange-100 text-orange-800",
    retired: "bg-gray-100 text-gray-500",
  };

  const isSpace =
    resource.type === "studio" || resource.type === "project_room";

  const tags = [
    formatResourceType(resource.type),
    resource.restricted ? "Approval Needed" : "Direct Booking",
    resource.credit_cost > 0 ? `${resource.credit_cost} credits` : "Free session",
  ];

  return (
    <Link
      href={`/resources/${resource.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-5
                 hover:shadow-md hover:border-utilix-yellow transition-all
                 group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-utilix-black group-hover:text-utilix-yellow transition-colors truncate">
            {resource.name}
          </h3>
          <p className="text-sm text-gray-500 capitalize">
            {resource.department_id.replace("dept_", "")} · {formatResourceType(resource.type)}
          </p>
        </div>
        <span
          className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
            statusColors[resource.status] ?? "bg-gray-100 text-gray-500"
          }`}
        >
          {resource.status}
        </span>
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1">
          📍 {resource.location}
        </span>
        <span className="flex items-center gap-1">
          ⏱ Up to {resource.max_session_minutes}m
        </span>
        {isSpace && (
          <span className="flex items-center gap-1">
            👥 Space
          </span>
        )}
        {resource.requires_training && (
          <span className="flex items-center gap-1 text-orange-600">
            🎓 Training: {resource.requires_training.replace(/_/g, " ")}
          </span>
        )}
      </div>

      {/* Badges / Tags */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 bg-utilix-cream text-utilix-black text-xs rounded-full font-medium"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* CTA */}
      {resource.status === "available" && (
        <div className="mt-4 text-right">
          <span className="text-sm font-medium text-utilix-black group-hover:text-utilix-yellow transition-colors">
            View &amp; Book →
          </span>
        </div>
      )}
    </Link>
  );
}
