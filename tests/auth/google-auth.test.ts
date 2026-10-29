import { describe, expect, it } from "vitest";
import { getCurrentUser, requireRole } from "../../lib/auth/server";

// Redirect resolver helper (matches logic in app/login/page.tsx)
function getSafeRedirectUrl(userRole: string, candidate?: string | null): string {
  if (
    candidate &&
    candidate.startsWith("/") &&
    !candidate.startsWith("//") &&
    !candidate.includes(":")
  ) {
    return candidate;
  }
  if (userRole === "admin") {
    return "/dashboard/admin";
  }
  if (userRole === "coordinator") {
    return "/dashboard/coordinator";
  }
  return "/";
}

describe("Google Authentication & User Profile Integration", () => {
  it("resolves Student role to root campus dashboard", () => {
    expect(getSafeRedirectUrl("student")).toBe("/");
  });

  it("resolves Coordinator role to coordinator dashboard", () => {
    expect(getSafeRedirectUrl("coordinator")).toBe("/dashboard/coordinator");
  });

  it("resolves Admin role to admin dashboard", () => {
    expect(getSafeRedirectUrl("admin")).toBe("/dashboard/admin");
  });

  it("prevents open redirect attacks by discarding external URLs", () => {
    expect(getSafeRedirectUrl("student", "https://malicious.site/phish")).toBe("/");
    expect(getSafeRedirectUrl("student", "//malicious.site")).toBe("/");
    expect(getSafeRedirectUrl("coordinator", "javascript:alert(1)")).toBe("/dashboard/coordinator");
  });

  it("allows safe internal redirect URLs", () => {
    expect(getSafeRedirectUrl("student", "/resources")).toBe("/resources");
    expect(getSafeRedirectUrl("student", "/requests")).toBe("/requests");
    expect(getSafeRedirectUrl("coordinator", "/approvals")).toBe("/approvals");
  });

  it("assigns default student role and prevents client self-assignment of elevated roles", async () => {
    const request = new Request("http://localhost/api/auth/session", {
      headers: { authorization: "Bearer google-id-token" },
    });

    // Mock new Google user without an existing elevated profile
    const user = await getCurrentUser(request, {
      verifyToken: async () => ({
        uid: "google-uid-new",
        email: "newstudent@campus.edu",
        name: "New Student",
      }) as never,
      getUserProfile: async () => null, // profile does not exist yet
    });

    expect(user).not.toBeNull();
    expect(user?.role).toBe("student"); // Must default to student
    expect(user?.role).not.toBe("admin");
    expect(user?.role).not.toBe("coordinator");
  });

  it("preserves established Coordinator role when signing in with Google", async () => {
    const request = new Request("http://localhost/api/auth/session", {
      headers: { authorization: "Bearer google-coord-token" },
    });

    const user = await getCurrentUser(request, {
      verifyToken: async () => ({
        uid: "google-coord-uid",
        email: "coord.media@campus.edu",
        name: "Media Coordinator",
      }) as never,
      getUserProfile: async () => ({
        email: "coord.media@campus.edu",
        displayName: "Media Coordinator",
        role: "coordinator" as const,
        assignedResourceIds: ["res-dslr-camera-a"],
        trainingVerified: true,
      }),
    });

    expect(user?.role).toBe("coordinator");
    expect(user?.assignedResourceIds).toContain("res-dslr-camera-a");
  });

  it("preserves established Administrator role and grants admin route access", async () => {
    const request = new Request("http://localhost/api/auth/session", {
      headers: { authorization: "Bearer google-admin-token" },
    });

    const user = await requireRole(request, ["admin"], {
      verifyToken: async () => ({
        uid: "google-admin-uid",
        email: "admin@campus.edu",
        name: "Campus Admin",
      }) as never,
      getUserProfile: async () => ({
        role: "admin" as const,
      }),
    });

    expect(user.role).toBe("admin");
  });

  it("rejects unauthorized access when student attempts coordinator route", async () => {
    const request = new Request("http://localhost/api/workflow/requests/req-1/approve", {
      headers: { authorization: "Bearer student-token" },
    });

    await expect(
      requireRole(request, ["coordinator", "admin"], {
        verifyToken: async () => ({
          uid: "student-uid",
          email: "student@campus.edu",
        }) as never,
        getUserProfile: async () => ({
          role: "student" as const,
        }),
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
});
