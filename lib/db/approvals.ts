// Utilix — approval records database helpers (server-only)
import "server-only";

import { approvalsCol } from "./collections";
import { docToEntity, nowISO, nowTimestamp } from "./converters";
import type { Approval, ApprovalDecision } from "@/lib/types";
import type { Transaction } from "firebase-admin/firestore";

export interface RecordApprovalInput {
  bookingId: string;
  decidedBy: string;
  decision: ApprovalDecision;
  note?: string | null;
}

/** Get approval record for a booking, or null. */
export async function getApprovalByBookingId(bookingId: string): Promise<Approval | null> {
  const snap = await approvalsCol().where("booking_id", "==", bookingId).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return docToEntity<Approval>(doc.id, doc.data());
}

/** Record a new approval/rejection decision. */
export async function recordApprovalDecision(
  input: RecordApprovalInput,
  tx?: Transaction,
): Promise<Approval> {
  const ref = approvalsCol().doc();
  const nowTs = nowTimestamp();
  const now = nowISO();

  const firestoreData = {
    booking_id: input.bookingId,
    requested_at: nowTs,
    decided_by: input.decidedBy,
    decision: input.decision,
    note: input.note ?? null,
    decided_at: nowTs,
  };

  if (tx) {
    tx.set(ref, firestoreData);
  } else {
    await ref.set(firestoreData);
  }

  return {
    id: ref.id,
    booking_id: input.bookingId,
    requested_at: now,
    decided_by: input.decidedBy,
    decision: input.decision,
    note: input.note ?? null,
    decided_at: now,
  };
}
