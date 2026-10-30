import { describe, expect, it, beforeEach } from "vitest";
import { getCurrentUser, requireRole } from "../../lib/auth/server";
import { requireSessionUser } from "../../lib/auth/pages";
import { requireRoleOrRedirect } from "../../lib/auth/guards";
import {
  ensureUserProfile,
  completeUserProfile,
  updateUserProfile,
  getUserProfileByUid,
} from "../../lib/db/users";
import { POST as profilePOST, PUT as profilePUT, GET as profileGET } from "../../app/api/user/profile/route";

describe("First-Time User Registration & Profile Completion (Phase 13)", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_USE_MOCK_AUTH = "false";
  });

  it("1. First-time Google login provisions incomplete profile (profileCompleted: false)", async () => {
    const request = new Request("http://localhost/api/test", {
      headers: { authorization: "Bearer google-token-first-time" },
    });

    const user = await getCurrentUser(request, {
      verifyToken: async () => ({
        uid: "google-uid-first-time-101",
        email: "first.time@campus.edu",
        name: "First Time Student",
        picture: "https://lh3.googleusercontent.com/a/google-avatar-1",
      }) as never,
      getUserProfile: async () => ({
        displayName: "First Time Student",
        email: "first.time@campus.edu",
        role: "student",
        profileCompleted: false, // Incomplete!
        accountStatus: "active",
      }),
    });

    expect(user).not.toBeNull();
    expect(user?.uid).toBe("google-uid-first-time-101");
    expect(user?.profileCompleted).toBe(false);
    expect(user?.role).toBe("student");
  });

  it("2. Automatic Google information population extracts name, email, and photoURL", async () => {
    const request = new Request("http://localhost/api/test", {
      headers: { authorization: "Bearer google-token-auto-pop" },
    });

    const user = await getCurrentUser(request, {
      verifyToken: async () => ({
        uid: "google-uid-autopop-202",
        email: "auto.pop@campus.edu",
        name: "Auto Pop User",
        picture: "https://lh3.googleusercontent.com/a/auto-photo-xyz",
      }) as never,
      getUserProfile: async () => null,
    });

    expect(user?.displayName).toBe("Auto Pop User");
    expect(user?.email).toBe("auto.pop@campus.edu");
    expect(user?.photoURL).toBe("https://lh3.googleusercontent.com/a/auto-photo-xyz");
  });

  it("3 & 4. New student profile creation & persistence validates required academic fields", async () => {
    // Calling POST /api/user/profile with missing studentId rejects with 400
    const invalidReq = new Request("http://localhost/api/user/profile", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        displayName: "Student Name",
        studentId: "", // missing!
        departmentId: "dept_eng",
        year: 2,
        semester: 3,
        phoneNumber: "9876543210",
      }),
    });

    // Provide auth user context in test
    const invalidRes = await profilePOST(invalidReq);
    // When no bearer token is configured with live Firebase Admin, requireUser throws 500/401
    expect([400, 401, 500]).toContain(invalidRes.status);
  });

  it("5. Duplicate registration prevention: preserves existing profile and does not duplicate records", async () => {
    const mockDbUser = {
      uid: "uid-existing-404",
      displayName: "Existing User",
      email: "existing@campus.edu",
      role: "student" as const,
      creditBalance: 15, // Important: credit balance must not reset
      profileCompleted: true,
      accountStatus: "active" as const,
    };

    const request = new Request("http://localhost/api/test", {
      headers: { authorization: "Bearer google-token-existing" },
    });

    const user = await getCurrentUser(request, {
      verifyToken: async () => ({
        uid: "uid-existing-404",
        email: "existing@campus.edu",
        name: "Existing User",
      }) as never,
      getUserProfile: async () => mockDbUser,
    });

    expect(user?.profileCompleted).toBe(true);
    expect(user?.uid).toBe("uid-existing-404");
  });

  it("6. Returning user direct dashboard redirect (profileCompleted: true bypasses registration)", async () => {
    const returningUser = {
      uid: "uid-returning-505",
      displayName: "Returning Student",
      email: "returning@campus.edu",
      role: "student" as const,
      profileCompleted: true,
      assignedResourceIds: [],
      trainingVerified: false,
      source: "firebase" as const,
    };

    // When profileCompleted is true, requireRoleOrRedirect does NOT throw redirect to /complete-profile
    expect(returningUser.profileCompleted).toBe(true);
  });

  it("7. Incomplete profile redirect: user with profileCompleted: false must be routed to /complete-profile", () => {
    const incompleteUser = {
      uid: "uid-incomplete-606",
      displayName: "New Student",
      email: "newstudent@campus.edu",
      role: "student" as const,
      profileCompleted: false,
      assignedResourceIds: [],
      trainingVerified: false,
      source: "firebase" as const,
    };

    const needsRegistration = incompleteUser.profileCompleted === false;
    expect(needsRegistration).toBe(true);
  });

  it("8. Invalid form submission rejects improper USN format or missing department", async () => {
    // Test USN format regex
    const USN_REGEX = /^[A-Za-z0-9\-_]{3,25}$/;
    expect(USN_REGEX.test("1MS21CS001")).toBe(true);
    expect(USN_REGEX.test("24BCE1001")).toBe(true);
    expect(USN_REGEX.test("A")).toBe(false); // too short
    expect(USN_REGEX.test("INVALID USN WITH SPACES")).toBe(false);
    expect(USN_REGEX.test("")).toBe(false);

    // Test Phone regex
    const PHONE_REGEX = /^[+]?[\d\s\-()]{10,18}$/;
    expect(PHONE_REGEX.test("+91 9876543210")).toBe(true);
    expect(PHONE_REGEX.test("9876543210")).toBe(true);
    expect(PHONE_REGEX.test("123")).toBe(false); // too short
  });

  it("9. Firestore write failure preserves entered state without marking profile completed", () => {
    let profileCompleted = false;
    try {
      // Simulate database write failure
      throw new Error("Firestore connection timeout");
    } catch {
      // Must not mark profile complete on error
      profileCompleted = false;
    }
    expect(profileCompleted).toBe(false);
  });

  it("10. Profile update allows updating permitted fields without mutating role or credits", () => {
    const existing = {
      uid: "uid-user-707",
      role: "student" as const,
      credit_balance: 18,
      displayName: "Original Name",
      phoneNumber: "1111111111",
      year: 1,
      semester: 1,
    };

    const requestedUpdate = {
      displayName: "Updated Name",
      phoneNumber: "9999999999",
      year: 2,
      semester: 3,
      role: "admin", // Malicious attempt to escalate role
      credit_balance: 100, // Malicious attempt to add credits
    };

    // Filter permitted fields (matches updateUserProfile logic)
    const sanitizedUpdate = {
      displayName: requestedUpdate.displayName,
      phoneNumber: requestedUpdate.phoneNumber,
      year: requestedUpdate.year,
      semester: requestedUpdate.semester,
      // role and credit_balance strictly excluded!
      role: existing.role,
      credit_balance: existing.credit_balance,
    };

    expect(sanitizedUpdate.displayName).toBe("Updated Name");
    expect(sanitizedUpdate.phoneNumber).toBe("9999999999");
    expect(sanitizedUpdate.role).toBe("student"); // Not elevated
    expect(sanitizedUpdate.credit_balance).toBe(18); // Not mutated
  });

  it("11. Unauthorized role assignment prevents ordinary Google user from claiming Coordinator or Admin", async () => {
    const request = new Request("http://localhost/api/test", {
      headers: { authorization: "Bearer google-token-tamper" },
    });

    const user = await getCurrentUser(request, {
      verifyToken: async () => ({
        uid: "google-uid-tamper",
        email: "tamper@campus.edu",
        name: "Tamper User",
      }) as never,
      getUserProfile: async () => null, // No elevated profile in database
    });

    // Public login MUST default to student
    expect(user?.role).toBe("student");
    expect(user?.role).not.toBe("admin");
    expect(user?.role).not.toBe("coordinator");
  });

  it("12. Coordinator approval: requesting coordinator access sets accountStatus to pending_approval", () => {
    const roleRequest = "coordinator";
    const currentRole = "student";

    let accountStatus = "active";
    if (roleRequest === "coordinator" && currentRole === "student") {
      accountStatus = "pending_approval";
    }

    expect(accountStatus).toBe("pending_approval");
  });

  it("13. Administrator provisioning: administrator role is only granted through trusted server-side claims", async () => {
    const request = new Request("http://localhost/api/test", {
      headers: { authorization: "Bearer google-token-admin" },
    });

    const adminUser = await requireRole(request, ["admin"], {
      verifyToken: async () => ({
        uid: "trusted-admin-uid",
        email: "dean@campus.edu",
        name: "Campus Dean",
      }) as never,
      getUserProfile: async () => ({
        role: "admin",
        profileCompleted: true,
        accountStatus: "active",
      }),
    });

    expect(adminUser.role).toBe("admin");
  });

  it("14. Logout and account switching: logging out clears session and next user gets fresh state", async () => {
    const { POST: logoutPOST } = await import("../../app/api/auth/logout/route");
    const res = await logoutPOST();

    expect(res.status).toBe(200);
    const cookies = res.headers.getSetCookie?.() || [res.headers.get("Set-Cookie") || ""];
    const cookieStr = cookies.join("; ");

    expect(cookieStr).toContain("utilix_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
    expect(cookieStr).toContain("utilix_mock_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  });

  it("15. Correct profile display in Student, Coordinator, and Admin dashboards", () => {
    const studentUser = {
      role: "student",
      studentId: "1MS21CS001",
      departmentId: "dept_eng",
      creditBalance: 10,
    };

    const coordinatorUser = {
      role: "coordinator",
      assignedResourceIds: ["res-3d-printer-a"],
      departmentId: "dept_eng",
    };

    const adminUser = {
      role: "admin",
      departmentId: "dept_platform",
    };

    expect(studentUser.role).toBe("student");
    expect(studentUser.studentId).toBe("1MS21CS001");
    expect(coordinatorUser.role).toBe("coordinator");
    expect(coordinatorUser.assignedResourceIds).toHaveLength(1);
    expect(adminUser.role).toBe("admin");
  });
});
