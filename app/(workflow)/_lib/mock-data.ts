/* ═══════════════════════════════════════════════════════════════════════════
 * Mock Data — Owner B
 *
 * ⚠️  MOCK DATA — All resources and requests below are fabricated for local
 *     development. Nothing here is persisted to any database. When Firebase
 *     is configured (Owner A), swap the mock adapter for the real DB helpers.
 * ═══════════════════════════════════════════════════════════════════════════ */

import type {
  Resource,
  TimeSlot,
  BookingRequest,
  AlternativeResource,
} from "./types";

// ─── Campus Resources ────────────────────────────────────────────────────

export const MOCK_RESOURCES: Resource[] = [
  {
    id: "res-001",
    name: "Ultimaker S5 — 3D Printer",
    category: "equipment",
    department: "Engineering Lab",
    description:
      "Dual-extrusion FDM 3D printer. Supports PLA, ABS, Nylon, and composite materials. Build volume 330 × 240 × 300 mm.",
    location: "Building C, Room 204",
    capacity: 1,
    status: "available",
    tags: ["3D printer", "FDM", "prototyping"],
    requiresTraining: true,
    minDurationMinutes: 60,
    maxDurationMinutes: 480,
  },
  {
    id: "res-002",
    name: "Trotec Speedy 360 — Laser Cutter",
    category: "equipment",
    department: "Engineering Lab",
    description:
      "CO₂ laser cutter/engraver. Cuts acrylic, wood, leather, paper. Engraves metal, glass. Work area 813 × 508 mm.",
    location: "Building C, Room 206",
    capacity: 1,
    status: "available",
    tags: ["laser cutter", "engraving", "fabrication"],
    requiresTraining: true,
    minDurationMinutes: 30,
    maxDurationMinutes: 240,
  },
  {
    id: "res-003",
    name: "Oscilloscope Station (Keysight DSOX3104T)",
    category: "equipment",
    department: "Electronics Lab",
    description:
      "4-channel digital oscilloscope, 1 GHz bandwidth, with signal generator and logic analyzer.",
    location: "Building D, Room 110",
    capacity: 1,
    status: "available",
    tags: ["oscilloscope", "electronics", "testing"],
    requiresTraining: false,
    minDurationMinutes: 30,
    maxDurationMinutes: 180,
  },
  {
    id: "res-004",
    name: "Collaborative Studio A",
    category: "space",
    department: "Student Center",
    description:
      "Soundproofed collaborative space with whiteboard walls, 75\" display, video conferencing setup, and modular furniture.",
    location: "Library, 3rd Floor",
    capacity: 12,
    status: "available",
    tags: ["meeting room", "studio", "collaboration", "video conferencing"],
    requiresTraining: false,
    minDurationMinutes: 30,
    maxDurationMinutes: 240,
  },
  {
    id: "res-005",
    name: "Photography Studio",
    category: "space",
    department: "Media Arts",
    description:
      "Professional photography studio with lighting rigs, backdrops, tethered capture station, and props storage.",
    location: "Building B, Room 301",
    capacity: 6,
    status: "available",
    tags: ["photography", "studio", "lighting", "media"],
    requiresTraining: true,
    minDurationMinutes: 60,
    maxDurationMinutes: 360,
  },
  {
    id: "res-006",
    name: "CNC Mill — Haas Mini Mill",
    category: "equipment",
    department: "Engineering Lab",
    description:
      "3-axis CNC vertical mill. Aluminium, steel, plastics. Work envelope 406 × 305 × 254 mm.",
    location: "Building C, Room 210",
    capacity: 1,
    status: "maintenance",
    tags: ["CNC", "milling", "metalwork"],
    requiresTraining: true,
    minDurationMinutes: 60,
    maxDurationMinutes: 300,
  },
  {
    id: "res-007",
    name: "Podcast Recording Booth",
    category: "space",
    department: "Media Arts",
    description:
      "Acoustically treated recording booth with 4-channel mixer, condenser microphones, and monitoring headphones.",
    location: "Library, Basement B2",
    capacity: 4,
    status: "available",
    tags: ["podcast", "audio", "recording", "media"],
    requiresTraining: false,
    minDurationMinutes: 30,
    maxDurationMinutes: 180,
  },
  {
    id: "res-008",
    name: "Soldering & Rework Station",
    category: "equipment",
    department: "Electronics Lab",
    description:
      "Hakko FX-951 soldering station with hot-air rework, fume extraction, and ESD-safe workspace.",
    location: "Building D, Room 112",
    capacity: 2,
    status: "available",
    tags: ["soldering", "electronics", "SMD", "rework"],
    requiresTraining: true,
    minDurationMinutes: 30,
    maxDurationMinutes: 180,
  },
];

