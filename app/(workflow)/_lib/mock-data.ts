/* ═══════════════════════════════════════════════════════════════════════════
 * Mock Data — Owner B
 *
 * Uses Owner A's typed mock fixtures from @/lib/mocks/data, avoiding
 * duplicate mock databases while preserving workflow-specific slot generators.
 * ═══════════════════════════════════════════════════════════════════════════ */

import {
  MOCK_RESOURCES as FOUNDATION_RESOURCES,
  MOCK_BOOKINGS as FOUNDATION_BOOKINGS,
} from "@/lib/mocks/data";
import type { Resource, Booking, TimeSlot, AlternativeResource } from "./types";

export const MOCK_RESOURCES: Resource[] = FOUNDATION_RESOURCES;
export const MOCK_BOOKINGS: Booking[] = FOUNDATION_BOOKINGS;

// ─── Time Slots Generator ────────────────────────────────────────────────

export function generateMockSlots(
  resourceId: string,
  date: string,
): TimeSlot[] {
  const baseHours = [
    { start: "08:00", end: "09:00" },
    { start: "09:00", end: "10:00" },
    { start: "10:00", end: "11:00" },
    { start: "11:00", end: "12:00" },
    { start: "13:00", end: "14:00" },
    { start: "14:00", end: "15:00" },
    { start: "15:00", end: "16:00" },
    { start: "16:00", end: "17:00" },
  ];

  return baseHours.map((slot, i) => {
    const slotId = `${resourceId}_${date.replace(/-/g, "")}T${slot.start.replace(":", "")}`;
    return {
      id: slotId,
      resourceId,
      date,
      startTime: slot.start,
      endTime: slot.end,
      isAvailable: i !== 1 && i !== 4,
    };
  });
}

// ─── Alternative Resources (for AI recommendations) ──────────────────────

export function getMockAlternatives(
  resourceId: string,
): AlternativeResource[] {
  const resource = MOCK_RESOURCES.find((r) => r.id === resourceId);
  if (!resource) return [];

  const alternatives = MOCK_RESOURCES.filter(
    (r) => r.id !== resourceId && r.status === "available",
  );

  return alternatives.slice(0, 3).map((alt) => ({
    slotId: `${alt.id}_20261104T1000`,
    resourceId: alt.id,
    resourceName: alt.name,
    date: "2026-11-04",
    startTime: "10:00",
    endTime: "11:00",
    reason: `${alt.name} at ${alt.location} is available at this time`,
  }));
}
