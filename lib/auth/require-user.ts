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
 * Verifies the Firebase ID token from the Authorization header.
 * Reads the `role` custom claim.
 * Optionally checks that the user has one of the allowed roles.
 *
 * @throws AuthError if the token is missing, invalid, or the role is not allowed.
 */
export async function requireUser(
  request: Request,
  roles?: UserRole[]
): Promise<AuthUser> {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new AuthError("Missing or malformed Authorization header");
  }

  const token = header.slice(7);

  try {
    const decoded = await adminAuth.verifyIdToken(token);

    const role = (decoded.role as UserRole) ?? "student";
    const user: AuthUser = {
      uid: decoded.uid,
      email: decoded.email ?? "",
      name: decoded.name ?? decoded.email ?? "Unknown",
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
