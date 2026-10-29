import { describe, it, expect } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import { toISO, toISORequired, docToEntity } from "../../lib/db/converters";

describe("converters: toISO and toISORequired", () => {
  it("converts a Firestore Timestamp instance with toDate()", () => {
    const ts = Timestamp.fromDate(new Date("2026-10-30T10:00:00.000Z"));
    expect(toISO(ts)).toBe("2026-10-30T10:00:00.000Z");
    expect(toISORequired(ts)).toBe("2026-10-30T10:00:00.000Z");
  });

  it("converts a generic object with a toDate() method", () => {
    const customTs = {
      toDate: () => new Date("2026-10-30T12:30:00.000Z"),
    };
    expect(toISO(customTs)).toBe("2026-10-30T12:30:00.000Z");
    expect(toISORequired(customTs)).toBe("2026-10-30T12:30:00.000Z");
  });

  it("converts a JavaScript Date instance", () => {
    const date = new Date("2026-10-30T08:15:00.000Z");
    expect(toISO(date)).toBe("2026-10-30T08:15:00.000Z");
    expect(toISORequired(date)).toBe("2026-10-30T08:15:00.000Z");
  });

  it("converts a plain object with _seconds and _nanoseconds", () => {
    const plainSerialized = {
      _seconds: 1793354400,
      _nanoseconds: 500000000,
    };
    const expected = new Date(1793354400 * 1000 + 500).toISOString();
    expect(toISO(plainSerialized)).toBe(expected);
    expect(toISORequired(plainSerialized)).toBe(expected);
  });

  it("converts a plain object with seconds and nanoseconds", () => {
    const protoObj = {
      seconds: 1793354400,
      nanoseconds: 0,
    };
    const expected = new Date(1793354400 * 1000).toISOString();
    expect(toISO(protoObj)).toBe(expected);
    expect(toISORequired(protoObj)).toBe(expected);
  });

  it("converts an ISO 8601 string cleanly", () => {
    const isoString = "2026-10-01T08:00:00.000Z";
    expect(toISO(isoString)).toBe("2026-10-01T08:00:00.000Z");
    expect(toISORequired(isoString)).toBe("2026-10-01T08:00:00.000Z");
  });

  it("converts epoch numbers (seconds and milliseconds)", () => {
    const nowMs = 1793354400000;
    const nowSec = 1793354400;
    const expected = new Date(nowMs).toISOString();

    expect(toISO(nowMs)).toBe(expected);
    expect(toISO(nowSec)).toBe(expected);
    expect(toISORequired(nowMs)).toBe(expected);
    expect(toISORequired(nowSec)).toBe(expected);
  });

  it("handles null and undefined safely", () => {
    expect(toISO(null)).toBeNull();
    expect(toISO(undefined)).toBeNull();
    expect(toISO("")).toBeNull();

    expect(() => toISORequired(null)).toThrow("Expected a Firestore Timestamp but got null/undefined");
    expect(() => toISORequired(undefined)).toThrow("Expected a Firestore Timestamp but got null/undefined");
    expect(() => toISORequired("")).toThrow("Expected a Firestore Timestamp but got null/undefined");
  });

  it("handles invalid date strings or NaN numbers safely", () => {
    expect(toISO("invalid-date-string")).toBeNull();
    expect(toISO(NaN)).toBeNull();
    expect(() => toISORequired("invalid-date-string")).toThrow();
  });
});

describe("converters: docToEntity", () => {
  it("converts Timestamps and serialized timestamp objects into ISO strings", () => {
    const docData = {
      name: "3D Printer",
      created_at: Timestamp.fromDate(new Date("2026-08-15T09:00:00.000Z")),
      updated_at: { _seconds: 1793354400, _nanoseconds: 0 },
      iso_field: "2026-10-01T00:00:00.000Z",
      status: "available",
      count: 4,
    };

    const entity = docToEntity<{
      id: string;
      name: string;
      created_at: string;
      updated_at: string;
      iso_field: string;
      status: string;
      count: number;
    }>("doc_1", docData);

    expect(entity).not.toBeNull();
    expect(entity?.id).toBe("doc_1");
    expect(entity?.name).toBe("3D Printer");
    expect(entity?.created_at).toBe("2026-08-15T09:00:00.000Z");
    expect(entity?.updated_at).toBe(new Date(1793354400 * 1000).toISOString());
    expect(entity?.iso_field).toBe("2026-10-01T00:00:00.000Z");
    expect(entity?.status).toBe("available");
    expect(entity?.count).toBe(4);
  });
});

