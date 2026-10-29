// Utilix — slot ID helpers (server-only)
// Owner: A
import "server-only";

import type { Policy, PeakDefinition } from "@/lib/types";
import type { Weekday } from "@/lib/types";
import { slotLocksCol } from "./collections";
import { nowISO } from "./converters";
import { SlotTakenError } from "./errors";
import type { Transaction } from "firebase-admin/firestore";

/**
 * Generates a slot ID for a given resource and datetime.
 * Format: `${resourceId}_${YYYYMMDDTHHmm}` in UTC.
 */
export function toSlotId(resourceId: string, date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  return `${resourceId}_${y}${m}${d}T${h}${min}`;
}

/**
 * Returns all slot IDs covering the range [start, end) with the given slot length.
 * Both start and end are Date objects (UTC).
 */
export function slotIdsForRange(
  resourceId: string,
  start: Date,
  end: Date,
  slotMinutes: number
): string[] {
  const ids: string[] = [];
  const cursor = new Date(start.getTime());
  while (cursor.getTime() < end.getTime()) {
    ids.push(toSlotId(resourceId, cursor));
    cursor.setUTCMinutes(cursor.getUTCMinutes() + slotMinutes);
  }
  return ids;
}

/**
 * Returns true if the given datetime falls within a peak window defined by the policy.
 */
export function isPeakSlot(date: Date, policy: Policy): boolean {
  const weekday = date.getUTCDay() as Weekday;
  const hhmm =
    String(date.getUTCHours()).padStart(2, "0") +
    ":" +
    String(date.getUTCMinutes()).padStart(2, "0");

  return policy.peak_definition.some(
    (p: PeakDefinition) =>
      p.weekday === weekday && hhmm >= p.start && hhmm < p.end
  );
}

/**
 * Acquires slot locks inside a Firestore transaction.
 * Throws SlotTakenError if any slot is already locked.
 */
export async function acquireSlotLocks(
  tx: Transaction,
  bookingId: string,
  userId: string,
  slotIds: string[]
): Promise<void> {
  const col = slotLocksCol();
  const refs = slotIds.map((id) => col.doc(id));

  // Read phase: check all locks first (Firestore rule: reads before writes)
  const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
  for (let i = 0; i < snaps.length; i++) {
    if (snaps[i].exists) {
      throw new SlotTakenError(slotIds[i]);
    }
  }

  // Write phase: create all locks
  const now = nowISO();
  for (const ref of refs) {
    tx.create(ref, {
      booking_id: bookingId,
      user_id: userId,
      locked_at: now,
    });
  }
}

/**
 * Releases slot locks inside a Firestore transaction.
 */
export function releaseSlotLocks(tx: Transaction, slotIds: string[]): void {
  const col = slotLocksCol();
  for (const id of slotIds) {
    tx.delete(col.doc(id));
  }
}

