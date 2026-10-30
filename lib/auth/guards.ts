import "server-only";

import { redirect } from "next/navigation";
import { getSessionUser } from "./pages";
import { getCurrentUser, AuthError } from "./server";
import { homePathForRole } from "./nav";
import type { AuthUser, UserRole } from "../types/auth";

export { AuthError };

/**
 * Server Component / Layout guard.
 * - Redirects to /login?redirect=<path> if user is signed out.
 * - Redirects to the user's home dashboard if role is unauthorized.
 * - Returns the authenticated AuthUser.
 */
export async function requireRoleOrRedirect(
  roles: UserRole[],
  redirectPath?: string,
  options?: { allowIncomplete?: boolean },
): Promise<AuthUser> {
  const user = await getSessionUser();

  if (!user) {
    const loginUrl = redirectPath
      ? `/login?redirect=${encodeURIComponent(redirectPath)}`
      : "/login";
    redirect(loginUrl);
  }

  if (!options?.allowIncomplete && user.profileCompleted === false && redirectPath !== "/complete-profile") {
    redirect("/complete-profile");
  }

  if (!roles.includes(user.role)) {
    redirect(homePathForRole(user.role));
  }

  return user;
}

/**
 * Server Action / API Route guard.
 * - Throws AuthError(401) if caller is unauthenticated.
 * - Throws AuthError(403) if caller's role is not allowed.
 * - Returns the authenticated AuthUser.
 */
export async function requireRoleOrThrow(
  roles: UserRole[],
  request?: Request,
): Promise<AuthUser> {
  const user = request ? await getCurrentUser(request) : await getSessionUser();

  if (!user) {
    throw new AuthError("Unauthorized: Authentication session required.", 401);
  }

  if (!roles.includes(user.role)) {
    throw new AuthError(
      `Forbidden: Role '${user.role}' is not authorized. Allowed: ${roles.join(", ")}.`,
      403,
    );
  }

  return user;
}
