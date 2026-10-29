"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/pages";
import {
  createResource,
  updateResource,
  getResourceById,
  writeAudit,
  createAvailabilityWindow,
  updateAvailabilityWindow,
  deleteAvailabilityWindow,
  listAvailabilityWindowsByResource,
  findConflictingWindow,
  bookingsCol,
  docToEntity,
} from "@/lib/db";
import { canCoordinatorManageResource } from "@/lib/db/coordinator-helpers";
import type {
  AuditAction,
  AvailabilityWindow,
  Booking,
  Resource,
  ResourceType,
  ResourceStatus,
  SlotType,
  Weekday,
} from "@/lib/types";

// Zod schema for resource creation & editing
export const resourceFormSchema = z.object({
  name: z.string().min(2, "Resource name must be at least 2 characters."),
  type: z.enum([
    "printer_3d",
    "arduino_kit",
    "camera",
    "studio",
    "project_room",
    "lab_instrument",
  ]),
  department_id: z.string().min(1, "Department is required."),
  location: z.string().min(2, "Location is required."),
  photo_url: z.string().url().nullable().or(z.literal("")).default(""),
  restricted: z.boolean().default(false),
  requires_training: z.string().nullable().or(z.literal("")).default(""),
  credit_cost: z.coerce.number().min(0, "Credit cost must be 0 or greater."),
  max_session_minutes: z.coerce.number().min(15, "Session must be at least 15 minutes."),
  status: z.enum(["available", "maintenance", "retired"]).default("available"),
});

export type ResourceFormData = z.infer<typeof resourceFormSchema>;

export async function createResourceAction(rawInput: unknown) {
  const user = await getSessionUser();
  if (!user || (user.role !== "coordinator" && user.role !== "admin")) {
    return { success: false, error: "Forbidden: Coordinator or Admin role required." };
  }

  const parsed = resourceFormSchema.safeParse(rawInput);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
    return { success: false, error: errorMsg };
  }

  const data = parsed.data;

  try {
    const newResource = await createResource({
      name: data.name,
      type: data.type as ResourceType,
      department_id: data.department_id,
      coordinator_id: user.uid,
      location: data.location,
      photo_url: data.photo_url || null,
      restricted: data.restricted,
      requires_training: data.requires_training || null,
      credit_cost: data.credit_cost,
      max_session_minutes: data.max_session_minutes,
      status: data.status as ResourceStatus,
      last_inspection_at: new Date().toISOString(),
    });

    await writeAudit(undefined, {
      actor_id: user.uid,
      action: "resource_created" as AuditAction,
      entity_type: "resources",
      entity_id: newResource.id,
      reason: `Resource "${newResource.name}" created by ${user.role} ${user.email || user.uid}`,
    });

    revalidatePath("/dashboard/coordinator/resources");
    revalidatePath("/dashboard/coordinator");
    return { success: true, resourceId: newResource.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create resource.";
    return { success: false, error: msg };
  }
}

export async function updateResourceAction(resourceId: string, rawInput: unknown) {
  const user = await getSessionUser();
  if (!user || (user.role !== "coordinator" && user.role !== "admin")) {
    return { success: false, error: "Forbidden: Coordinator or Admin role required." };
  }

  const existing = await getResourceById(resourceId);
  if (!existing) {
    return { success: false, error: "Resource not found." };
  }

  if (!canCoordinatorManageResource(existing, user)) {
    return { success: false, error: "Forbidden: You are not authorized to edit this resource." };
  }

  const parsed = resourceFormSchema.safeParse(rawInput);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
    return { success: false, error: errorMsg };
  }

  const data = parsed.data;

  try {
    await updateResource(resourceId, {
      name: data.name,
      type: data.type as ResourceType,
      department_id: data.department_id,
      location: data.location,
      photo_url: data.photo_url || null,
      restricted: data.restricted,
      requires_training: data.requires_training || null,
      credit_cost: data.credit_cost,
      max_session_minutes: data.max_session_minutes,
      status: data.status as ResourceStatus,
      last_inspection_at: new Date().toISOString(),
    });

    await writeAudit(undefined, {
      actor_id: user.uid,
      action: "resource_updated" as AuditAction,
      entity_type: "resources",
      entity_id: resourceId,
      reason: `Resource "${data.name}" updated by ${user.role} ${user.email || user.uid}`,
    });

    revalidatePath(`/dashboard/coordinator/resources/${resourceId}/edit`);
    revalidatePath("/dashboard/coordinator/resources");
    revalidatePath("/dashboard/coordinator");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update resource.";
    return { success: false, error: msg };
  }
}

