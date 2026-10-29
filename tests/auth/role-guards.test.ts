import { describe, expect, it } from "vitest";
import { AuthError, canAccessResource, extractBearerToken, requireRole, requireUser } from "../../lib/auth/server";
import { MOCK_ACCOUNTS, assertMockAuthAllowed, parseMockSession, serializeMockSession } from "../../lib/auth/mock";

describe("auth server guards", () => {
  it("extracts bearer token", () => {
    expect(extractBearerToken("Bearer abc.def")).toBe("abc.def");
    expect(extractBearerToken("Basic nope")).toBeNull();
  });

  it("rejects expired mock session", () => {
    const now = Date.now();
    const session = serializeMockSession("mock-student-1", now - 9 * 60 * 60 * 1000);
    expect(() => parseMockSession(session, now)).toThrow();
  });

  it("allows coordinator only on assigned resource", () => {
    const coordinator = {
      ...MOCK_ACCOUNTS[1],
      source: "mock" as const,
    };
    expect(canAccessResource(coordinator, "res-arduino-kit-a")).toBe(true);
    expect(canAccessResource(coordinator, "res-unassigned")).toBe(false);
  });

  it("rejects disallowed roles", async () => {
    const request = new Request("http://localhost/test", {
      headers: {
        authorization: "Bearer ok",
      },
    });

    await expect(
      requireRole(request, ["admin"], {
        verifyToken: async () => ({ uid: "u1", email: "student@example.com" }) as never,
      }),
    ).rejects.toBeInstanceOf(AuthError);
  });

  it("rejects missing authorization", async () => {
    await expect(requireUser(new Request("http://localhost/test"))).rejects.toMatchObject({
      status: 401,
    });
  });

  it("rejects expired token", async () => {
    const request = new Request("http://localhost/test", {
      headers: { authorization: "Bearer expired-token" },
    });

    await expect(
      requireUser(request, {
        verifyToken: async () => {
          throw new Error("token expired");
        },
      }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("rejects mock mode in production", () => {
    const oldMode = process.env.NODE_ENV;
    const oldMock = process.env.NEXT_PUBLIC_USE_MOCK_AUTH;
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_USE_MOCK_AUTH = "true";
    expect(() => assertMockAuthAllowed()).toThrow();
    process.env.NODE_ENV = oldMode;
    process.env.NEXT_PUBLIC_USE_MOCK_AUTH = oldMock;
  });
});
