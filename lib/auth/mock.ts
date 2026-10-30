import { canUseMockAuthServer } from "./config";
import type { AuthUser, UserRole } from "../types/auth";
import {
  DEMO_ACCOUNTS,
  type DemoAccount,
  findDemoAccountByCredentials,
  findDemoAccountByUid,
} from "./demo-accounts";

export type MockAccount = DemoAccount;

export const MOCK_ACCOUNTS: MockAccount[] = DEMO_ACCOUNTS;

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
  return findDemoAccountByCredentials(email, password);
}

export function findMockAccountByUid(uid: string): MockAccount | null {
  return findDemoAccountByUid(uid);
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