// Zod schema for availability window
export const availabilityWindowSchema = z.object({
  resource_id: z.string().min(1, "Resource ID is required."),
  mode: z.enum(["recurring", "specific_date"]),
  weekday: z.coerce.number().min(0).max(6).nullable().optional(),
  date: z.string().nullable().optional(),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Start time must be HH:mm (e.g. 09:00)."),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "End time must be HH:mm (e.g. 17:00)."),
  slot_type: z.enum(["credit", "free", "blocked"]).default("credit"),
  note: z.string().nullable().optional(),
}).refine((data) => data.start < data.end, {
  message: "Start time must be strictly before end time.",
  path: ["end"],
}).refine((data) => {
  if (data.mode === "recurring") {
    return data.weekday !== null && data.weekday !== undefined;
  }
  return Boolean(data.date && data.date.trim().length > 0);
}, {
  message: "Either a recurring weekday or specific date is required.",
  path: ["mode"],
});

export type AvailabilityWindowFormData = z.infer<typeof availabilityWindowSchema>;

export async function addAvailabilityWindowAction(rawInput: unknown) {
  const user = await getSessionUser();
  if (!user || (user.role !== "coordinator" && user.role !== "admin")) {
    return { success: false, error: "Forbidden: Coordinator or Admin role required." };
  }

  const parsed = availabilityWindowSchema.safeParse(rawInput);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
    return { success: false, error: errorMsg };
  }

  const data = parsed.data;
  const resource = await getResourceById(data.resource_id);
  if (!resource) {
    return { success: false, error: "Resource not found." };
  }

  if (!canCoordinatorManageResource(resource, user)) {
    return { success: false, error: "Forbidden: You are not authorized to edit availability for this resource." };
  }

  // Overlap rejection check
  const existingWindows = await listAvailabilityWindowsByResource(data.resource_id);
  const candidate = {
    weekday: data.mode === "recurring" ? (data.weekday as Weekday) : null,
    date: data.mode === "specific_date" ? (data.date || null) : null,
    start: data.start,
    end: data.end,
  };

  const conflict = findConflictingWindow(existingWindows, candidate);
  if (conflict) {
    const conflictDayDesc =
      conflict.weekday !== null
        ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][conflict.weekday]
        : conflict.date;
    return {
      success: false,
      error: `Overlap rejected: This slot conflicts with existing window (${conflict.start} – ${conflict.end} on ${conflictDayDesc}).`,
    };
  }

  try {
    const created = await createAvailabilityWindow({
      resource_id: data.resource_id,
      weekday: candidate.weekday,
      date: candidate.date,
      start: data.start,
      end: data.end,
      slot_type: data.slot_type as SlotType,
      note: data.note || null,
    });

    await writeAudit(undefined, {
      actor_id: user.uid,
      action: "availability_window_created" as AuditAction,
      entity_type: "availability_windows",
      entity_id: created.id,
      reason: `Availability window (${data.start}-${data.end}) added to ${resource.name}`,
    });

    revalidatePath(`/dashboard/coordinator/resources/${data.resource_id}/edit`);
    return { success: true, windowId: created.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to add availability window.";
    return { success: false, error: msg };
  }
}

