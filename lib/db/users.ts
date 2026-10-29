import { getFirebaseAdminDb } from "../firebase/admin";
import { findMockAccountByUid } from "../auth/mock";
import { isMockAuthEnabled } from "../auth/config";
import type { UserProfile, UserRole } from "../types/auth";

const VALID_ROLES: UserRole[] = ["student", "coordinator", "admin"];

function normalizeRole(rawRole: unknown): UserRole {
  return VALID_ROLES.includes(rawRole as UserRole) ? (rawRole as UserRole) : "student";
}

export async function getUserProfileByUid(uid: string): Promise<UserProfile | null> {
  if (isMockAuthEnabled()) {
    const mock = findMockAccountByUid(uid);
    if (mock) {
      return {
        uid: mock.uid,
        email: mock.email,
        displayName: mock.displayName,
        role: mock.role,
        assignedResourceIds: mock.assignedResourceIds,
        trainingVerified: mock.trainingVerified,
      };
    }
  }

  const db = getFirebaseAdminDb();
  if (!db) {
    return null;
  }

  const snapshot = await db.collection("users").doc(uid).get();
  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() ?? {};

  return {
    uid,
    email: typeof data.email === "string" ? data.email : "",
    displayName: typeof data.displayName === "string" ? data.displayName : "Unknown user",
    role: normalizeRole(data.role),
    assignedResourceIds: Array.isArray(data.assignedResourceIds)
      ? data.assignedResourceIds.filter((value): value is string => typeof value === "string")
      : [],
    trainingVerified: data.trainingVerified === true,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : undefined,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
  };
}

