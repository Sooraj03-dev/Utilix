import { describe, it, expect } from "vitest";
import {
  windowsOverlap,
  windowsConflict,
  canCoordinatorManageResource,
  isAlreadyCertified,
  getDayOfWeekFromDate,
} from "../../lib/db/coordinator-helpers";

describe("Coordinator pure helpers — Availability window overlap & conflicts", () => {
  it("detects overlapping intervals correctly", () => {
    // Overlapping
    expect(windowsOverlap({ start: "09:00", end: "12:00" }, { start: "10:00", end: "14:00" })).toBe(true);
    expect(windowsOverlap({ start: "10:00", end: "14:00" }, { start: "09:00", end: "12:00" })).toBe(true);

    // Completely contained
    expect(windowsOverlap({ start: "08:00", end: "18:00" }, { start: "10:00", end: "12:00" })).toBe(true);

    // Identical
    expect(windowsOverlap({ start: "09:00", end: "12:00" }, { start: "09:00", end: "12:00" })).toBe(true);
  });

  it("permits abutting / back-to-back intervals without flagging an overlap", () => {
    // 09:00 - 12:00 followed immediately by 12:00 - 15:00
    expect(windowsOverlap({ start: "09:00", end: "12:00" }, { start: "12:00", end: "15:00" })).toBe(false);
    expect(windowsOverlap({ start: "12:00", end: "15:00" }, { start: "09:00", end: "12:00" })).toBe(false);
  });

  it("identifies disjoint non-overlapping intervals", () => {
    expect(windowsOverlap({ start: "08:00", end: "10:00" }, { start: "14:00", end: "16:00" })).toBe(false);
  });

  it("calculates correct day of week for dates", () => {
    // 2026-11-02 is Monday (weekday 1)
    expect(getDayOfWeekFromDate("2026-11-02")).toBe(1);
    // 2026-11-01 is Sunday (weekday 0)
    expect(getDayOfWeekFromDate("2026-11-01")).toBe(0);
    // 2026-11-07 is Saturday (weekday 6)
    expect(getDayOfWeekFromDate("2026-11-07")).toBe(6);
  });

  it("checks window conflicts for recurring weekdays", () => {
    const win1 = { weekday: 1 as const, date: null, start: "09:00", end: "13:00" };
    const win2 = { weekday: 1 as const, date: null, start: "11:00", end: "15:00" };
    const winOtherDay = { weekday: 2 as const, date: null, start: "11:00", end: "15:00" };
    const winNonOverlap = { weekday: 1 as const, date: null, start: "13:00", end: "17:00" };

    expect(windowsConflict(win1, win2)).toBe(true);
    expect(windowsConflict(win1, winOtherDay)).toBe(false);
    expect(windowsConflict(win1, winNonOverlap)).toBe(false);
  });

  it("checks window conflicts across recurring and date-specific windows", () => {
    // Recurring Monday (1)
    const recurringMon = { weekday: 1 as const, date: null, start: "09:00", end: "12:00" };
    // Date 2026-11-02 is a Monday
    const dateMonOverlap = { weekday: null, date: "2026-11-02", start: "10:00", end: "14:00" };
    const dateMonNonOverlap = { weekday: null, date: "2026-11-02", start: "14:00", end: "18:00" };
    // Date 2026-11-03 is Tuesday
    const dateTue = { weekday: null, date: "2026-11-03", start: "10:00", end: "14:00" };

    expect(windowsConflict(recurringMon, dateMonOverlap)).toBe(true);
    expect(windowsConflict(recurringMon, dateMonNonOverlap)).toBe(false);
    expect(windowsConflict(recurringMon, dateTue)).toBe(false);
  });

  it("checks window conflicts between two date-specific windows", () => {
    const d1 = { weekday: null, date: "2026-11-05", start: "10:00", end: "14:00" };
    const d2SameDay = { weekday: null, date: "2026-11-05", start: "12:00", end: "16:00" };
    const d3DiffDay = { weekday: null, date: "2026-11-06", start: "12:00", end: "16:00" };

    expect(windowsConflict(d1, d2SameDay)).toBe(true);
    expect(windowsConflict(d1, d3DiffDay)).toBe(false);
  });
});

describe("Coordinator pure helpers — Resource ownership & permissions", () => {
  const resourceA = { id: "res-01", coordinator_id: "coord-user-1" };
  const resourceB = { id: "res-02", coordinator_id: "coord-user-2" };

  it("grants access to the assigned coordinator", () => {
    const user = { uid: "coord-user-1", role: "coordinator" as const };
    expect(canCoordinatorManageResource(resourceA, user)).toBe(true);
  });

  it("denies access to a different coordinator", () => {
    const user = { uid: "coord-user-1", role: "coordinator" as const };
    expect(canCoordinatorManageResource(resourceB, user)).toBe(false);
  });

  it("grants access if resource is in assignedResourceIds", () => {
    const user = {
      uid: "coord-user-1",
      role: "coordinator" as const,
      assignedResourceIds: ["res-02"],
    };
    expect(canCoordinatorManageResource(resourceB, user)).toBe(true);
  });

  it("always grants access to admins", () => {
    const admin = { uid: "admin-1", role: "admin" as const };
    expect(canCoordinatorManageResource(resourceA, admin)).toBe(true);
    expect(canCoordinatorManageResource(resourceB, admin)).toBe(true);
  });

  it("always denies access to students", () => {
    const student = { uid: "student-1", role: "student" as const };
    expect(canCoordinatorManageResource(resourceA, student)).toBe(false);
  });

  it("handles null/undefined gracefully", () => {
    expect(canCoordinatorManageResource(null, { uid: "u", role: "admin" })).toBe(false);
    expect(canCoordinatorManageResource(resourceA, null)).toBe(false);
  });
});

describe("Coordinator pure helpers — Certification idempotency check", () => {
  it("returns true for existing active certification", () => {
    expect(isAlreadyCertified({ revoked_at: null })).toBe(true);
    expect(isAlreadyCertified({})).toBe(true);
  });

  it("returns false for revoked certification", () => {
    expect(isAlreadyCertified({ revoked_at: "2026-10-25T10:00:00Z" })).toBe(false);
  });

  it("returns false for nonexistent certification", () => {
    expect(isAlreadyCertified(null)).toBe(false);
    expect(isAlreadyCertified(undefined)).toBe(false);
  });
});

