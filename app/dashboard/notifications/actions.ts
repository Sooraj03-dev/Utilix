// Utilix — notification Server Actions (server-side)
// Owner: A
"use server";

import { revalidatePath } from "next/cache";

import { requireSessionUser } from "@/lib/auth";
import {
  getNotificationById,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/db";

/** Form action: mark one notification as read ( ownership checked ). */
export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const user = await requireSessionUser();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const notification = await getNotificationById(id);
  if (!notification || notification.user_id !== user.uid) {
    return; // Not yours — silently ignore rather than leak existence.
  }

  await markNotificationRead(id, true);
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
}

/** Form action: mark every notification as read. */
export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await requireSessionUser();
  await markAllNotificationsRead(user.uid);
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
}
