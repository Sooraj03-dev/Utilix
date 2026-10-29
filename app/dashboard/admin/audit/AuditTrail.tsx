import React from "react";
import { queryAuditLogs } from "@/lib/db/audit";
import {
  formatAuditAction,
  formatActor,
  formatScoreBreakdown,
} from "@/lib/audit-filters";
import {
  History,
  ShieldCheck,
  Cpu,
  Clock,
  Sparkles,
  ChevronRight,
  Info,
} from "lucide-react";
import { cn } from "@/components/utils";

export interface AuditTrailProps {
  entityId: string;
  title?: string;
  className?: string;
  emptyMessage?: string;
}

/**
 * Shared server component that displays the immutable audit decision trail
 * for a specific entity (e.g., booking, resource, policy).
 * Exported for Owner B to embed on request detail and workflow pages.
 */
export async function AuditTrail({
  entityId,
  title = "Algorithmic Decision & Audit Trail",
  className,
  emptyMessage = "No audit log entries recorded for this entity yet.",
}: AuditTrailProps) {
  const { entries } = await queryAuditLogs({ entity_id: entityId }, 50);

  return (
    <section
      aria-label="Audit Trail"
      className={cn(
        "rounded-2xl border-[3px] border-[#111111] bg-white p-5 sm:p-6 shadow-[4px_4px_0px_0px_#111111]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b-[2.5px] border-[#111111]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#FFD60A] border-[2px] border-[#111111] flex items-center justify-center shadow-[2px_2px_0px_0px_#111111]">
            <History className="w-5 h-5 text-[#111111]" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#111111] leading-tight">
              {title}
            </h3>
            <p className="text-xs text-[#555555] font-medium">
              Entity Reference: <code className="font-mono font-bold text-[#111111]">{entityId}</code>
            </p>
          </div>
        </div>
        <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#FAF8F5] border-[2px] border-[#111111]">
          {entries.length} {entries.length === 1 ? "Event" : "Events"}
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="py-8 px-4 text-center rounded-xl border-[2px] border-dashed border-[#CCCCCC] bg-[#FAF8F5]">
          <Info className="w-8 h-8 text-[#888888] mx-auto mb-2" />
          <p className="text-sm font-bold text-[#444444]">{emptyMessage}</p>
          <p className="text-xs text-[#777777] mt-1">
            State transitions and scoring decisions will appear here automatically.
          </p>
        </div>
      ) : (
        <ol className="relative border-l-[2.5px] border-[#111111] ml-3 sm:ml-4 space-y-6">
          {entries.map((entry, idx) => {
            const actionMeta = formatAuditAction(entry.action);
            const actorMeta = formatActor(entry.actor_id);
            const scoreItems = formatScoreBreakdown(entry.scores);
            const formattedDate = new Date(entry.created_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });

            return (
              <li key={entry.id || idx} className="ml-6 sm:ml-7 group">
                {/* Timeline node icon */}
                <span className="absolute -left-3.5 flex items-center justify-center w-7 h-7 rounded-full bg-[#FFD60A] border-[2px] border-[#111111] shadow-[1px_1px_0px_0px_#111111]">
                  {actorMeta.isSystem ? (
                    <Cpu className="w-3.5 h-3.5 text-[#111111]" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5 text-[#111111]" />
                  )}
                </span>

                <div className="rounded-xl border-[2px] border-[#111111] bg-[#FAF8F5] p-4 shadow-[2px_2px_0px_0px_#111111]">
                  {/* Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E5E5E5]">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-[#111111]">
                        {actionMeta.label}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-[#111111] text-[#333333]">
                        {entry.rule_version || "v1"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#666666] font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <time dateTime={entry.created_at}>{formattedDate}</time>
                    </div>
                  </div>

                  {/* Actor details */}
                  <div className="mt-2 text-xs text-[#555555] flex items-center gap-1.5">
                    <span className="font-bold text-[#222222]">Actor:</span>
                    <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#DDDDDD] text-[#111111]">
                      {actorMeta.label}
                    </span>
                  </div>

                  {/* Decision Reason */}
                  {entry.reason && (
                    <div className="mt-2.5 text-xs text-[#222222] bg-white p-2.5 rounded-lg border border-[#DDDDDD]">
                      <span className="font-bold text-[#111111] block mb-0.5">
                        Algorithmic Reason / Note:
                      </span>
                      <p className="font-medium text-[#333333] leading-relaxed">
                        {entry.reason}
                      </p>
                    </div>
                  )}

                  {/* Scores breakdown */}
                  {scoreItems.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-[#E5E5E5]">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#444444] flex items-center gap-1 mb-2">
                        <Sparkles className="w-3 h-3 text-[#FFD60A]" />
                        Score Breakdown:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {scoreItems.map((item) => (
                          <div
                            key={item.key}
                            className="bg-white rounded-lg p-2 border border-[#CCCCCC] text-center"
                          >
                            <span className="text-[10px] text-[#666666] block font-bold truncate">
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
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export default AuditTrail;
