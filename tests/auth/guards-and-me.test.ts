import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { requireRoleOrThrow, AuthError } from "@/lib/auth/guards";
import { getCurrentUser, canAccessResource } from "@/lib/auth/server";
import { serializeMockSession } from "@/lib/auth/mock";
import { DEMO_ACCOUNTS, findDemoAccountByCredentials } from "@/lib/auth/demo-accounts";
import { GET as meRoute } from "@/app/api/me/route";
import { getWorkflowCaller } from "@/app/(workflow)/_lib/auth";

describe("Phase 1 — One Identity, Secure Guards & /api/me", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_USE_MOCK_AUTH = "true";
    process.env.USE_MOCK_DATA = "true";
  });

  describe("Canonical Demo Accounts", () => {
    it("has exact required seed demo accounts", () => {
      expect(DEMO_ACCOUNTS).toHaveLength(3);
      const student = findDemoAccountByCredentials("student01@utilix.local", "UtilixPassword2026!");
      expect(student).not.toBeNull();
      expect(student?.role).toBe("student");

      const coord = findDemoAccountByCredentials("coord-lab@utilix.local", "UtilixPassword2026!");
      expect(coord).not.toBeNull();
      expect(coord?.role).toBe("coordinator");
      expect(coord?.assignedResourceIds).toContain("resource-arduino-kit-a");

      const admin = findDemoAccountByCredentials("admin-platform@utilix.local", "UtilixPassword2026!");
      expect(admin).not.toBeNull();
      expect(admin?.role).toBe("admin");
    });
  });

  describe("Role Guards (requireRoleOrThrow)", () => {
    it("throws 401 when signed out", async () => {
      const request = new NextRequest("http://localhost:3000/api/dashboard/admin/export");
      await expect(requireRoleOrThrow(["admin"], request)).rejects.toMatchObject({
        status: 401,
      });
    });

    it("throws 403 when student attempts to access coordinator or admin endpoints", async () => {
      const cookie = `utilix_mock_session=${serializeMockSession("student-01")}`;
      const request = new NextRequest("http://localhost:3000/api/dashboard/admin/export", {
        headers: { cookie },
      });

      await expect(requireRoleOrThrow(["admin"], request)).rejects.toMatchObject({
        status: 403,
      });
      await expect(requireRoleOrThrow(["coordinator", "admin"], request)).rejects.toMatchObject({
        status: 403,
      });
    });

    it("allows admin on admin guard", async () => {
      const cookie = `utilix_mock_session=${serializeMockSession("admin-01")}`;
      const request = new NextRequest("http://localhost:3000/api/dashboard/admin/export", {
        headers: { cookie },
      });

      const user = await requireRoleOrThrow(["admin"], request);
      expect(user.role).toBe("admin");
      expect(user.uid).toBe("admin-01");
    });

    it("allows coordinator on coordinator/admin guard", async () => {
      const cookie = `utilix_mock_session=${serializeMockSession("coordinator-01")}`;
      const request = new NextRequest("http://localhost:3000/dashboard/coordinator", {
        headers: { cookie },
      });

      const user = await requireRoleOrThrow(["coordinator", "admin"], request);
      expect(user.role).toBe("coordinator");
      expect(user.uid).toBe("coordinator-01");
    });
  });

  describe("Coordinator Scoping", () => {
    it("permits coordinator only on assigned resources and forbids unassigned", async () => {
      const cookie = `utilix_mock_session=${serializeMockSession("coordinator-01")}`;
      const request = new NextRequest("http://localhost:3000/api/test", { headers: { cookie } });
      const coordUser = await getCurrentUser(request);
      expect(coordUser).not.toBeNull();

      if (coordUser) {
        expect(canAccessResource(coordUser, "resource-arduino-kit-a")).toBe(true);
        expect(canAccessResource(coordUser, "unassigned-resource-xyz")).toBe(false);
      }
    });

    it("allows admin unrestricted access across all resources", async () => {
      const cookie = `utilix_mock_session=${serializeMockSession("admin-01")}`;
      const request = new NextRequest("http://localhost:3000/api/test", { headers: { cookie } });
      const adminUser = await getCurrentUser(request);
      expect(adminUser).not.toBeNull();

      if (adminUser) {
        expect(canAccessResource(adminUser, "resource-arduino-kit-a")).toBe(true);
        expect(canAccessResource(adminUser, "any-arbitrary-resource")).toBe(true);
      }
    });
  });

  describe("Workflow Caller with Cookie Session", () => {
    it("extracts authenticated user and displayName name property using cookie session", async () => {
      const cookie = `utilix_mock_session=${serializeMockSession("student-01")}`;
      const request = new NextRequest("http://localhost:3000/api/workflow/requests", {
        headers: { cookie },
      });

      const caller = await getWorkflowCaller(request, ["student"]);
      expect(caller.uid).toBe("student-01");
      expect(caller.role).toBe("student");
      expect(caller.name).toBe("Student 01");
    });

    it("rejects unauthorized role in workflow caller", async () => {
      const cookie = `utilix_mock_session=${serializeMockSession("student-01")}`;
      const request = new NextRequest("http://localhost:3000/api/workflow/checkout", {
        headers: { cookie },
      });

      await expect(getWorkflowCaller(request, ["coordinator", "admin"])).rejects.toMatchObject({
        status: 403,
      });
    });
  });

  describe("GET /api/me Endpoint", () => {
    it("returns 401 when no session cookie is present", async () => {
      const request = new NextRequest("http://localhost:3000/api/me");
      const res = await meRoute(request);
      expect(res.status).toBe(401);
    });

    it("returns profile, department, year, credit_balance, reliability, and notifications", async () => {
      const cookie = `utilix_mock_session=${serializeMockSession("student-01")}`;
      const request = new NextRequest("http://localhost:3000/api/me", {
        headers: { cookie },
      });

      const res = await meRoute(request);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.user).toBeDefined();
      expect(json.user.uid).toBe("student-01");
      expect(json.user.role).toBe("student");
      expect(json.user.department_id).toBeDefined();
      expect(typeof json.user.credit_balance).toBe("number");
      expect(typeof json.user.free_sessions_left).toBe("number");
      expect(typeof json.user.reliability).toBe("number");
      expect(typeof json.user.unread_notification_count).toBe("number");
    });
  });
});
