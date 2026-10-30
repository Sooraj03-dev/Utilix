import { requireRoleOrRedirect } from "@/lib/auth/guards";
import { queryAuditLogs } from "@/lib/db/audit";
import { buildAuditFilter } from "@/lib/audit-filters";
import { AuditExplorer } from "./_components/audit-explorer";
import { ScrollText, ShieldAlert, Sparkles } from "lucide-react";

interface AdminAuditPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({
  searchParams,
}: AdminAuditPageProps) {
  await requireRoleOrRedirect(["admin"], "/dashboard/admin/audit");

  const rawParams = await searchParams;
  const filters = buildAuditFilter(rawParams || {});

  const { entries, nextCursor, prevCursor, totalMatching } =
    await queryAuditLogs(filters, 25, filters.cursor);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="rounded-2xl border-[3px] border-[#111111] bg-white p-6 shadow-[4px_4px_0px_0px_#111111]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FFD60A] border-[2px] border-[#111111] text-xs font-black tracking-wide uppercase shadow-[2px_2px_0px_0px_#111111] mb-2">
              <ScrollText className="w-3.5 h-3.5 text-[#111111]" />
              Immutable Algorithmic Ledger
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
              Algorithmic Decision & Audit Trail
            </h1>
            <p className="mt-1 text-sm text-[#555555] font-medium max-w-2xl">
              Inspect immutable audit records of all campus resource allocations, tie-breaking
              decisions, rule version changes, and credit ledger transitions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3.5 py-2 rounded-xl border-[2px] border-[#111111] bg-[#FFF9E6] text-xs font-bold text-[#111111] shadow-[2px_2px_0px_0px_#111111]">
              <span className="font-black text-sm">{totalMatching}</span> Total Audit Records
            </div>
          </div>
        </div>
      </div>

      {/* ── Interactive Audit Explorer ── */}
      <AuditExplorer
        entries={entries}
        nextCursor={nextCursor}
        prevCursor={prevCursor}
        totalMatching={totalMatching}
        currentFilters={filters}
      />
    </div>
  );
}
