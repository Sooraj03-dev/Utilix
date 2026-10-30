// Utilix — server-side auth helper
// Owner: A
// Usage: const user = await requireUser(request); or requireUser(request, ["admin","coordinator"])

import { adminAuth } from "@/lib/firebase/admin";
import type { AuthUser, UserRole } from "@/lib/types";

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Verifies the Firebase ID token from the Authorization header or session cookie.
 * Reads the `role` custom claim or Firestore user profile.
 * Optionally checks that the user has one of the allowed roles.
 *
 * @throws AuthError if the token is missing, invalid, or the role is not allowed.
 */
export async function requireUser(
  request: Request,
  roles?: UserRole[]
): Promise<AuthUser> {
  let token: string | null = null;
  const header = request.headers.get("Authorization");
  if (header?.startsWith("Bearer ")) {
    token = header.slice(7);
  } else {
    // Check cookies for session token (used by browser client sessions)
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
    token = cookies.get("utilix_session") ?? null;
    if (!token && cookies.has("utilix_mock_session")) {
      try {
        const { getCurrentUser } = await import("./server");
        const user = await getCurrentUser(request);
        if (user) {
          if (roles && roles.length > 0 && !roles.includes(user.role)) {
            throw new AuthError(
              `Forbidden: requires role ${roles.join(" or ")}`,
              403
            );
          }
          return {
            uid: user.uid,
            email: user.email,
            name: user.displayName,
            role: user.role,
          };
        }
      } catch (err) {
        if (err instanceof AuthError) throw err;
      }
    }
  }

  if (!token) {
    throw new AuthError("Missing or malformed Authorization header");
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);

    let role = decoded.role as UserRole;
    let name = decoded.name ?? decoded.email ?? "Unknown";

    // Fall back to Firestore profile if role claim is not set on token
    if (!role) {
      try {
        const { getUserProfileByUid } = await import("@/lib/db/users");
        const profile = await getUserProfileByUid(decoded.uid);
        if (profile?.role) {
          role = profile.role;
        }
        if (profile?.displayName) {
          name = profile.displayName;
        }
      } catch {
        // Fall back to student
      }
    }
    role = role ?? "student";

    const user: AuthUser = {
      uid: decoded.uid,
      email: decoded.email ?? "",
      name,
      role,
    };

    if (roles && roles.length > 0 && !roles.includes(role)) {
      throw new AuthError(
        `Forbidden: requires role ${roles.join(" or ")}`,
        403
      );
    }

    return user;
  } catch (err) {
    if (err instanceof AuthError) throw err;
    throw new AuthError("Invalid or expired token");
  }
}
