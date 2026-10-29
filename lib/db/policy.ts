// Utilix — policy database helpers (server-only)
// Owner: A
import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { policiesCol } from "./collections";
import { nowTimestamp, toISO } from "./converters";
import { DEFAULT_POLICY, type Policy } from "@/lib/types";
import type { Timestamp } from "firebase-admin/firestore";

/**
 * Retrieves the currently active policy from Firestore.
 * Falls back to DEFAULT_POLICY if no active policy is found.
 */
export async function getActivePolicy(): Promise<Policy> {
  const snap = await policiesCol()
    .where("is_active", "==", true)
    .limit(1)
    .get();

  if (snap.empty) {
    return DEFAULT_POLICY;
  }

  const doc = snap.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    version: data.version ?? 0,
    is_active: true,
    monthly_credits: data.monthly_credits ?? DEFAULT_POLICY.monthly_credits,
    free_sessions_per_week:
      data.free_sessions_per_week ?? DEFAULT_POLICY.free_sessions_per_week,
    max_active_bookings:
      data.max_active_bookings ?? DEFAULT_POLICY.max_active_bookings,
    slot_minutes: data.slot_minutes ?? DEFAULT_POLICY.slot_minutes,
    cancel_refund_hours:
      data.cancel_refund_hours ?? DEFAULT_POLICY.cancel_refund_hours,
    weights: data.weights ?? DEFAULT_POLICY.weights,
    tiebreak_order: data.tiebreak_order ?? DEFAULT_POLICY.tiebreak_order,
    peak_definition: data.peak_definition ?? DEFAULT_POLICY.peak_definition,
    deadline_window_days:
      data.deadline_window_days ?? DEFAULT_POLICY.deadline_window_days,
    created_by: data.created_by ?? "system",
    created_at: toISO(data.created_at as Timestamp) ?? DEFAULT_POLICY.created_at,
  };
}

export type CreatePolicyInput = Partial<
  Omit<Policy, "id" | "version" | "is_active" | "created_by" | "created_at">
>;

/**
 * Creates a new policy version.
 * Inside a transaction: deactivates any existing active version and writes the new one as v${version}.
 */
export async function createPolicyVersion(
  partial: CreatePolicyInput,
  actorId: string
): Promise<Policy> {
  return await adminDb.runTransaction(async (tx) => {
    // Read phase: get all existing policies to find current active and max version
    const allSnap = await tx.get(policiesCol());
    let maxVersion = 0;
    const activeDocRefs = [];

    for (const doc of allSnap.docs) {
      const data = doc.data();
      const v = typeof data.version === "number" ? data.version : 0;
      if (v > maxVersion) maxVersion = v;
      if (data.is_active === true) {
        activeDocRefs.push(doc.ref);
      }
    }

    const newVersion = maxVersion + 1;
    const newDocId = `v${newVersion}`;
    const newRef = policiesCol().doc(newDocId);

    // Write phase: deactivate old active versions
    for (const ref of activeDocRefs) {
      tx.update(ref, { is_active: false });
    }

    const nowTs = nowTimestamp();
    const newPolicyData = {
      version: newVersion,
      is_active: true,
      monthly_credits: partial.monthly_credits ?? DEFAULT_POLICY.monthly_credits,
      free_sessions_per_week:
        partial.free_sessions_per_week ?? DEFAULT_POLICY.free_sessions_per_week,
      max_active_bookings:
        partial.max_active_bookings ?? DEFAULT_POLICY.max_active_bookings,
      slot_minutes: partial.slot_minutes ?? DEFAULT_POLICY.slot_minutes,
      cancel_refund_hours:
        partial.cancel_refund_hours ?? DEFAULT_POLICY.cancel_refund_hours,
      weights: partial.weights ?? DEFAULT_POLICY.weights,
      tiebreak_order: partial.tiebreak_order ?? DEFAULT_POLICY.tiebreak_order,
      peak_definition: partial.peak_definition ?? DEFAULT_POLICY.peak_definition,
      deadline_window_days:
        partial.deadline_window_days ?? DEFAULT_POLICY.deadline_window_days,
      created_by: actorId,
      created_at: nowTs,
    };

    tx.set(newRef, newPolicyData);

    return {
      id: newDocId,
      ...newPolicyData,
      created_at: nowTs.toDate().toISOString(),
    };
  });
}
