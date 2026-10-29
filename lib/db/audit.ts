// Utilix — audit log database helpers (server-only)
// Owner: A
import "server-only";

import { auditLogCol } from "./collections";
import { docToEntity, nowISO, nowTimestamp } from "./converters";
import type { AuditAction, AuditLogEntry } from "@/lib/types";
import type { Transaction, WriteBatch } from "firebase-admin/firestore";

export interface WriteAuditInput {
  actor_id: string;
  action: AuditAction;
  entity_type: string;
  entity_id: string;
  rule_version?: string;
  scores?: Record<string, unknown> | null;
  reason?: string | null;
}

/**
 * Writes an immutable audit entry, automatically stamping rule_version and created_at.
 * Supports running inside an active Transaction, WriteBatch, or standalone.
 */
export async function writeAudit(
  writer: Transaction | WriteBatch | undefined,
  entry: WriteAuditInput
): Promise<AuditLogEntry> {
  const ref = auditLogCol().doc();
  const nowTs = nowTimestamp();
  const now = nowISO();
  const ruleVersion = entry.rule_version ?? "v1";

  const firestoreData = {
    actor_id: entry.actor_id,
    action: entry.action,
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    rule_version: ruleVersion,
    scores: entry.scores ?? null,
    reason: entry.reason ?? null,
    created_at: nowTs,
  };

  if (writer) {
    // Explicit branch to satisfy TypeScript union overload resolution
    if ("get" in writer) {
      (writer as Transaction).set(ref, firestoreData);
    } else {
      (writer as WriteBatch).set(ref, firestoreData);
    }
  } else {
    await ref.set(firestoreData);
  }

  return {
    id: ref.id,
    actor_id: entry.actor_id,
    action: entry.action,
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    rule_version: ruleVersion,
    scores: entry.scores ?? null,
    reason: entry.reason ?? null,
    created_at: now,
  };
}

/** Get audit entries for a specific entity, newest first. */
export async function getAuditLog(
  entityType: string,
  entityId?: string
): Promise<AuditLogEntry[]> {
  let query = auditLogCol().where("entity_type", "==", entityType);
  if (entityId) {
    query = query.where("entity_id", "==", entityId);
  }

  const snap = await query.get();
  const entries = snap.docs
    .map((d) => docToEntity<AuditLogEntry>(d.id, d.data()))
    .filter((e): e is AuditLogEntry => e !== null);

  entries.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return entries;
}
