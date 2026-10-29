import { describe, expect, it } from "vitest";
import { POST as allocateRoute } from "../../../app/api/ai/allocate/route.js";
import { GET as healthRoute } from "../../../app/api/ai/health/route.js";

describe("Route tests (App Router handler tests)", () => {
  it("GET /api/ai/health returns 200 with fallbackOnly true when unconfigured", async () => {
    const req = new Request("http://localhost:3000/api/ai/health", { method: "GET" });
    const res = await healthRoute(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.fallbackOnly).toBe(true);
    expect(data).not.toHaveProperty("apiKey");
  });

  it("POST /api/ai/allocate returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost:3000/api/ai/allocate", {
      method: "POST",
      body: "this is not json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await allocateRoute(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /api/ai/allocate returns 400 when required fields are missing", async () => {
    const req = new Request("http://localhost:3000/api/ai/allocate", {
      method: "POST",
      body: JSON.stringify({ invalidField: 123 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await allocateRoute(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /api/ai/allocate returns 200 and standard envelope for valid payload", async () => {
    const payload = {
      slot: {
        id: "slot-route-test",
        resourceId: "printer-route-test",
        resourceName: "Route Test Printer",
        resourceType: "3d-printer",
        startsAt: "2026-11-01T10:00:00Z",
        endsAt: "2026-11-01T12:00:00Z",
        slotType: "free",
        creditCost: 0,
        capacity: 1,
        restricted: false,
      },
      mode: "new_requests",
      requests: [
        {
          requestId: "req-route-1",
          requestedAt: "2026-10-29T10:00:00Z",
          sessionsLast30d: 0,
          sessionsThisMonth: 0,
          waitingHours: 1,
          deadlineDays: null,
          departmentsInTeam: 1,
          creditsAvailable: 5,
          freeSessionsLeft: 1,
          constraints: {
            trainingOk: true,
            withinBookingLimit: true,
            resourceAvailable: true,
            noOverlap: true,
          },
        },
      ],
    };

    const req = new Request("http://localhost:3000/api/ai/allocate", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });

    const res = await allocateRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.source).toBe("fallback");
    expect(body.data.ranking.length).toBe(1);
    expect(body.data.ranking[0].decision).toBe("allocated");
    expect(body.meta).toHaveProperty("latencyMs");
    expect(body.meta).toHaveProperty("policyVersion");
  });
});
