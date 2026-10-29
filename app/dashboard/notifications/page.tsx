// Utilix — full notification list, unread first (Server Component)
// Owner: A
import { Bell, Inbox } from "lucide-react";

import { Card, Button, EmptyState } from "@/components";
import { requireSessionUser } from "@/lib/auth";
import { listNotificationsByUser } from "@/lib/db";
import type { Notification } from "@/lib/types";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "./actions";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export default async function NotificationsPage() {
  const sessionUser = await requireSessionUser();
  const notifications = await listNotificationsByUser(sessionUser.uid, 50).catch(
    () => [] as Notification[]
  );

  // Unread first, then newest first within each group.
  const sorted = [...notifications].sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    return b.created_at.localeCompare(a.created_at);
  });
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-black/60">
            Utilix · Notifications
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 align-middle text-[10px] sm:text-xs font-black uppercase rounded-full border-2 border-[#111111] bg-[#EF4444] text-white px-2.5 py-1">
                {unreadCount} unread
              </span>
            )}
          </h1>
        </div>
        <form action={markAllNotificationsReadAction}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={unreadCount === 0}
          >
            Mark all as read
          </Button>
        </form>
      </header>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="Booking updates, refunds and waitlist promotions will land here."
          className="shadow-[6px_6px_0px_0px_#111111]"
        />
      ) : (
        <ul className="space-y-3">
          {sorted.map((n) => (
            <li key={n.id}>
              <Card className={`p-4 ${n.read ? "" : "bg-[#FFFDF0]"}`}>
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full border-2 border-[#111111] shrink-0"
                        style={{
                          background: n.read ? "#FFD60A" : "#EF4444",
                        }}
                        aria-label={n.read ? "Read" : "Unread"}
                      />
                      <p className="font-black text-sm truncate">{n.title}</p>
                    </div>
                    <p className="text-xs font-bold text-black/75 mt-1 leading-relaxed">
                      {n.body}
                    </p>
                    <p className="text-[11px] font-bold text-black/60 mt-1.5">
                      {formatDateTime(n.created_at)} ·{" "}
                      {n.read ? "read" : "unread"}
                    </p>
                  </div>
                  {!n.read && (
                    <form action={markNotificationReadAction} className="shrink-0">
                      <input type="hidden" name="id" value={n.id} />
                      <Button type="submit" variant="secondary" size="sm">
                        Mark as read
                      </Button>
                    </form>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <p className="flex items-center gap-1.5 text-[11px] font-bold text-black/50">
        <Inbox className="w-3.5 h-3.5" aria-hidden="true" />
        Newest notifications first; unread ones stay on top.
      </p>
    </div>
  );
}
