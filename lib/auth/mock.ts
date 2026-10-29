import { canUseMockAuthServer } from "./config";
import type { AuthUser, UserRole } from "../types/auth";

export interface MockAccount {
  uid: string;
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  assignedResourceIds: string[];
  trainingVerified: boolean;
}

export const MOCK_ACCOUNTS: MockAccount[] = [
  {
    uid: "mock-student-1",
    email: "student.demo@utilix.local",
    password: "demo-student",
    displayName: "Student Demo",
    role: "student",
    assignedResourceIds: [],
    trainingVerified: true,
  },
  {
    uid: "mock-coordinator-1",
    email: "coordinator.demo@utilix.local",
    password: "demo-coordinator",
    displayName: "Coordinator Demo",
    role: "coordinator",
    assignedResourceIds: ["res-arduino-kit-a", "res-dslr-cam-1"],
    trainingVerified: true,
  },
  {
    uid: "mock-admin-1",
    email: "admin.demo@utilix.local",
    password: "demo-admin",
    displayName: "Admin Demo",
    role: "admin",
    assignedResourceIds: [],
    trainingVerified: true,
  },
];

const MOCK_SESSION_TTL_SECONDS = 60 * 60 * 8;

interface MockSessionPayload {
  uid: string;
  exp: number;
}

export class MockAuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export function assertMockAuthAllowed(): void {
  if (!canUseMockAuthServer()) {
    throw new MockAuthError(
      "Mock authentication is disabled. Set NEXT_PUBLIC_USE_MOCK_AUTH=true for local development.",
      403,
    );
  }
}

export function findMockAccountByCredentials(email: string, password: string): MockAccount | null {
  const normalizedEmail = email.trim().toLowerCase();
  return (
    MOCK_ACCOUNTS.find(
      (account) =>
        account.email.toLowerCase() === normalizedEmail && account.password === password,
    ) ?? null
  );
}

export function findMockAccountByUid(uid: string): MockAccount | null {
  return MOCK_ACCOUNTS.find((account) => account.uid === uid) ?? null;
}

export function serializeMockSession(uid: string, now = Date.now()): string {
  const payload: MockSessionPayload = {
    uid,
    exp: now + MOCK_SESSION_TTL_SECONDS * 1000,
  };

  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function parseMockSession(sessionCookieValue: string, now = Date.now()): MockSessionPayload {
  try {
    const parsed = JSON.parse(
      Buffer.from(sessionCookieValue, "base64url").toString("utf8"),
    ) as MockSessionPayload;

    if (!parsed.uid || typeof parsed.exp !== "number") {
      throw new MockAuthError("Malformed mock session payload.", 401);
    }

    if (parsed.exp <= now) {
      throw new MockAuthError("Mock session has expired.", 401);
    }

    return parsed;
  } catch (error) {
    if (error instanceof MockAuthError) {
      throw error;
    }
    throw new MockAuthError("Invalid mock session cookie.", 401);
  }
}

export function toAuthUser(account: MockAccount): AuthUser {
  return {
    uid: account.uid,
    email: account.email,
    displayName: account.displayName,
    role: account.role,
    assignedResourceIds: account.assignedResourceIds,
    trainingVerified: account.trainingVerified,
    source: "mock",
  };
}

