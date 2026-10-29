import { getUserProfileByUid } from "../db/users";
import { getFirebaseAdminAuth } from "../firebase/admin";
import { MOCK_SESSION_COOKIE_NAME, SESSION_COOKIE_NAME, canUseMockAuthServer } from "./config";
import { findMockAccountByUid, parseMockSession, toAuthUser, type MockAuthError } from "./mock";
import type { AuthUser, UserRole } from "../types/auth";

type DecodedAuthToken = { uid: string; email?: string; name?: string };
type VerifyTokenFn = (token: string) => Promise<DecodedAuthToken>;

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export function authErrorToResponse(error: unknown): Response {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  if (typeof error === "object" && error !== null && "status" in error && "message" in error) {
    const mockAuthError = error as MockAuthError;
    return Response.json({ error: mockAuthError.message }, { status: mockAuthError.status });
  }

  return Response.json({ error: "Internal authorization error." }, { status: 500 });
}

export function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }
  return token;
}

function getTokenFromRequest(request: Request): string | null {
  const bearer = extractBearerToken(request.headers.get("authorization"));
  if (bearer) {
    return bearer;
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = new Map(
    cookieHeader
      .split(";")
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => {
        const [name, ...valueParts] = pair.split("=");
        return [name, valueParts.join("=")] as const;
      }),
  );

  return cookies.get(SESSION_COOKIE_NAME) ?? null;
}

function getMockSessionFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = new Map(
    cookieHeader
      .split(";")
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => {
        const [name, ...valueParts] = pair.split("=");
        return [name, valueParts.join("=")] as const;
      }),
  );

  return cookies.get(MOCK_SESSION_COOKIE_NAME) ?? null;
}

async function verifyFirebaseIdToken(token: string, verifyToken?: VerifyTokenFn): Promise<DecodedAuthToken> {
  const adminAuth = getFirebaseAdminAuth();
  const verify = verifyToken ?? (adminAuth ? adminAuth.verifyIdToken.bind(adminAuth) : undefined);
  if (!verify) {
    throw new AuthError(
      "Firebase Admin SDK is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.",
      500,
    );
  }

  try {
    return await verify(token);
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("expired")) {
      throw new AuthError("Authentication token has expired.", 401);
    }
    throw new AuthError("Invalid authentication token.", 401);
  }
}

export async function getCurrentUser(
  request: Request,
  options?: {
    verifyToken?: VerifyTokenFn;
    now?: number;
  },
): Promise<AuthUser | null> {
  if (canUseMockAuthServer()) {
    const mockCookie = getMockSessionFromRequest(request);
    if (mockCookie) {
      const mockSession = parseMockSession(mockCookie, options?.now);
      const mockAccount = findMockAccountByUid(mockSession.uid);
      if (!mockAccount) {
        throw new AuthError("Mock user not found.", 401);
      }
      return toAuthUser(mockAccount);
    }
  }

  const token = getTokenFromRequest(request);
  if (!token) {
    return null;
  }

  const decoded = await verifyFirebaseIdToken(token, options?.verifyToken);
  const profile = await getUserProfileByUid(decoded.uid);

  return {
    uid: decoded.uid,
    email: profile?.email || decoded.email || "",
    displayName: profile?.displayName || decoded.name || "Unknown user",
    role: profile?.role ?? "student",
    assignedResourceIds: profile?.assignedResourceIds ?? [],
    trainingVerified: profile?.trainingVerified ?? false,
    source: "firebase",
  };
}

export async function requireUser(
  request: Request,
  options?: {
    verifyToken?: VerifyTokenFn;
    now?: number;
  },
): Promise<AuthUser> {
  const user = await getCurrentUser(request, options);
  if (!user) {
    throw new AuthError("Missing Authorization token.", 401);
  }
  return user;
}

export async function requireRole(
  request: Request,
  allowedRoles: UserRole[],
  options?: {
    verifyToken?: VerifyTokenFn;
    now?: number;
  },
): Promise<AuthUser> {
  const user = await requireUser(request, options);
  if (!allowedRoles.includes(user.role)) {
    throw new AuthError(
      `Role '${user.role}' cannot access this endpoint. Required: ${allowedRoles.join(", ")}.`,
      403,
    );
  }
  return user;
}

export function canAccessResource(user: AuthUser, resourceId: string, ownerUid?: string): boolean {
  if (user.role === "admin") {
    return true;
  }

  if (user.role === "coordinator") {
    return user.assignedResourceIds.includes(resourceId);
  }

  if (ownerUid && ownerUid === user.uid) {
    return true;
  }

  return false;
}
