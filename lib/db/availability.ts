// Utilix — availability window database helpers (server-only)
// Owner: A
import "server-only";

import { availabilityWindowsCol } from "./collections";
import { docToEntity } from "./converters";
import type { AvailabilityWindow } from "@/lib/types";
import {
  getDayOfWeekFromDate,
  windowsOverlap,
  windowsConflict,
} from "./coordinator-helpers";

export { getDayOfWeekFromDate, windowsOverlap, windowsConflict };

/**
 * Finds the first conflicting window in a list, if any, excluding a specific window ID.
 */
export function findConflictingWindow(
  existingWindows: AvailabilityWindow[],
  candidate: Pick<AvailabilityWindow, "weekday" | "date" | "start" | "end">,
  excludeId?: string
): AvailabilityWindow | null {
  for (const win of existingWindows) {
    if (excludeId && win.id === excludeId) continue;
    if (windowsConflict(win, candidate)) {
      return win;
    }
  }
  return null;
}

/** List all availability windows for a given resource. */
export async function listAvailabilityWindowsByResource(
  resourceId: string
): Promise<AvailabilityWindow[]> {
  const snap = await availabilityWindowsCol()
    .where("resource_id", "==", resourceId)
    .get();

  const windows = snap.docs
    .map((d) => docToEntity<AvailabilityWindow>(d.id, d.data()))
    .filter((w): w is AvailabilityWindow => w !== null);

  // Sort by recurring weekday first, then specific date, then start time
  windows.sort((a, b) => {
    if (a.weekday !== null && b.weekday !== null) {
      if (a.weekday !== b.weekday) return a.weekday - b.weekday;
    } else if (a.weekday !== null) {
      return -1;
    } else if (b.weekday !== null) {
      return 1;
    } else if (a.date && b.date && a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.start.localeCompare(b.start);
  });

  return windows;
}

/** Get a single availability window by ID. */
export async function getAvailabilityWindowById(
  id: string
): Promise<AvailabilityWindow | null> {
  const snap = await availabilityWindowsCol().doc(id).get();
  if (!snap.exists) return null;
  return docToEntity<AvailabilityWindow>(snap.id, snap.data());
}

/** Create a new availability window. */
export async function createAvailabilityWindow(
  data: Omit<AvailabilityWindow, "id">,
  customId?: string
): Promise<AvailabilityWindow> {
  const ref = customId
    ? availabilityWindowsCol().doc(customId)
    : availabilityWindowsCol().doc();

  const firestoreData = {
    ...data,
    resource_id: data.resource_id,
    weekday: data.weekday ?? null,
    date: data.date ?? null,
    start: data.start,
    end: data.end,
    slot_type: data.slot_type,
    note: data.note ?? null,
  };

  await ref.set(firestoreData);

  return {
    ...data,
    id: ref.id,
  };
}

/** Update an existing availability window. */
export async function updateAvailabilityWindow(
  id: string,
  partial: Partial<Omit<AvailabilityWindow, "id">>
): Promise<void> {
  const updateData: Record<string, unknown> = { ...partial };
  await availabilityWindowsCol().doc(id).update(updateData);
}

/** Delete an availability window by ID. */
export async function deleteAvailabilityWindow(id: string): Promise<void> {
  await availabilityWindowsCol().doc(id).delete();
}
