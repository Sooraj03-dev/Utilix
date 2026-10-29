// Utilix — Timestamp ↔ ISO-string converters (server-only)
// Owner: A
import "server-only";

import { Timestamp } from "firebase-admin/firestore";

/** Convert a Firestore Timestamp (or null/undefined) to an ISO 8601 string (or null). */
export function toISO(ts: Timestamp | null | undefined): string | null {
  if (!ts) return null;
  return ts.toDate().toISOString();
}

/** Convert a Firestore Timestamp to an ISO 8601 string. Throws if missing. */
export function toISORequired(ts: Timestamp | null | undefined): string {
  if (!ts) throw new Error("Expected a Firestore Timestamp but got null/undefined");
  return ts.toDate().toISOString();
}

/** Convert an ISO 8601 string (or null/undefined) to a Firestore Timestamp (or null). */
export function toTimestamp(iso: string | null | undefined): Timestamp | null {
  if (!iso) return null;
  return Timestamp.fromDate(new Date(iso));
}

/** Convert an ISO 8601 string to a Firestore Timestamp. Throws if missing. */
export function toTimestampRequired(iso: string | null | undefined): Timestamp {
  if (!iso) throw new Error("Expected an ISO string but got null/undefined");
  return Timestamp.fromDate(new Date(iso));
}

/** Returns the current moment as a Firestore Timestamp. */
export function nowTimestamp(): Timestamp {
  return Timestamp.now();
}

/** Returns the current moment as an ISO 8601 string. */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Transforms a Firestore document snapshot data object into a typed entity,
 * automatically converting all Firestore Timestamp fields into ISO 8601 strings.
 */
export function docToEntity<T>(id: string, data: Record<string, unknown> | undefined): T | null {
  if (!data) return null;
  const result: Record<string, unknown> = { id };
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Timestamp) {
      result[key] = value.toDate().toISOString();
    } else {
      result[key] = value;
    }
  }
  return result as T;
}
