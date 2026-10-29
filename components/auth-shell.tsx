"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../lib/auth/context";
import type { UserRole } from "../lib/types/auth";

const PUBLIC_ROUTES = new Set(["/", "/login", "/rules"]);

function getRequiredRoles(pathname: string): UserRole[] | null {
  if (pathname.startsWith("/dashboard/admin")) {
    return ["admin"];
  }

  if (pathname.startsWith("/dashboard/coordinator")) {
    return ["coordinator", "admin"];
  }

  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/resources") ||
    pathname.startsWith("/requests") ||
    pathname.startsWith("/book") ||
    pathname.startsWith("/approvals") ||
    pathname.startsWith("/conflicts") ||
    pathname.startsWith("/returns")
  ) {
    return ["student", "coordinator", "admin"];
  }

  return null;
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublicRoute = PUBLIC_ROUTES.has(pathname);
  const requiredRoles = getRequiredRoles(pathname);

  useEffect(() => {
    if (!loading && !user && !isPublicRoute) {
      router.replace("/login");
    }
  }, [loading, user, isPublicRoute, router]);

  const forbidden =
    !!user && !!requiredRoles && !requiredRoles.includes(user.role);

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 980, margin: "0 auto", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <nav style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/">Home</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/history">History</Link>
          {user?.role !== "student" ? <Link href="/dashboard/coordinator">Coordinator</Link> : null}
          {user?.role === "admin" ? <Link href="/dashboard/admin">Admin</Link> : null}
          <Link href="/rules">Rules</Link>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user ? (
            <>
              <span>
                {user.displayName} ({user.role})
              </span>
              <button onClick={() => void logout()}>Logout</button>
            </>
          ) : (
            <Link href="/login">Login</Link>
          )}
        </div>
      </header>

      <main style={{ marginTop: 20 }}>
        {loading ? <p>Loading session…</p> : null}
        {!loading && forbidden ? (
          <div>
            <h1>Forbidden</h1>
            <p>You do not have permission to access this page.</p>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
