// Utilix — session helpers for Server Components and Server Actions (server-only)
// Owner: A
// Reuses the request-based auth from ./server so pages and API routes
// agree on exactly one authentication implementation.
import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getCurrentUser } from "./server";
import type { AuthUser } from "../types/auth";

/** Reads the signed-in user for a Server Component or Server Action, or null. */
export async function getSessionUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    if (!allCookies || allCookies.length === 0) return null;

    const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join("; ");
    const request = new Request("http://localhost/", {
      headers: { cookie: cookieHeader },
    });

    return await getCurrentUser(request);
  } catch {
    return null;
  }
}

/** Same, but redirects to the login page when signed out. */
export async function requireSessionUser(): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

