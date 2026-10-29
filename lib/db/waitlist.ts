// Utilix — waitlist database helpers (server-only)
// Owner: A
import "server-only";

import { waitlistCol } from "./collections";
import { docToEntity, nowISO, nowTimestamp } from "./converters";
import type { WaitlistEntry } from "@/lib/types";
import type { Transaction } from "firebase-admin/firestore";

/** Get a single waitlist entry by ID, or null. */
export async function getWaitlistEntryById(
  id: string
): Promise<WaitlistEntry | null> {
  const snap = await waitlistCol().doc(id).get();
  if (!snap.exists) return null;
  return docToEntity<WaitlistEntry>(snap.id, snap.data());
}

/** List waitlist entries for a resource slot, ordered by position ascending. */
export async function listWaitlistForSlot(
  resourceId: string,
  slotId: string
): Promise<WaitlistEntry[]> {
  const snap = await waitlistCol()
    .where("resource_id", "==", resourceId)
    .where("slot_id", "==", slotId)
    .orderBy("position", "asc")
    .get();

  return snap.docs
    .map((d) => docToEntity<WaitlistEntry>(d.id, d.data()))
    .filter((w): w is WaitlistEntry => w !== null);
}

/** List all waitlist entries for a specific user. */
export async function listWaitlistByUser(
  userId: string
): Promise<WaitlistEntry[]> {
  const snap = await waitlistCol()
    .where("user_id", "==", userId)
    .get();

  return snap.docs
    .map((d) => docToEntity<WaitlistEntry>(d.id, d.data()))
    .filter((w): w is WaitlistEntry => w !== null);
}

export type CreateWaitlistInput = Omit<WaitlistEntry, "id" | "created_at">;

/** Create a new waitlist entry. */
export async function createWaitlistEntry(
  data: CreateWaitlistInput,
  customId?: string,
  tx?: Transaction
): Promise<WaitlistEntry> {
  const ref = customId ? waitlistCol().doc(customId) : waitlistCol().doc();
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

/** Delete a waitlist entry. */
export async function deleteWaitlistEntry(
  id: string,
  tx?: Transaction
): Promise<void> {
  const ref = waitlistCol().doc(id);
  if (tx) {
    tx.delete(ref);
  } else {
    await ref.delete();
  }
}
