// Utilix — training certifications database helpers (server-only)
// Owner: A
import "server-only";

import { trainingCertsCol } from "./collections";
import { docToEntity, nowISO, nowTimestamp, toTimestamp } from "./converters";
import type { TrainingCertification } from "@/lib/types";

/**
 * Builds the canonical document ID for a training certification.
 * Doc ID = `${userId}_${trainingType}`
 */
export function toCertificationDocId(userId: string, trainingType: string): string {
  return `${userId}_${trainingType}`;
}

/** Get a specific training certification for a user, or null if none exists. */
export async function getTrainingCertification(
  userId: string,
  trainingType: string
): Promise<TrainingCertification | null> {
  const docId = toCertificationDocId(userId, trainingType);
  const snap = await trainingCertsCol().doc(docId).get();
  if (!snap.exists) return null;
  return docToEntity<TrainingCertification>(snap.id, snap.data());
}

/** Check if a user holds a valid certification for the given training type. */
export async function hasTraining(
  userId: string,
  trainingType: string
): Promise<boolean> {
  const cert = await getTrainingCertification(userId, trainingType);
  if (!cert) return false;
  if (cert.revoked_at) return false;
  return true;
}

/** List all certifications held by a user. */
export async function listTrainingCertificationsByUser(
  userId: string
): Promise<TrainingCertification[]> {
  const snap = await trainingCertsCol()
    .where("user_id", "==", userId)
    .get();

  return snap.docs
    .map((d) => docToEntity<TrainingCertification>(d.id, d.data()))
    .filter((c): c is TrainingCertification => c !== null);
}

/** List all certifications across the platform (for admin/coordinators). */
export async function listAllTrainingCertifications(): Promise<TrainingCertification[]> {
  const snap = await trainingCertsCol().get();
  return snap.docs
    .map((d) => docToEntity<TrainingCertification>(d.id, d.data()))
    .filter((c): c is TrainingCertification => c !== null);
}

export type CreateTrainingCertificationInput = Omit<
  TrainingCertification,
  "id" | "certified_at"
> & {
  certified_at?: string;
};

/** Grants / creates a training certification record. */
export async function createTrainingCertification(
  data: CreateTrainingCertificationInput
): Promise<TrainingCertification> {
  const docId = toCertificationDocId(data.user_id, data.training_type);
  const ref = trainingCertsCol().doc(docId);
  const nowTs = data.certified_at ? toTimestamp(data.certified_at) : nowTimestamp();
  const certifiedAt = data.certified_at ?? nowISO();

  const firestoreData = {
    user_id: data.user_id,
    training_type: data.training_type,
    certified_by: data.certified_by,
    certified_at: nowTs,
    revoked_at: null,
  };

  await ref.set(firestoreData);

  return {
    id: docId,
    user_id: data.user_id,
    training_type: data.training_type,
    certified_by: data.certified_by,
    certified_at: certifiedAt,
    revoked_at: null,
  };
}

/** Revoke a training certification by stamping revoked_at. */
export async function revokeTrainingCertification(
  userId: string,
  trainingType: string
): Promise<void> {
  const docId = toCertificationDocId(userId, trainingType);
  const ref = trainingCertsCol().doc(docId);
  const nowTs = nowTimestamp();
  await ref.update({
    revoked_at: nowTs,
  });
}
