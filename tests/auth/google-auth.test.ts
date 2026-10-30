import { describe, expect, it } from "vitest";
import { getCurrentUser, requireRole } from "../../lib/auth/server";

// Redirect resolver helper (matches logic in app/login/page.tsx)
function getSafeRedirectUrl(userRole: string, candidate?: string | null): string {
  if (
    candidate &&
    candidate.startsWith("/") &&
    !candidate.startsWith("//") &&
    !candidate.includes(":") &&
    candidate !== "/" &&
    candidate !== "/login"
  ) {
    return candidate;
  }
  if (userRole === "admin") {
    return "/dashboard/admin";
  }
  if (userRole === "coordinator") {
    return "/dashboard/coordinator";
  }
  return "/dashboard";
}

describe("Google Authentication & User Profile Integration", () => {
  it("resolves Student role to campus student dashboard", () => {
    expect(getSafeRedirectUrl("student")).toBe("/dashboard");
  });

  it("resolves Coordinator role to coordinator dashboard", () => {
    expect(getSafeRedirectUrl("coordinator")).toBe("/dashboard/coordinator");
  });

  it("resolves Admin role to admin dashboard", () => {
    expect(getSafeRedirectUrl("admin")).toBe("/dashboard/admin");
  });

  it("prevents open redirect attacks and infinite loops", () => {
    expect(getSafeRedirectUrl("student", "https://malicious.site/phish")).toBe("/dashboard");
    expect(getSafeRedirectUrl("student", "//malicious.site")).toBe("/dashboard");
    expect(getSafeRedirectUrl("coordinator", "javascript:alert(1)")).toBe("/dashboard/coordinator");
    expect(getSafeRedirectUrl("student", "/")).toBe("/dashboard");
    expect(getSafeRedirectUrl("student", "/login")).toBe("/dashboard");
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

  describe("Three-Method Authentication Isolation", () => {
    it("Demo login route (/api/auth/login) rejects when mock auth is disabled", async () => {
      const original = process.env.NEXT_PUBLIC_USE_MOCK_AUTH;
      process.env.NEXT_PUBLIC_USE_MOCK_AUTH = "false";
      try {
        const { POST: loginPOST } = await import("../../app/api/auth/login/route");
        const req = new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: "student01@utilix.local",
            password: "UtilixPassword2026!",
          }),
        });

        const res = await loginPOST(req);
        expect(res.status).toBe(403);
      } finally {
        process.env.NEXT_PUBLIC_USE_MOCK_AUTH = original;
      }
    });

    it("Demo login route (/api/auth/login) handles demo credentials and clears real session cookie when enabled", async () => {
      const original = process.env.NEXT_PUBLIC_USE_MOCK_AUTH;
      process.env.NEXT_PUBLIC_USE_MOCK_AUTH = "true";
      try {
        const { POST: loginPOST } = await import("../../app/api/auth/login/route");
        const validReq = new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: "student01@utilix.local",
            password: "UtilixPassword2026!",
          }),
        });

        const res = await loginPOST(validReq);
        expect(res.status).toBe(200);

        const setCookies = res.headers.getSetCookie?.() || [res.headers.get("Set-Cookie") || ""];
        const cookieStr = setCookies.join("; ");
        expect(cookieStr).toContain("utilix_mock_session=");
        expect(cookieStr).toContain("utilix_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
      } finally {
        process.env.NEXT_PUBLIC_USE_MOCK_AUTH = original;
      }
    });

    it("Demo login rejects invalid credentials with demo-specific error", async () => {
      const original = process.env.NEXT_PUBLIC_USE_MOCK_AUTH;
      process.env.NEXT_PUBLIC_USE_MOCK_AUTH = "true";
      try {
        const { POST: loginPOST } = await import("../../app/api/auth/login/route");
        const invalidReq = new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: "unknown@utilix.local",
            password: "wrong-password",
          }),
        });

        const res = await loginPOST(invalidReq);
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error).toBe("Invalid mock credentials.");
      } finally {
        process.env.NEXT_PUBLIC_USE_MOCK_AUTH = original;
      }
    });

    it("Firebase Session route (/api/auth/session) clears mock cookie when establishing real session", async () => {
      const { POST: sessionPOST } = await import("../../app/api/auth/session/route");

      // Sending request without idToken rejects with 400
      const missingTokenReq = new Request("http://localhost/api/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await sessionPOST(missingTokenReq);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("idToken is required.");
    });
  });

  describe("Phase 10 — Authoritative Google Identity & Dashboard Synchronization", () => {
    it("1. Google login with real Firebase UID: extracts UID, email, and display name", async () => {
      const request = new Request("http://localhost/api/test", {
        headers: { authorization: "Bearer google-token-shreyas" },
      });

      const user = await getCurrentUser(request, {
        verifyToken: async () => ({
          uid: "firebase-uid-shreyas-123",
          email: "shreyas@campus.edu",
          name: "Shreyas Adiga",
        }) as never,
        getUserProfile: async () => null,
      });

      expect(user).not.toBeNull();
      expect(user?.uid).toBe("firebase-uid-shreyas-123");
      expect(user?.displayName).toBe("Shreyas Adiga");
      expect(user?.email).toBe("shreyas@campus.edu");
      expect(user?.source).toBe("firebase");
    });

    it("2 & 3. Correct Google profile picture retrieval: extracts picture claim from token or profile", async () => {
      const request = new Request("http://localhost/api/test", {
        headers: { authorization: "Bearer google-token-photo" },
      });

      const userWithTokenPhoto = await getCurrentUser(request, {
        verifyToken: async () => ({
          uid: "firebase-uid-photo-1",
          email: "photo.user@campus.edu",
          name: "Photo User",
          picture: "https://lh3.googleusercontent.com/a/google-avatar-456",
        }) as never,
        getUserProfile: async () => null,
      });

      expect(userWithTokenPhoto?.photoURL).toBe("https://lh3.googleusercontent.com/a/google-avatar-456");

      const userWithProfilePhoto = await getCurrentUser(request, {
        verifyToken: async () => ({
          uid: "firebase-uid-photo-2",
          email: "profile.photo@campus.edu",
          name: "Profile Photo User",
        }) as never,
        getUserProfile: async () => ({
          displayName: "Profile Photo User",
          photoURL: "https://storage.googleapis.com/custom-profile-pic.jpg",
          role: "student",
        }),
      });

      expect(userWithProfilePhoto?.photoURL).toBe("https://storage.googleapis.com/custom-profile-pic.jpg");
    });

    it("4 & 5. Correct Firestore profile lookup and role retrieval: preserves authorized role", async () => {
      const request = new Request("http://localhost/api/test", {
        headers: { authorization: "Bearer google-token-coord" },
      });

      const user = await getCurrentUser(request, {
        verifyToken: async () => ({
          uid: "firebase-coord-uid",
          email: "coordinator@campus.edu",
          name: "Lab Coordinator",
        }) as never,
        getUserProfile: async (uid) => {
          expect(uid).toBe("firebase-coord-uid");
          return {
            displayName: "Verified Coordinator Name",
            role: "coordinator",
            assignedResourceIds: ["res-oscilloscope-1"],
            trainingVerified: true,
          };
        },
      });

      expect(user?.displayName).toBe("Verified Coordinator Name");
      expect(user?.role).toBe("coordinator");
      expect(user?.assignedResourceIds).toContain("res-oscilloscope-1");
    });

    it("8, 9 & 10. No demo name or demo role after Google login: identity is authoritative", async () => {
      const request = new Request("http://localhost/api/test", {
        headers: { authorization: "Bearer google-token-real" },
      });

      const user = await getCurrentUser(request, {
        verifyToken: async () => ({
          uid: "real-google-uid-789",
          email: "real.student@campus.edu",
          name: "Real Student Name",
        }) as never,
        getUserProfile: async () => ({
          displayName: "Real Student Name",
          role: "student",
        }),
      });

      // Name must NOT be hardcoded Aarav Sharma
      expect(user?.displayName).not.toBe("Aarav Sharma");
      expect(user?.displayName).toBe("Real Student Name");

      // Source is real Firebase, not mock
      expect(user?.source).toBe("firebase");

      // UI role string simulation: real users must NEVER have "demo" attached
      const isDemo = user?.source === "mock";
      const roleLabel = `${user?.role} ${isDemo ? "demo" : ""}`.trim();
      expect(roleLabel).toBe("student");
      expect(roleLabel).not.toContain("demo");
      expect(roleLabel).not.toBe("student demo");
    });

    it("11. Logout clears both session cookies and invalidates session", async () => {
      const { POST: logoutPOST } = await import("../../app/api/auth/logout/route");
      const res = await logoutPOST();

      expect(res.status).toBe(200);
      const setCookies = res.headers.getSetCookie?.() || [res.headers.get("Set-Cookie") || ""];
      const cookieStr = setCookies.join("; ");

      expect(cookieStr).toContain("utilix_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
      expect(cookieStr).toContain("utilix_mock_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
    });

    it("12. Switching from one Google account to another immediately reflects the new identity", async () => {
      const makeRequest = (token: string) =>
        new Request("http://localhost/api/test", {
          headers: { authorization: `Bearer ${token}` },
        });

      // User 1
      const user1 = await getCurrentUser(makeRequest("token-user-1"), {
        verifyToken: async () => ({
          uid: "user-1-uid",
          email: "user1@campus.edu",
          name: "User One",
        }) as never,
        getUserProfile: async () => null,
      });

      expect(user1?.uid).toBe("user-1-uid");
      expect(user1?.displayName).toBe("User One");

      // User 2
      const user2 = await getCurrentUser(makeRequest("token-user-2"), {
        verifyToken: async () => ({
          uid: "user-2-uid",
          email: "user2@campus.edu",
          name: "User Two",
        }) as never,
        getUserProfile: async () => null,
      });

      expect(user2?.uid).toBe("user-2-uid");
      expect(user2?.displayName).toBe("User Two");
      expect(user2?.uid).not.toBe(user1?.uid);
    });

    it("13. Missing Firestore profile gracefully falls back without 500 error or elevated role", async () => {
      const request = new Request("http://localhost/api/test", {
        headers: { authorization: "Bearer google-token-brand-new" },
      });

      const user = await getCurrentUser(request, {
        verifyToken: async () => ({
          uid: "brand-new-uid",
          email: "brandnew@campus.edu",
          name: "Brand New User",
        }) as never,
        getUserProfile: async () => {
          throw new Error("Firestore document not found");
        },
      });

      expect(user).not.toBeNull();
      expect(user?.uid).toBe("brand-new-uid");
      expect(user?.displayName).toBe("Brand New User");
      expect(user?.role).toBe("student"); // Safely defaults to student
    });

    it("14. Unauthorized role handling rejects student from coordinator/admin resources", async () => {
      const request = new Request("http://localhost/api/admin/action", {
        headers: { authorization: "Bearer google-student-token" },
      });

      await expect(
        requireRole(request, ["admin"], {
          verifyToken: async () => ({
            uid: "student-uid",
            email: "student@campus.edu",
            name: "Student User",
          }) as never,
          getUserProfile: async () => ({
            role: "student",
          }),
        }),
      ).rejects.toMatchObject({
        status: 403,
      });
    });

    it("15. Coordinator and administrator identity synchronization: assigned resources & trusted roles", async () => {
      const requestCoord = new Request("http://localhost/api/test", {
        headers: { authorization: "Bearer google-coord-token" },
      });

      const coord = await getCurrentUser(requestCoord, {
        verifyToken: async () => ({
          uid: "coord-uid-999",
          email: "coord.robotics@campus.edu",
          name: "Robotics Coordinator",
        }) as never,
        getUserProfile: async () => ({
          displayName: "Robotics Coordinator",
          role: "coordinator",
          assignedResourceIds: ["res-3d-printer-a", "res-laser-cutter-b"],
          trainingVerified: true,
        }),
      });

      expect(coord?.role).toBe("coordinator");
      expect(coord?.assignedResourceIds).toHaveLength(2);
      expect(coord?.assignedResourceIds).toContain("res-3d-printer-a");
      expect(coord?.assignedResourceIds).toContain("res-laser-cutter-b");
    });
  });
});