export async function deleteAvailabilityWindowAction(windowId: string, resourceId: string) {
  const user = await getSessionUser();
  if (!user || (user.role !== "coordinator" && user.role !== "admin")) {
    return { success: false, error: "Forbidden: Coordinator or Admin role required." };
  }

  const resource = await getResourceById(resourceId);
  if (!resource) {
    return { success: false, error: "Resource not found." };
  }

  if (!canCoordinatorManageResource(resource, user)) {
    return { success: false, error: "Forbidden: You are not authorized to edit availability for this resource." };
  }

  try {
    await deleteAvailabilityWindow(windowId);

    await writeAudit(undefined, {
      actor_id: user.uid,
      action: "availability_window_deleted" as AuditAction,
      entity_type: "availability_windows",
      entity_id: windowId,
      reason: `Availability window deleted from resource "${resource.name}"`,
    });

    revalidatePath(`/dashboard/coordinator/resources/${resourceId}/edit`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete window.";
    return { success: false, error: msg };
  }
}

// Maintenance Block schema
export const maintenanceBlockSchema = z.object({
  resource_id: z.string().min(1, "Resource ID is required."),
  start_date: z.string().min(1, "Start date is required."),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Start time must be HH:mm."),
  end_date: z.string().min(1, "End date is required."),
  end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "End time must be HH:mm."),
  reason: z.string().min(2, "Maintenance reason/notes are required."),
  set_resource_maintenance: z.boolean().default(false),
  confirmed_with_conflicts: z.boolean().default(false),
});

export type MaintenanceBlockData = z.infer<typeof maintenanceBlockSchema>;

export async function scheduleMaintenanceBlockAction(rawInput: unknown) {
  const user = await getSessionUser();
  if (!user || (user.role !== "coordinator" && user.role !== "admin")) {
    return { success: false, error: "Forbidden: Coordinator or Admin role required." };
  }

  const parsed = maintenanceBlockSchema.safeParse(rawInput);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
    return { success: false, error: errorMsg };
  }

  const data = parsed.data;
  const resource = await getResourceById(data.resource_id);
  if (!resource) {
    return { success: false, error: "Resource not found." };
  }

  if (!canCoordinatorManageResource(resource, user)) {
    return { success: false, error: "Forbidden: You are not authorized to schedule maintenance for this resource." };
  }

  const startIso = `${data.start_date}T${data.start_time}:00.000Z`;
  const endIso = `${data.end_date}T${data.end_time}:00.000Z`;

  if (startIso >= endIso) {
    return { success: false, error: "Maintenance start must be before maintenance end." };
  }

  // Check for conflicting active bookings
  const bookingsSnap = await bookingsCol()
    .where("resource_id", "==", data.resource_id)
    .get();

  const conflictingBookings = bookingsSnap.docs
    .map((d) => docToEntity<Booking>(d.id, d.data()))
    .filter((b): b is Booking => b !== null)
    .filter((b) => {
      const active = b.status === "confirmed" || b.status === "allocated" || b.status === "checked_out";
      if (!active) return false;
      // Overlap with maintenance window: slot_start < endIso && startIso < slot_end
      return b.slot_start < endIso && startIso < b.slot_end;
    });

  if (conflictingBookings.length > 0 && !data.confirmed_with_conflicts) {
    return {
      success: false,
      hasConflicts: true,
      conflicts: conflictingBookings.map((b) => ({
        id: b.id,
        user_id: b.user_id,
        slot_start: b.slot_start,
        slot_end: b.slot_end,
        status: b.status,
      })),
      error: `Warning: ${conflictingBookings.length} booking(s) conflict with this maintenance window.`,
    };
  }

  try {
    // Create blocked availability window
    const blockedWindow = await createAvailabilityWindow({
      resource_id: data.resource_id,
      weekday: null,
      date: data.start_date,
      start: data.start_time,
      end: data.end_time,
      slot_type: "blocked",
      note: `Maintenance: ${data.reason}`,
    });

    if (data.set_resource_maintenance) {
      await updateResource(data.resource_id, {
        status: "maintenance",
        last_inspection_at: new Date().toISOString(),
      });
    }

    await writeAudit(undefined, {
      actor_id: user.uid,
      action: "maintenance_block_created" as AuditAction,
      entity_type: "resources",
      entity_id: data.resource_id,
      reason: `Maintenance block scheduled: ${data.reason}. Impacted bookings: ${conflictingBookings.length}`,
    });

    revalidatePath(`/dashboard/coordinator/resources/${data.resource_id}/edit`);
    revalidatePath("/dashboard/coordinator/resources");
    revalidatePath("/dashboard/coordinator");
    return { success: true, windowId: blockedWindow.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to schedule maintenance.";
    return { success: false, error: msg };
  }
}