// ─── Time Slots ──────────────────────────────────────────────────────────

/** Generate mock time slots for a given resource and date */
export function generateMockSlots(
  resourceId: string,
  date: string,
): TimeSlot[] {
  const baseHours = [
    { start: "08:00", end: "10:00" },
    { start: "10:00", end: "12:00" },
    { start: "12:00", end: "14:00" },
    { start: "14:00", end: "16:00" },
    { start: "16:00", end: "18:00" },
  ];

  return baseHours.map((slot, i) => ({
    id: `slot-${resourceId}-${date}-${i}`,
    resourceId,
    date,
    startTime: slot.start,
    endTime: slot.end,
    // Make some slots unavailable for realism
    isAvailable: !(resourceId === "res-001" && i === 2) && !(resourceId === "res-004" && i === 0),
  }));
}

// ─── Booking Requests ────────────────────────────────────────────────────

export const MOCK_REQUESTS: BookingRequest[] = [
  {
    id: "req-001",
    resourceId: "res-001",
    resourceName: "Ultimaker S5 — 3D Printer",
    userId: "user-mock-001",
    userName: "Demo User",
    department: "Engineering",
    status: "approved",
    purpose: "Printing enclosure for capstone sensor module",
    notes: "PLA filament, 0.2mm layer height. Estimated print time ~4 hours.",
    date: "2026-11-03",
    startTime: "10:00",
    endTime: "14:00",
    createdAt: "2026-10-28T09:15:00Z",
    updatedAt: "2026-10-28T10:00:00Z",
    rank: 1,
    studentExplanation:
      "Your request was prioritised due to fair-usage balance and project deadline proximity.",
  },
  {
    id: "req-002",
    resourceId: "res-004",
    resourceName: "Collaborative Studio A",
    userId: "user-mock-001",
    userName: "Demo User",
    department: "Engineering",
    status: "pending",
    purpose: "Team design review meeting",
    notes: "Need video conferencing for remote team member.",
    date: "2026-11-05",
    startTime: "14:00",
    endTime: "16:00",
    headcount: 6,
    createdAt: "2026-10-29T11:30:00Z",
    updatedAt: "2026-10-29T11:30:00Z",
  },
  {
    id: "req-003",
    resourceId: "res-002",
    resourceName: "Trotec Speedy 360 — Laser Cutter",
    userId: "user-mock-001",
    userName: "Demo User",
    department: "Engineering",
    status: "waitlisted",
    purpose: "Cutting acrylic panels for exhibition display",
    notes: "3mm clear acrylic, have material ready.",
    date: "2026-11-04",
    startTime: "14:00",
    endTime: "16:00",
    createdAt: "2026-10-28T14:20:00Z",
    updatedAt: "2026-10-28T15:00:00Z",
    rank: 3,
    studentExplanation:
      "High demand for this time slot. You are #3 on the waitlist. Consider an alternative slot.",
    alternatives: [
      {
        slotId: "slot-res-002-2026-11-04-1",
        resourceId: "res-002",
        resourceName: "Trotec Speedy 360 — Laser Cutter",
        date: "2026-11-04",
        startTime: "10:00",
        endTime: "12:00",
        reason: "Same day, morning slot with no contention",
      },
      {
        slotId: "slot-res-002-2026-11-05-3",
        resourceId: "res-002",
        resourceName: "Trotec Speedy 360 — Laser Cutter",
        date: "2026-11-05",
        startTime: "14:00",
        endTime: "16:00",
        reason: "Next day, same time slot, currently empty",
      },
    ],
  },
];

// ─── Alternative Resources (for AI mock) ─────────────────────────────────

export function getMockAlternatives(
  resourceId: string,
): AlternativeResource[] {
  const resource = MOCK_RESOURCES.find((r) => r.id === resourceId);
  if (!resource) return [];

  // Find resources in the same category that are available
  const alternatives = MOCK_RESOURCES.filter(
    (r) =>
      r.id !== resourceId &&
      r.category === resource.category &&
      r.status === "available",
  );

  return alternatives.slice(0, 3).map((alt) => ({
    slotId: `slot-${alt.id}-alt`,
    resourceId: alt.id,
    resourceName: alt.name,
    date: "2026-11-04",
    startTime: "10:00",
    endTime: "12:00",
    reason: `${alt.name} in ${alt.location} is available at this time`,
  }));
}

