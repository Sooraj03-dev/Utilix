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

    const user = await getCurrentUser(request);
    const activeRoleCookie = cookieStore.get("utilix_active_role")?.value;

    if (activeRoleCookie === "student") {
      if (user) {
        return {
          ...user,
          role: "student",
        };
      }
      if (process.env.NODE_ENV !== "production") {
        return {
          uid: "mock-student-1",
          email: "student01@utilix.local",
          displayName: "Aarav Sharma",
          role: "student",
          assignedResourceIds: [],
          trainingVerified: true,
          source: "mock",
        };
      }
    } else if (activeRoleCookie && (activeRoleCookie === "coordinator" || activeRoleCookie === "admin")) {
      const allResources = await import("@/lib/db/resources").then((m) => m.listResources()).catch(() => []);
      const allResourceIds = allResources.map((r) => r.id);

      if (user) {
        return {
          ...user,
          role: activeRoleCookie,
          assignedResourceIds: allResourceIds,
        };
      }

      if (process.env.NODE_ENV !== "production") {
        return {
          uid: activeRoleCookie === "coordinator" ? "coordinator-03" : "admin-01",
          email: activeRoleCookie === "coordinator" ? "coord-makerspace@utilix.local" : "admin@utilix.local",
          displayName: activeRoleCookie === "coordinator" ? "Dr. Sarah Lin" : "Marcus Vance",
          role: activeRoleCookie,
          assignedResourceIds: allResourceIds,
          trainingVerified: true,
          source: "mock",
        };
      }
    }

    return user;
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
