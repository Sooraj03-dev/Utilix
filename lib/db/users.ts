// Utilix — user database helpers (server-only)
// Owner: A
// NOTE: credit_balance changes ONLY via ledger.ts. Never mutate credit_balance here.
import "server-only";

import { usersCol } from "./collections";
import { docToEntity, nowISO, nowTimestamp } from "./converters";
import type { User, UserRole } from "@/lib/types";
import type { Transaction } from "firebase-admin/firestore";

/** Get a single user by ID, or null. */
export async function getUserById(id: string): Promise<User | null> {
  const snap = await usersCol().doc(id).get();
  if (!snap.exists) return null;
  return docToEntity<User>(snap.id, snap.data());
}

/** Get a single user by ID inside an active transaction. */
export async function getUserByIdTx(
  tx: Transaction,
  id: string
): Promise<User | null> {
  const snap = await tx.get(usersCol().doc(id));
  if (!snap.exists) return null;
  return docToEntity<User>(snap.id, snap.data());
}

export interface ListUsersFilter {
  role?: UserRole;
  department_id?: string;
  active?: boolean;
}

/** List users with optional filtering. */
export async function listUsers(
  filter: ListUsersFilter = {}
): Promise<User[]> {
  let query = usersCol().orderBy("name");

  if (filter.role) {
    query = query.where("role", "==", filter.role);
  }
  if (filter.department_id) {
    query = query.where("department_id", "==", filter.department_id);
  }
  if (filter.active !== undefined) {
    query = query.where("active", "==", filter.active);
  }

  const snap = await query.get();
  return snap.docs
    .map((d) => docToEntity<User>(d.id, d.data()))
    .filter((u): u is User => u !== null);
}

export type CreateUserInput = Omit<User, "created_at">;

/** Create a new user document. */
export async function createUser(
  data: CreateUserInput,
  customId?: string,
  tx?: Transaction
): Promise<User> {
  const ref = customId ? usersCol().doc(customId) : usersCol().doc(data.id);
  const nowTs = nowTimestamp();
  const now = nowISO();

  const firestoreData = {
    role: data.role,
    name: data.name,
    email: data.email,
    department_id: data.department_id,
    year: data.year,
    credit_balance: data.credit_balance,
    free_sessions_used: data.free_sessions_used,
    free_sessions_week: data.free_sessions_week,
    active: data.active,
    created_at: nowTs,
  };

  if (tx) {
    tx.set(ref, firestoreData);
  } else {
    await ref.set(firestoreData);
  }

  return {
    ...data,
    id: ref.id,
    created_at: now,
  };
}

/** Update general user fields (excludes credit_balance, which is ledger-only). */
export async function updateUser(
  id: string,
  partial: Partial<Omit<User, "id" | "credit_balance" | "created_at">>,
  tx?: Transaction
): Promise<void> {
  const ref = usersCol().doc(id);
  if (tx) {
    tx.update(ref, partial);
  } else {
    await ref.update(partial);
  }
}
