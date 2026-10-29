"use client";

import React, { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { AuditLogEntry, AuditAction } from "@/lib/types";
import {
  formatAuditAction,
  formatEntityType,
  formatActor,
  formatScoreBreakdown,
  AUDIT_ACTION_MAP,
  ENTITY_TYPE_LABELS,
  type AuditFilterCriteria,
} from "@/lib/audit-filters";
import {
  Search,
  Filter,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  ArrowLeft,
  Calendar,
  User,
  Sliders,
  FileText,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/components/utils";

interface AuditExplorerProps {
  entries: AuditLogEntry[];
  nextCursor: string | null;
  prevCursor: string | null;
  totalMatching: number;
  currentFilters: AuditFilterCriteria;
}

export function AuditExplorer({
  entries,
  nextCursor,
  prevCursor,
  totalMatching,
  currentFilters,
}: AuditExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Form filter state
  const [entityIdInput, setEntityIdInput] = useState(currentFilters.entity_id || "");
  const [actorInput, setActorInput] = useState(currentFilters.actor || "");
  const [actionInput, setActionInput] = useState(currentFilters.action || "");
  const [entityTypeInput, setEntityTypeInput] = useState(currentFilters.entity_type || "");
  const [dateFromInput, setDateFromInput] = useState(currentFilters.date_from || "");
  const [dateToInput, setDateToInput] = useState(currentFilters.date_to || "");

  // Expanded row tracking
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const applyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const params = new URLSearchParams();
    if (entityIdInput.trim()) params.set("entity_id", entityIdInput.trim());
    if (actorInput.trim()) params.set("actor", actorInput.trim());
    if (actionInput) params.set("action", actionInput);
    if (entityTypeInput) params.set("entity_type", entityTypeInput);
    if (dateFromInput) params.set("date_from", dateFromInput);
    if (dateToInput) params.set("date_to", dateToInput);

    // Reset pagination on new search
    router.push(`${pathname}?${params.toString()}`);
  };

  const resetFilters = () => {
    setEntityIdInput("");
    setActorInput("");
    setActionInput("");
    setEntityTypeInput("");
    setDateFromInput("");
    setDateToInput("");
    router.push(pathname);
  };

  const goToCursor = (cursor: string | null) => {
    if (!cursor) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("cursor", cursor);
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasActiveFilters = Boolean(
    currentFilters.entity_id ||
      currentFilters.actor ||
      currentFilters.action ||
      currentFilters.entity_type ||
      currentFilters.date_from ||
      currentFilters.date_to
  );

  return (
    <div className="space-y-6">
      {/* ── Filters Section ── */}
      <div className="rounded-2xl border-[3px] border-[#111111] bg-white p-5 sm:p-6 shadow-[4px_4px_0px_0px_#111111]">
        <div className="flex items-center justify-between gap-3 pb-3 border-b-[2px] border-[#111111]">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-[#111111]" />
            <h2 className="text-base sm:text-lg font-black text-[#111111]">
              Audit Log Query & Verification Filters
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowFiltersMobile(!showFiltersMobile)}
            className="sm:hidden px-3 py-1.5 rounded-lg border-[2px] border-[#111111] bg-[#FFD60A] text-xs font-black shadow-[2px_2px_0px_0px_#111111] min-h-[44px]"
          >
            {showFiltersMobile ? "Hide Filters" : "Show Filters"}
          </button>
        </div>

        <form
          onSubmit={applyFilters}
          className={cn(
            "mt-4 space-y-4",
            !showFiltersMobile && "hidden sm:block"
          )}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Entity ID */}
            <div>
              <label
                htmlFor="filter-entity-id"
                className="block text-xs font-black uppercase tracking-wider text-[#333333] mb-1"
              >
                Entity ID / Booking ID
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#777777]" />
                <input
                  id="filter-entity-id"
                  type="text"
                  value={entityIdInput}
                  onChange={(e) => setEntityIdInput(e.target.value)}
                  placeholder="e.g. booking-102 or res-3d-printer"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border-[2px] border-[#111111] bg-[#FAF8F5] text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FFD60A] min-h-[44px]"
                />
              </div>
            </div>

            {/* Action */}
            <div>
              <label
                htmlFor="filter-action"
                className="block text-xs font-black uppercase tracking-wider text-[#333333] mb-1"
              >
                Action Type
              </label>
              <select
                id="filter-action"
                value={actionInput}
                onChange={(e) => setActionInput(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border-[2px] border-[#111111] bg-[#FAF8F5] text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FFD60A] min-h-[44px]"
              >
                <option value="">All Actions</option>
                {Object.entries(AUDIT_ACTION_MAP).map(([actionKey, meta]) => (
                  <option key={actionKey} value={actionKey}>
                    {meta.label} ({actionKey})
                  </option>
                ))}
              </select>
            </div>

            {/* Entity Type */}
            <div>
              <label
                htmlFor="filter-entity-type"
                className="block text-xs font-black uppercase tracking-wider text-[#333333] mb-1"
              >
                Entity Category
              </label>
              <select
                id="filter-entity-type"
                value={entityTypeInput}
                onChange={(e) => setEntityTypeInput(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border-[2px] border-[#111111] bg-[#FAF8F5] text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FFD60A] min-h-[44px]"
              >
                <option value="">All Entity Categories</option>
                {Object.entries(ENTITY_TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Actor ID */}
            <div>
              <label
                htmlFor="filter-actor"
                className="block text-xs font-black uppercase tracking-wider text-[#333333] mb-1"
              >
                Actor ID / Email / System
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#777777]" />
                <input
                  id="filter-actor"
                  type="text"
                  value={actorInput}
                  onChange={(e) => setActorInput(e.target.value)}
                  placeholder="e.g. system, ai, or user@utilix.edu"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border-[2px] border-[#111111] bg-[#FAF8F5] text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FFD60A] min-h-[44px]"
                />
              </div>
            </div>

            {/* Date From */}
            <div>
              <label
                htmlFor="filter-date-from"
                className="block text-xs font-black uppercase tracking-wider text-[#333333] mb-1"
              >
                From Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#777777]" />
                <input
                  id="filter-date-from"
                  type="date"
                  value={dateFromInput}
                  onChange={(e) => setDateFromInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border-[2px] border-[#111111] bg-[#FAF8F5] text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FFD60A] min-h-[44px]"
                />
              </div>
            </div>

            {/* Date To */}
            <div>
              <label
                htmlFor="filter-date-to"
                className="block text-xs font-black uppercase tracking-wider text-[#333333] mb-1"
              >
                To Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#777777]" />
                <input
                  id="filter-date-to"
                  type="date"
                  value={dateToInput}
                  onChange={(e) => setDateToInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border-[2px] border-[#111111] bg-[#FAF8F5] text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FFD60A] min-h-[44px]"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E5E5E5]">
            <div className="text-xs font-bold text-[#555555]">
              Found <span className="font-black text-[#111111]">{totalMatching}</span> matching audit records
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-[2px] border-[#111111] bg-white hover:bg-[#FAF8F5] text-xs font-black text-[#111111] shadow-[2px_2px_0px_0px_#111111] min-h-[44px]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-[2px] border-[#111111] bg-[#FFD60A] hover:bg-[#FFE047] text-xs font-black text-[#111111] shadow-[2px_2px_0px_0px_#111111] min-h-[44px]"
              >
                <Filter className="w-3.5 h-3.5" />
                Apply Filters
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Active Filter Pills ── */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-black text-[#555555]">Active filters:</span>
          {currentFilters.entity_id && (
            <span className="px-2.5 py-1 rounded-lg bg-white border border-[#111111] font-bold shadow-[1px_1px_0px_0px_#111111]">
              Entity ID: {currentFilters.entity_id}
            </span>
          )}
          {currentFilters.action && (
            <span className="px-2.5 py-1 rounded-lg bg-white border border-[#111111] font-bold shadow-[1px_1px_0px_0px_#111111]">
              Action: {formatAuditAction(currentFilters.action).label}
            </span>
          )}
          {currentFilters.entity_type && (
            <span className="px-2.5 py-1 rounded-lg bg-white border border-[#111111] font-bold shadow-[1px_1px_0px_0px_#111111]">
              Type: {formatEntityType(currentFilters.entity_type)}
            </span>
          )}
          {currentFilters.actor && (
            <span className="px-2.5 py-1 rounded-lg bg-white border border-[#111111] font-bold shadow-[1px_1px_0px_0px_#111111]">
              Actor: {currentFilters.actor}
            </span>
          )}
          {currentFilters.date_from && (
            <span className="px-2.5 py-1 rounded-lg bg-white border border-[#111111] font-bold shadow-[1px_1px_0px_0px_#111111]">
              From: {currentFilters.date_from}
            </span>
          )}
          {currentFilters.date_to && (
            <span className="px-2.5 py-1 rounded-lg bg-white border border-[#111111] font-bold shadow-[1px_1px_0px_0px_#111111]">
              To: {currentFilters.date_to}
            </span>
          )}
        </div>
      )}

      {/* ── Results List / Cards ── */}
      {entries.length === 0 ? (
        <div className="rounded-2xl border-[3px] border-[#111111] bg-white p-12 text-center shadow-[4px_4px_0px_0px_#111111]">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF9E6] border-[2px] border-[#111111] flex items-center justify-center mx-auto mb-4 shadow-[2px_2px_0px_0px_#111111]">
            <AlertCircle className="w-7 h-7 text-[#111111]" />
          </div>
          <h3 className="text-lg font-black text-[#111111]">No Audit Records Match Query</h3>
          <p className="mt-1 text-sm text-[#555555] max-w-md mx-auto">
            {hasActiveFilters
              ? "No audit records match the current filter criteria. Try broadening your date range or clearing specific filter parameters."
              : "No audit records have been generated yet in the system."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-[2px] border-[#111111] bg-[#FFD60A] text-xs font-black shadow-[2px_2px_0px_0px_#111111] min-h-[44px]"
            >
              <RotateCcw className="w-4 h-4" />
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table */}
          <div className="hidden md:block rounded-2xl border-[3px] border-[#111111] bg-white overflow-hidden shadow-[4px_4px_0px_0px_#111111]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FFF9E6] border-b-[2.5px] border-[#111111] text-xs font-black uppercase tracking-wider text-[#111111]">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Entity</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Rule Ver</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y-[2px] divide-[#111111]/10 text-sm font-medium">
                {entries.map((entry) => {
                  const actionMeta = formatAuditAction(entry.action);
                  const actorMeta = formatActor(entry.actor_id);
                  const isExpanded = expandedIds.has(entry.id);
                  const scoreItems = formatScoreBreakdown(entry.scores);
                  const dateStr = new Date(entry.created_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <React.Fragment key={entry.id}>
                      <tr
                        onClick={() => toggleExpand(entry.id)}
                        className={cn(
                          "cursor-pointer transition-colors duration-100 select-none",
                          isExpanded ? "bg-[#FFFDF5]" : "hover:bg-[#FAF8F5]"
                        )}
                      >
                        <td className="py-3.5 px-4 text-xs font-mono font-bold text-[#444444] whitespace-nowrap">
                          {dateStr}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#111111] bg-[#FAF8F5] text-xs font-black">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#111111]" />
                            <span>{actionMeta.label}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#666666]">
                              {formatEntityType(entry.entity_type)}:
                            </span>
                            <span className="font-mono text-xs font-black text-[#111111] bg-white px-1.5 py-0.5 rounded border border-[#CCCCCC]">
                              {entry.entity_id}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <span
                            className={cn(
                              "font-mono px-2 py-0.5 rounded border text-[11px] font-bold",
                              actorMeta.isSystem
                                ? "bg-[#FFF9E6] border-[#111111] text-[#111111]"
                                : "bg-white border-[#DDDDDD] text-[#333333]"
                            )}
                          >
                            {actorMeta.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-xs font-black px-2 py-0.5 rounded bg-white border border-[#111111]">
                            {entry.rule_version || "v1"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            aria-label={`Toggle decision details for ${entry.id}`}
                            className="p-1 rounded-lg border border-[#111111] bg-white hover:bg-[#FFD60A] min-h-[32px] min-w-[32px] inline-flex items-center justify-center transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-[#111111]" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-[#111111]" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded row content */}
                      {isExpanded && (
                        <tr className="bg-[#FFFDF5] border-b-[2px] border-[#111111]/20">
                          <td colSpan={6} className="p-4 sm:p-5">
                            <div className="rounded-xl border-[2px] border-[#111111] bg-white p-4 shadow-[2px_2px_0px_0px_#111111] space-y-3">
                              {/* Reason */}
                              <div>
                                <span className="text-xs font-black uppercase tracking-wider text-[#444444] block mb-1">
                                  Algorithmic Decision Reason / Explanation:
                                </span>
                                <p className="text-sm font-medium text-[#222222] bg-[#FAF8F5] p-3 rounded-lg border border-[#E5E5E5] leading-relaxed">
                                  {entry.reason || "Standard lifecycle transition without additional explanatory annotations."}
                                </p>
                              </div>

                              {/* Scores */}
                              {scoreItems.length > 0 && (
                                <div>
                                  <span className="text-xs font-black uppercase tracking-wider text-[#444444] flex items-center gap-1.5 mb-2">
                                    <Sparkles className="w-3.5 h-3.5 text-[#FFD60A]" />
                                    Scoring & Weight Breakdown:
                                  </span>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    {scoreItems.map((item) => (
                                      <div
                                        key={item.key}
                                        className="bg-[#FAF8F5] rounded-xl p-2.5 border border-[#CCCCCC] text-center"
                                      >
                                        <span className="text-[11px] text-[#666666] font-bold block truncate">
                                          {item.label}
                                        </span>
                                        <span className="text-sm font-black text-[#111111]">
                                          {item.value}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Technical Metadata */}
                              <div className="pt-2 border-t border-[#E5E5E5] flex flex-wrap items-center justify-between gap-2 text-xs text-[#666666]">
                                <span>
                                  Record ID: <code className="font-mono font-bold text-[#111111]">{entry.id}</code>
                                </span>
                                <span>
                                  Created: <time dateTime={entry.created_at}>{entry.created_at}</time>
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {entries.map((entry) => {
              const actionMeta = formatAuditAction(entry.action);
              const actorMeta = formatActor(entry.actor_id);
              const isExpanded = expandedIds.has(entry.id);
              const scoreItems = formatScoreBreakdown(entry.scores);
              const dateStr = new Date(entry.created_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={entry.id}
                  className="rounded-2xl border-[3px] border-[#111111] bg-white p-4 shadow-[3px_3px_0px_0px_#111111]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[#111111] bg-[#FAF8F5] text-xs font-black">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#111111]" />
                        <span>{actionMeta.label}</span>
                      </div>
                      <div className="text-xs text-[#666666] font-mono font-bold">
                        {dateStr}
                      </div>
                    </div>
                    <span className="text-xs font-black px-2 py-0.5 rounded bg-[#FAF8F5] border border-[#111111]">
                      {entry.rule_version || "v1"}
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#E5E5E5] text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#555555]">Entity:</span>
                      <span className="font-mono font-black text-[#111111]">
                        {formatEntityType(entry.entity_type)}: {entry.entity_id}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#555555]">Actor:</span>
                      <span className="font-mono font-bold text-[#111111]">
                        {actorMeta.label}
                      </span>
                    </div>
                  </div>

                  {/* Toggle button */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(entry.id)}
                    className="mt-3 w-full py-2 px-3 rounded-xl border-[2px] border-[#111111] bg-[#FAF8F5] hover:bg-[#FFF9E6] text-xs font-black text-[#111111] flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    <span>{isExpanded ? "Hide Details" : "Expand Decision Details"}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Expanded mobile panel */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t-[2px] border-[#111111]/20 space-y-3">
                      <div>
                        <span className="text-[11px] font-black uppercase text-[#444444] block mb-1">
                          Decision Reason:
                        </span>
                        <p className="text-xs font-medium text-[#222222] bg-[#FAF8F5] p-2.5 rounded-lg border border-[#E5E5E5]">
                          {entry.reason || "Standard lifecycle transition."}
                        </p>
                      </div>

                      {scoreItems.length > 0 && (
                        <div>
                          <span className="text-[11px] font-black uppercase text-[#444444] flex items-center gap-1 mb-1.5">
                            <Sparkles className="w-3 h-3 text-[#FFD60A]" />
                            Score Breakdown:
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            {scoreItems.map((item) => (
                              <div
                                key={item.key}
                                className="bg-[#FAF8F5] rounded-lg p-2 border border-[#CCCCCC] text-center"
                              >
                                <span className="text-[10px] text-[#666666] font-bold block truncate">
                                  {item.label}
                                </span>
                                <span className="text-xs font-black text-[#111111]">
                                  {item.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Cursor Pagination ── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t-[2px] border-[#111111]/20">
            <div className="text-xs font-bold text-[#555555]">
              Showing <span className="font-black text-[#111111]">{entries.length}</span> records
              (of {totalMatching} total)
            </div>

            <div className="flex items-center gap-2">
              {currentFilters.cursor && (
                <button
                  type="button"
                  onClick={() => router.push(pathname)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-[2px] border-[#111111] bg-white hover:bg-[#FAF8F5] text-xs font-black shadow-[2px_2px_0px_0px_#111111] min-h-[44px]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  First Page
                </button>
              )}

              {nextCursor && (
                <button
                  type="button"
                  onClick={() => goToCursor(nextCursor)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-[2px] border-[#111111] bg-[#FFD60A] hover:bg-[#FFE047] text-xs font-black text-[#111111] shadow-[2px_2px_0px_0px_#111111] min-h-[44px]"
                >
                  <span>Next 25 Records</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
