// Utilix — audit log database helpers (server-only)
// Owner: A
import "server-only";

import { auditLogCol } from "./collections";
import { docToEntity, nowISO, nowTimestamp } from "./converters";
import type { AuditAction, AuditLogEntry } from "@/lib/types";
import {
  matchesAuditFilter,
  type AuditFilterCriteria,
} from "@/lib/audit-filters";
import type { Transaction, WriteBatch, Query, DocumentData } from "firebase-admin/firestore";

export type { AuditFilterCriteria };

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

/**
 * Query audit log with multi-field filters and cursor-based pagination.
 * Always returns newest entries first.
 */
export async function queryAuditLogs(
  criteria: AuditFilterCriteria = {},
  pageSize: number = 25,
  cursor?: string
): Promise<{
  entries: AuditLogEntry[];
  nextCursor: string | null;
  prevCursor: string | null;
  totalMatching: number;
}> {
  // Query Firestore collection
  let query: Query<DocumentData> = auditLogCol();

  if (criteria.entity_id) {
    query = query.where("entity_id", "==", criteria.entity_id);
  } else if (criteria.entity_type) {
    query = query.where("entity_type", "==", criteria.entity_type);
  } else if (criteria.action) {
    query = query.where("action", "==", criteria.action);
  }

  const snap = await query.get();
  const rawEntries = snap.docs
    .map((d) => docToEntity<AuditLogEntry>(d.id, d.data()))
    .filter((e): e is AuditLogEntry => e !== null);

  // Sort newest first
  rawEntries.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Apply full criteria filter
  const filtered = rawEntries.filter((entry) =>
    matchesAuditFilter(entry, criteria)
  );

  // Apply cursor pagination
  let startIndex = 0;
  if (cursor) {
    const foundIdx = filtered.findIndex((e) => e.id === cursor);
    if (foundIdx >= 0) {
      startIndex = foundIdx + 1;
    }
  }

  const limit = criteria.limit || pageSize;
  const pageEntries = filtered.slice(startIndex, startIndex + limit);

  const nextCursor =
    pageEntries.length === limit && startIndex + limit < filtered.length
      ? pageEntries[pageEntries.length - 1].id
      : null;

  const prevCursor =
    startIndex > 0 && filtered[Math.max(0, startIndex - limit - 1)]
      ? filtered[Math.max(0, startIndex - limit - 1)].id
      : null;

  return {
    entries: pageEntries,
    nextCursor,
    prevCursor,
    totalMatching: filtered.length,
  };
}
