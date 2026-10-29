// Utilix — student history: Bookings / Credit ledger / Issues (Server Component)
// Owner: A
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  Coins,
} from "lucide-react";

import { Card, Button, EmptyState } from "@/components";
import { cn } from "@/components/utils";
import { requireSessionUser } from "@/lib/auth";
import {
  listPastBookingsPage,
  listLedgerPage,
  listIssuesPage,
  listResources,
} from "@/lib/db";
import { getBookingStatusLabel, getLedgerReasonLabel } from "@/lib/types/labels";
import type { Booking, CreditLedgerEntry, IssueReport } from "@/lib/types";

const PAGE_SIZE = 20;
const TABS = ["bookings", "credits", "issues"] as const;
type Tab = (typeof TABS)[number];
type PageResult<T> = { items: T[]; nextCursor: string | null };

function isTab(value: string | undefined): value is Tab {
  return (TABS as readonly string[]).includes(value ?? "");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; cursor?: string }>;
}) {
  const sessionUser = await requireSessionUser();
  const params = await searchParams;
  const tab: Tab = isTab(params.tab) ? params.tab : "bookings";
  const cursor = params.cursor ?? null;

  const resources = await listResources().catch(() => []);
  const resourceName = (id: string) =>
    resources.find((r) => r.id === id)?.name ?? id;

  let bookings: PageResult<Booking> = { items: [], nextCursor: null };
  let ledger: PageResult<CreditLedgerEntry> = { items: [], nextCursor: null };
  let issues: PageResult<IssueReport> = { items: [], nextCursor: null };

  if (tab === "bookings") {
    bookings = await listPastBookingsPage(sessionUser.uid, PAGE_SIZE, cursor).catch(
      () => ({ items: [], nextCursor: null })
    );
  } else if (tab === "credits") {
    ledger = await listLedgerPage(sessionUser.uid, PAGE_SIZE, cursor).catch(() => ({
      items: [],
      nextCursor: null,
    }));
  } else {
    issues = await listIssuesPage(sessionUser.uid, PAGE_SIZE, cursor).catch(() => ({
      items: [],
      nextCursor: null,
    }));
  }

  const items: { id: string }[] =
    tab === "bookings" ? bookings.items : tab === "credits" ? ledger.items : issues.items;
  const nextCursor =
    tab === "bookings"
      ? bookings.nextCursor
      : tab === "credits"
      ? ledger.nextCursor
      : issues.nextCursor;
  const last = items[items.length - 1];
  const showEmpty = items.length === 0;
  const hasOlder = Boolean(nextCursor);
  const hasNewer = Boolean(cursor);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header>
        <p className="text-xs font-black uppercase tracking-wider text-black/60">
          Utilix · My history
        </p>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">History</h1>
      </header>

      {/* Tabs — linkable via searchParams so deep links work */}
      <nav aria-label="History tabs" className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <Link key={t} href={`/history?tab=${t}`} className="shrink-0">
            <span
              className={cn(
                "inline-flex items-center min-h-[44px] px-5 rounded-2xl font-black text-xs sm:text-sm border-[2.5px] border-[#111111]",
                tab === t
                  ? "bg-[#FFD60A] shadow-[3px_3px_0px_#111]"
                  : "bg-[#FFFEF2] shadow-[1.5px_1.5px_0px_#111]"
              )}
            >
              {t === "credits" ? "Credit ledger" : t === "issues" ? "Issues reported" : "Bookings"}
            </span>
          </Link>
        ))}
      </nav>

      {showEmpty ? (
        <EmptyState
          icon={tab === "credits" ? Coins : tab === "issues" ? AlertTriangle : ClipboardList}
          title={
            tab === "credits"
              ? "No credit activity yet"
              : tab === "issues"
              ? "No issues reported yet"
              : "No past bookings yet"
          }
          description={
            tab === "credits"
              ? "Credit top-ups, charges and refunds will be listed here once they happen."
              : tab === "issues"
              ? "When you report a problem with equipment, the report will appear here."
              : "Past sessions will fill this list once you start booking resources."
          }
          className="shadow-[6px_6px_0px_0px_#111111]"
        />
      ) : (
        <>
          <ul className="space-y-3">
            {tab === "bookings" &&
              bookings.items.map((b) => (
                <li key={b.id}>
                  <Card className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-black truncate">{resourceName(b.resource_id)}</p>
                      <p className="text-xs font-bold text-black/70 mt-1">
                        {formatDate(b.slot_start)} · {b.slot_start.slice(11, 16)}–
                        {b.slot_end.slice(11, 16)} UTC · {b.cost_credits} credit
                        {b.cost_credits === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className="text-[11px] sm:text-xs font-black rounded-full border-[2.5px] border-[#111111] px-3 py-1 bg-[#FFFEF2] shrink-0">
                      {getBookingStatusLabel(b.status)}
                    </span>
                  </Card>
                </li>
              ))}

            {tab === "credits" &&
              ledger.items.map((e) => (
                <li key={e.id}>
                  <Card className="p-4 flex items-center gap-4">
                    <span
                      className={cn(
                        "w-14 h-10 rounded-2xl border-[3px] border-[#111111] font-black tabular-nums flex items-center justify-center shrink-0",
                        e.delta >= 0 ? "bg-[#4ADE80]" : "bg-[#EF4444] text-white"
                      )}
                      aria-label={`${e.delta >= 0 ? "+" : ""}${e.delta} credits`}
                    >
                      {e.delta >= 0 ? "+" : ""}
                      {e.delta}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm">{getLedgerReasonLabel(e.reason)}</p>
                      <p className="text-xs font-bold text-black/70 mt-0.5">
                        {formatDateTime(e.created_at)} · balance after:{" "}
                        <span className="tabular-nums">{e.balance_after}</span>
                      </p>
                    </div>
                  </Card>
                </li>
              ))}

            {tab === "issues" &&
              issues.items.map((i) => (
                <li key={i.id}>
                  <Card className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-black text-sm">{resourceName(i.resource_id)}</p>
                        <p className="text-xs font-bold text-black/70 mt-1 line-clamp-2">
                          {i.notes}
                        </p>
                      </div>
                      <span className="text-[11px] sm:text-xs font-black uppercase rounded-full border-[2.5px] border-[#111111] px-3 py-1 bg-[#FFFEF2] shrink-0">
                        {i.status}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-black/60 mt-2">
                      reported {formatDateTime(i.created_at)} · category: {i.category}
                    </p>
                  </Card>
                </li>
              ))}
          </ul>

          {/* Cursor pagination footer */}
          <div className="flex items-center justify-between min-h-[44px] gap-3">
            {hasNewer ? (
              <Link href={`/history?tab=${tab}`}>
                <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  Newer
                </Button>
              </Link>
            ) : (
              <span />
            )}
            <span className="text-xs font-bold text-black/60 hidden sm:block">
              Newest first · {PAGE_SIZE} per page
            </span>
            {hasOlder && last ? (
              <Link href={`/history?tab=${tab}&cursor=${encodeURIComponent(last.id)}`}>
                <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Older
                </Button>
              </Link>
            ) : (
              <span />
            )}
          </div>
        </>
      )}
    </div>
  );
}
