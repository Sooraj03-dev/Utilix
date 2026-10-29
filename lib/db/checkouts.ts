// Utilix — checkin and checkout database helpers (server-only)
import "server-only";

import { checkoutsCol } from "./collections";
import { docToEntity, nowISO, nowTimestamp } from "./converters";
import type { Checkout } from "@/lib/types";
import type { Transaction } from "firebase-admin/firestore";

export interface RecordCheckinInput {
  bookingId: string;
  checkedOutBy: string;
  conditionBefore?: string;
  notes?: string | null;
  photoUrl?: string | null;
}

export interface RecordReturnInput {
  conditionAfter?: string;
  notes?: string | null;
  overdue?: boolean;
}

/** Get checkout/return record by booking ID. */
export async function getCheckoutByBookingId(bookingId: string): Promise<Checkout | null> {
  const snap = await checkoutsCol().where("booking_id", "==", bookingId).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return docToEntity<Checkout>(doc.id, doc.data());
}

/** Record check-in (session start / resource handover). */
export async function recordCheckin(
  input: RecordCheckinInput,
  tx?: Transaction,
): Promise<Checkout> {
  const ref = checkoutsCol().doc();
  const nowTs = nowTimestamp();
  const now = nowISO();

  const firestoreData = {
    booking_id: input.bookingId,
    checked_out_by: input.checkedOutBy,
    checked_out_at: nowTs,
    condition_before: input.conditionBefore || "good",
    returned_at: null,
    condition_after: null,
    notes: input.notes ?? null,
    photo_url: input.photoUrl ?? null,
    overdue: false,
  };

  if (tx) {
    tx.set(ref, firestoreData);
  } else {
    await ref.set(firestoreData);
  }

  return {
    id: ref.id,
    booking_id: input.bookingId,
    checked_out_by: input.checkedOutBy,
    checked_out_at: now,
    condition_before: input.conditionBefore || "good",
    returned_at: null,
    condition_after: null,
    notes: input.notes ?? null,
    photo_url: input.photoUrl ?? null,
    overdue: false,
  };
}

/** Record return (session end / resource return and inspection). */
export async function recordReturn(
  bookingId: string,
  input: RecordReturnInput = {},
  tx?: Transaction,
): Promise<Checkout | null> {
  const snap = await checkoutsCol().where("booking_id", "==", bookingId).limit(1).get();
  if (snap.empty) return null;
  const docRef = snap.docs[0].ref;
  const nowTs = nowTimestamp();

  const updateData = {
    returned_at: nowTs,
    condition_after: input.conditionAfter || "good",
    notes: input.notes ?? null,
    overdue: input.overdue ?? false,
  };

  if (tx) {
    tx.update(docRef, updateData);
  } else {
    await docRef.update(updateData);
  }

  const updatedSnap = await docRef.get();
  return docToEntity<Checkout>(updatedSnap.id, updatedSnap.data());
}
