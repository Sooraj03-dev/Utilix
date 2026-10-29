// Utilix — resource database helpers (server-only)
// Owner: A
import "server-only";

import { resourcesCol } from "./collections";
import { docToEntity, toTimestamp } from "./converters";
import type { Resource, ResourceStatus, ResourceType } from "@/lib/types";

export interface ListResourcesFilter {
  status?: ResourceStatus;
  department_id?: string;
  type?: ResourceType;
}

/** Get a single resource by ID, or null if not found. */
export async function getResourceById(id: string): Promise<Resource | null> {
  const snap = await resourcesCol().doc(id).get();
  if (!snap.exists) return null;
  return docToEntity<Resource>(snap.id, snap.data());
}

/** List resources with optional filters. */
export async function listResources(
  filter: ListResourcesFilter = {}
): Promise<Resource[]> {
  let query = resourcesCol().orderBy("name");

  if (filter.status) {
    query = query.where("status", "==", filter.status);
  }
  if (filter.department_id) {
    query = query.where("department_id", "==", filter.department_id);
  }
  if (filter.type) {
    query = query.where("type", "==", filter.type);
  }

  const snap = await query.get();
  return snap.docs
    .map((d) => docToEntity<Resource>(d.id, d.data()))
    .filter((r): r is Resource => r !== null);
}

/** Create a new resource document. */
export async function createResource(
  data: Omit<Resource, "id">,
  customId?: string
): Promise<Resource> {
  const ref = customId ? resourcesCol().doc(customId) : resourcesCol().doc();
  const firestoreData = {
    ...data,
    last_inspection_at: toTimestamp(data.last_inspection_at),
  };
  await ref.set(firestoreData);
  return {
    ...data,
    id: ref.id,
  };
}

/** Update an existing resource document. */
export async function updateResource(
  id: string,
  partial: Partial<Omit<Resource, "id">>
): Promise<void> {
  const updateData: Record<string, unknown> = { ...partial };
  if ("last_inspection_at" in partial) {
    updateData.last_inspection_at = toTimestamp(partial.last_inspection_at);
  }
  await resourcesCol().doc(id).update(updateData);
}
