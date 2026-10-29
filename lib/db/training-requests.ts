// Utilix — training request database helpers (server-only)
// Owner: A
// Reads come from getActivePolicy/enums; writes always write an audit entry.
import "server-only";

import { z } from "zod";

import { adminDb } from "@/lib/firebase/admin";
import { writeAudit } from "./audit";
import { trainingRequestsCol, resourcesCol } from "./collections";
import { docToEntity, nowTimestamp } from "./converters";
import { createNotification } from "./notifications";
import type { AuditAction, TrainingRequest } from "@/lib/types";

export const trainingRequestInputSchema = z.object({
  user_id: z.string().min(1, "A signed-in user is required."),
  training_type: z.string().min(1, "A training type is required."),
});

export class DuplicateTrainingRequestError extends Error {
  readonly code = "DUPLICATE_TRAINING_REQUEST" as const;
  constructor(trainingType: string, userId: string) {
    super(
      `A pending training request for "${trainingType}" already exists for user "${userId}".`
    );
    this.name = "DuplicateTrainingRequestError";
  }
}

/** Pure duplicate rule, unit-tested outside Firestore. */
export function isDuplicatePendingRequest(
  existing: TrainingRequest | null
): boolean {
  return existing?.status === "pending";
}

/** Newest first for a user. */
export async function listTrainingRequestsByUser(
  userId: string
): Promise<TrainingRequest[]> {
  const snap = await trainingRequestsCol()
    .where("user_id", "==", userId)
    .orderBy("created_at", "desc")
    .get();

  return snap.docs
    .map((d) => docToEntity<TrainingRequest>(d.id, d.data()))
    .filter((r): r is TrainingRequest => r !== null);
}

/** Find a pending request for (user, training type), or null. */
export async function getPendingTrainingRequest(
  userId: string,
  trainingType: string
): Promise<TrainingRequest | null> {
  const snap = await trainingRequestsCol()
    .where("user_id", "==", userId)
    .where("training_type", "==", trainingType)
    .where("status", "==", "pending")
    .limit(1)
    .get();

  if (snap.empty) return null;
  return docToEntity<TrainingRequest>(snap.docs[0].id, snap.docs[0].data());
}

/**
 * Creates a training_requests doc inside a transaction that blocks duplicate
 * pending requests, writes an audit entry, and notifies the coordinators of
 * the departments that own resources requiring that training.
 */
export async function createTrainingRequest(input: {
  user_id: string;
  training_type: string;
}): Promise<TrainingRequest> {
  const data = trainingRequestInputSchema.parse(input);

  // Read phase — pending dup check + coordinators to notify.
  const existing = await getPendingTrainingRequest(data.user_id, data.training_type);
  if (isDuplicatePendingRequest(existing)) {
    throw new DuplicateTrainingRequestError(data.training_type, data.user_id);
  }

  const ownersSnap = await resourcesCol()
    .where("requires_training", "==", data.training_type)
    .get();
  const coordinatorIds = [
    ...new Set(
      ownersSnap.docs
        .map((d) => (d.data()?.coordinator_id as string) ?? "")
        .filter(Boolean)
    ),
  ];

  const newRef = trainingRequestsCol().doc();
  const nowTs = nowTimestamp();

  await adminDb.runTransaction(async (tx) => {
    const pendingSnap = await tx
      .get(
        trainingRequestsCol()
          .where("user_id", "==", data.user_id)
          .where("training_type", "==", data.training_type)
          .where("status", "==", "pending")
          .limit(1)
      );
    if (!pendingSnap.empty) {
      throw new DuplicateTrainingRequestError(data.training_type, data.user_id);
    }

    tx.set(newRef, {
      user_id: data.user_id,
      training_type: data.training_type,
      status: "pending" as const,
      created_at: nowTs,
    });

    writeAudit(tx, {
      actor_id: data.user_id,
      action: "training_requested" as AuditAction,
      entity_type: "training_requests",
      entity_id: newRef.id,
      reason: `Student requested training: ${data.training_type}`,
    });
  });

  // Notifications are best-effort: the request itself is the source of truth.
  for (const coordinatorId of coordinatorIds) {
    try {
      await createNotification({
        user_id: coordinatorId,
        type: "approval_needed",
        title: "New training request",
        body: `${data.user_id} requested training: "${data.training_type}".`,
        link: `/dashboard/coordinator/training`,
        read: false,
      });
    } catch {
      // Coordinator notification is non-critical; skip failures.
    }
  }

  return {
    id: newRef.id,
    user_id: data.user_id,
    training_type: data.training_type,
    status: "pending",
    created_at: nowTs.toDate().toISOString(),
  };
}
