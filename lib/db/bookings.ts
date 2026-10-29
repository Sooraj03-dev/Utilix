// Utilix — booking database helpers (server-only)
// Owner: A
import "server-only";

import { bookingsCol } from "./collections";
import { docToEntity, nowISO, nowTimestamp, toTimestamp } from "./converters";
import type { Booking, BookingStatus } from "@/lib/types";
import type { Transaction } from "firebase-admin/firestore";

/** Get a single booking by ID, or null. */
export async function getBookingById(id: string): Promise<Booking | null> {
  const snap = await bookingsCol().doc(id).get();
  if (!snap.exists) return null;
  return docToEntity<Booking>(snap.id, snap.data());
}

/** Get a single booking by ID inside a transaction. */
export async function getBookingByIdTx(
  tx: Transaction,
  id: string
): Promise<Booking | null> {
  const snap = await tx.get(bookingsCol().doc(id));
  if (!snap.exists) return null;
  return docToEntity<Booking>(snap.id, snap.data());
}

/** List all bookings where the user is the primary requester. */
export async function listBookingsByUser(userId: string): Promise<Booking[]> {
  const snap = await bookingsCol()
    .where("user_id", "==", userId)
    .orderBy("slot_start", "desc")
    .get();

  return snap.docs
    .map((d) => docToEntity<Booking>(d.id, d.data()))
    .filter((b): b is Booking => b !== null);
}

/** List bookings for a resource, optionally within a time range. */
export async function listBookingsByResource(
  resourceId: string
): Promise<Booking[]> {
  const snap = await bookingsCol()
    .where("resource_id", "==", resourceId)
    .orderBy("slot_start", "asc")
    .get();

  return snap.docs
    .map((d) => docToEntity<Booking>(d.id, d.data()))
    .filter((b): b is Booking => b !== null);
}

export type CreateBookingInput = Omit<Booking, "id" | "created_at" | "updated_at">;

/** Create a new booking document. */
export async function createBooking(
  data: CreateBookingInput,
  customId?: string,
  tx?: Transaction
): Promise<Booking> {
  const ref = customId ? bookingsCol().doc(customId) : bookingsCol().doc();
  const now = nowISO();
  const nowTs = nowTimestamp();

  const firestoreData = {
    ...data,
    slot_start: toTimestamp(data.slot_start),
    slot_end: toTimestamp(data.slot_end),
    declared_deadline: toTimestamp(data.declared_deadline),
    created_at: nowTs,
    updated_at: nowTs,
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
    updated_at: now,
  };
}

/** Update booking status and optional fields. */
export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
  extra: Partial<Omit<Booking, "id" | "status" | "created_at">> = {},
  tx?: Transaction
): Promise<void> {
  const ref = bookingsCol().doc(id);
  const nowTs = nowTimestamp();
  const updates: Record<string, unknown> = {
    ...extra,
    status,
    updated_at: nowTs,
  };

  if ("slot_start" in extra) updates.slot_start = toTimestamp(extra.slot_start);
  if ("slot_end" in extra) updates.slot_end = toTimestamp(extra.slot_end);
  if ("declared_deadline" in extra)
    updates.declared_deadline = toTimestamp(extra.declared_deadline);

  if (tx) {
    tx.update(ref, updates);
  } else {
    await ref.update(updates);
  }
}

const COUNTED_SESSION_STATUSES: Set<BookingStatus> = new Set([
  "confirmed",
  "checked_out",
  "returned",
]);

/**
 * Counts bookings for a user in the last 30 days with status
 * confirmed, checked_out, or returned. Used for allocation scoring inputs.
 */
export async function countSessionsLast30Days(userId: string): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const snap = await bookingsCol()
    .where("user_id", "==", userId)
    .get();

  let count = 0;
  for (const doc of snap.docs) {
    const booking = docToEntity<Booking>(doc.id, doc.data());
    if (!booking) continue;
    if (
      COUNTED_SESSION_STATUSES.has(booking.status) &&
      booking.slot_start >= thirtyDaysAgo
    ) {
      count++;
    }
  }
  return count;
}

/**
 * Counts bookings for a user in the current calendar month (UTC) with status
 * confirmed, checked_out, or returned. Used for allocation scoring inputs.
 */
export async function countSessionsThisMonth(userId: string): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  ).toISOString();

  const snap = await bookingsCol()
    .where("user_id", "==", userId)
    .get();

  let count = 0;
  for (const doc of snap.docs) {
    const booking = docToEntity<Booking>(doc.id, doc.data());
    if (!booking) continue;
    if (
      COUNTED_SESSION_STATUSES.has(booking.status) &&
      booking.slot_start >= startOfMonth
    ) {
      count++;
    }
  }
  return count;
}
