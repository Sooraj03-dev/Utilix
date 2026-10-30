export const SESSION_COOKIE_NAME = "utilix_session";
export const MOCK_SESSION_COOKIE_NAME = "utilix_mock_session";

export function isMockAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true" && process.env.NODE_ENV !== "production";
}

export function canUseMockAuthServer(): boolean {
  return isMockAuthEnabled() && process.env.NODE_ENV !== "production";
}

