// Utilix — Timestamp ↔ ISO-string converters (server-only)
// Owner: A
import "server-only";

import { Timestamp } from "firebase-admin/firestore";

/**
 * Flexible input type representing any timestamp-like format that might be
 * retrieved from Firestore, cache layers, serialized JSON, or client SDKs.
 */
export type TimestampLike =
  | Timestamp
  | Date
  | string
  | number
  | { seconds: number; nanoseconds?: number }
  | { _seconds: number; _nanoseconds?: number }
  | { toDate: () => Date }
  | null
  | undefined;

/**
 * Safely converts any Timestamp-like value (Firestore Timestamp, Date, ISO string,
 * epoch milliseconds/seconds, or map with seconds/nanoseconds) to an ISO 8601 string.
 * Returns null if the value is null, undefined, or empty.
 */
export function toISO(ts: TimestampLike): string | null {
  if (ts === null || ts === undefined || ts === "") {
    return null;
  }

  // 1. Firestore Timestamp (Admin SDK, Client SDK, or any object with a toDate() method)
  if (typeof (ts as { toDate?: unknown }).toDate === "function") {
    try {
      const d = (ts as { toDate: () => Date }).toDate();
      if (d instanceof Date && !Number.isNaN(d.getTime())) {
        return d.toISOString();
      }
    } catch {
      // Fall through to other checks if toDate() throws
    }
  }

  // 2. JavaScript Date instance
  if (ts instanceof Date) {
    return Number.isNaN(ts.getTime()) ? null : ts.toISOString();
  }

  // 3. ISO 8601 string or date string (already stringified)
  if (typeof ts === "string") {
    const trimmed = ts.trim();
    if (!trimmed) return null;
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  // 4. Plain object with seconds / nanoseconds or _seconds / _nanoseconds
  // (Common when Firestore Timestamps are serialized across JSON, cache, or RSC boundaries)
  if (typeof ts === "object") {
    const obj = ts as Record<string, unknown>;
    const seconds =
      typeof obj._seconds === "number"
        ? obj._seconds
        : typeof obj.seconds === "number"
        ? obj.seconds
        : null;
    const nanoseconds =
      typeof obj._nanoseconds === "number"
        ? obj._nanoseconds
        : typeof obj.nanoseconds === "number"
        ? obj.nanoseconds
        : 0;

    if (seconds !== null && Number.isFinite(seconds)) {
      const ms = seconds * 1000 + Math.floor(nanoseconds / 1e6);
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
  }

  // 5. Epoch number (milliseconds or seconds)
  if (typeof ts === "number") {
    if (Number.isNaN(ts) || !Number.isFinite(ts)) return null;
    // Values less than 1e11 (e.g. ~1.7e9 for year 2026) are Unix seconds; otherwise milliseconds
    const ms = Math.abs(ts) < 1e11 ? ts * 1000 : ts;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  return null;
}

/**
 * Convert a Firestore Timestamp (or date representation) to an ISO 8601 string.
 * Throws an Error if missing or invalid.
 */
export function toISORequired(ts: TimestampLike): string {
  if (ts === null || ts === undefined || ts === "") {
    throw new Error("Expected a Firestore Timestamp but got null/undefined");
  }
  const iso = toISO(ts);
  if (!iso) {
    throw new Error(`Expected a valid Firestore Timestamp but got null/undefined`);
  }
  return iso;
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
    if (
      value instanceof Timestamp ||
      (value && typeof (value as { toDate?: unknown }).toDate === "function") ||
      (value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        (("_seconds" in value && typeof (value as any)._seconds === "number") ||
          ("seconds" in value && typeof (value as any).seconds === "number")))
    ) {
      result[key] = toISO(value as TimestampLike);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}
