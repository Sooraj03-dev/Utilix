// Utilix — session helpers for Server Components (server-only)
// Owner: A
// Reuses the request-based auth from ./server so pages and API routes
// agree on exactly one authentication implementation.
import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME } from "./config";
import { getCurrentUser } from "./server";
import type { AuthUser } from "../types/auth";

/** Reads the signed-in user for a Server Component, or null. */
export async function getSessionUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  const request = new Request("http://localhost/", {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${sessionCookie}` },
  });

  try {
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
