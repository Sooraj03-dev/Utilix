// Utilix — issue reporting database helpers (server-only)
import "server-only";

import { issueReportsCol } from "./collections";
import { docToEntity, nowISO, nowTimestamp } from "./converters";
import type { IssueCategory, IssueReport, IssueStatus } from "@/lib/types";
import type { Transaction } from "firebase-admin/firestore";

export interface CreateIssueInput {
  bookingId?: string | null;
  resourceId: string;
  userId: string;
  category: IssueCategory;
  notes: string;
  photoUrl?: string | null;
}

/** Get a single issue report by ID. */
export async function getIssueById(id: string): Promise<IssueReport | null> {
  const snap = await issueReportsCol().doc(id).get();
  if (!snap.exists) return null;
  return docToEntity<IssueReport>(snap.id, snap.data());
}

/** List issue reports with optional filters. */
export async function listIssues(filter: {
  resourceId?: string;
  userId?: string;
  status?: IssueStatus;
} = {}): Promise<IssueReport[]> {
  let query = issueReportsCol().orderBy("created_at", "desc");

  if (filter.resourceId) {
    query = query.where("resource_id", "==", filter.resourceId);
  }
  if (filter.userId) {
    query = query.where("user_id", "==", filter.userId);
  }
  if (filter.status) {
    query = query.where("status", "==", filter.status);
  }

  const snap = await query.get();
  return snap.docs
    .map((d) => docToEntity<IssueReport>(d.id, d.data()))
    .filter((i): i is IssueReport => i !== null);
}

/** Create a new issue report. */
export async function createIssue(
  input: CreateIssueInput,
  tx?: Transaction,
): Promise<IssueReport> {
  const ref = issueReportsCol().doc();
  const nowTs = nowTimestamp();
  const now = nowISO();

  const firestoreData = {
    booking_id: input.bookingId ?? "",
    resource_id: input.resourceId,
    user_id: input.userId,
    category: input.category,
    notes: input.notes,
    photo_url: input.photoUrl ?? null,
    status: "open" as IssueStatus,
    created_at: nowTs,
  };

  if (tx) {
    tx.set(ref, firestoreData);
  } else {
    await ref.set(firestoreData);
  }

  return {
    id: ref.id,
    booking_id: input.bookingId ?? "",
    resource_id: input.resourceId,
    user_id: input.userId,
    category: input.category,
    notes: input.notes,
    photo_url: input.photoUrl ?? null,
    status: "open",
    created_at: now,
  };
}

/** Update issue status (investigating, resolved). */
export async function updateIssueStatus(
  id: string,
  status: IssueStatus,
  tx?: Transaction,
): Promise<void> {
  const ref = issueReportsCol().doc(id);
  if (tx) {
    tx.update(ref, { status });
  } else {
    await ref.update({ status });
  }
}
