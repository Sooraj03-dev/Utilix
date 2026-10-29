// Utilix — notifications database helpers (server-only)
// Owner: A
import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { notificationsCol } from "./collections";
import { docToEntity, nowISO, nowTimestamp } from "./converters";
import type { Notification } from "@/lib/types";
import type { Transaction } from "firebase-admin/firestore";

/** Get a single notification by ID, or null. */
export async function getNotificationById(
  id: string
): Promise<Notification | null> {
  const snap = await notificationsCol().doc(id).get();
  if (!snap.exists) return null;
  return docToEntity<Notification>(snap.id, snap.data());
}

/** List notifications for a user, ordered by creation time descending. */
export async function listNotificationsByUser(
  userId: string,
  limitCount = 50
): Promise<Notification[]> {
  const snap = await notificationsCol()
    .where("user_id", "==", userId)
    .orderBy("created_at", "desc")
    .limit(limitCount)
    .get();

  return snap.docs
    .map((d) => docToEntity<Notification>(d.id, d.data()))
    .filter((n): n is Notification => n !== null);
}

export type CreateNotificationInput = Omit<Notification, "id" | "created_at">;

/** Create a new notification. */
export async function createNotification(
  data: CreateNotificationInput,
  customId?: string,
  tx?: Transaction
): Promise<Notification> {
  const ref = customId ? notificationsCol().doc(customId) : notificationsCol().doc();
  const nowTs = nowTimestamp();
  const now = nowISO();

  const firestoreData = {
    ...data,
    created_at: nowTs,
  };

  if (tx) {
    tx.set(ref, firestoreData);
  } else {
    await ref.set(firestoreData);
  }

  return {
    ...data,
    id: ref.id,
    created_at: now,
  };
}

/** Mark a notification as read or unread. */
export async function markNotificationRead(
  id: string,
  read = true
): Promise<void> {
  await notificationsCol().doc(id).update({ read });
}

/** Count unread notifications for a user. For C's notification bell. */
export async function getUnreadCount(userId: string): Promise<number> {
  const snap = await notificationsCol()
    .where("user_id", "==", userId)
    .where("read", "==", false)
    .count()
    .get();

  return snap.data().count;
}

/** Mark every unread notification of a user as read. Returns the count updated. */
export async function markAllNotificationsRead(userId: string): Promise<number> {
  const snap = await notificationsCol()
    .where("user_id", "==", userId)
    .where("read", "==", false)
    .get();

  if (snap.empty) return 0;

  const batch = adminDb.batch();
  for (const doc of snap.docs) {
    batch.update(doc.ref, { read: true });
  }
  await batch.commit();
  return snap.docs.length;
}
