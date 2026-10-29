import { describe, it, expect, beforeEach } from "vitest";
import { validateBookingForm, timeToMinutes } from "@/app/(workflow)/_lib/validation";
import { MockWorkflowAdapter } from "@/app/(workflow)/_lib/workflow-adapter";
import { MockAIClient } from "@/lib/ai-client";
import type { Resource, BookingFormData, AuthUser } from "@/app/(workflow)/_lib/types";
import { NextRequest } from "next/server";
import { GET as getResourcesRoute } from "@/app/api/workflow/resources/route";
import { GET as getSlotsRoute } from "@/app/api/workflow/resources/[id]/slots/route";
import { POST as createRequestRoute } from "@/app/api/workflow/requests/route";
import { GET as getRequestByIdRoute } from "@/app/api/workflow/requests/[id]/route";
import { POST as cancelRequestRoute } from "@/app/api/workflow/requests/[id]/cancel/route";
import { canTransition, assertTransition, InvalidTransitionError } from "@/lib/types/status";

// Force mock mode for unit tests
process.env.USE_MOCK_DATA = "true";

describe("Workflow — Form Validation & Time Utilities", () => {
  it("converts HH:mm strings to minutes correctly", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("09:30")).toBe(570);
    expect(timeToMinutes("14:15")).toBe(855);
    expect(timeToMinutes("23:59")).toBe(1439);
    expect(Number.isNaN(timeToMinutes("invalid"))).toBe(true);
    expect(Number.isNaN(timeToMinutes("25:00"))).toBe(true);
    expect(Number.isNaN(timeToMinutes("12:60"))).toBe(true);
  });

  const sampleResource: Resource = {
    id: "res_printer1",
    name: "Prusa i3 MK4S #1",
    type: "printer_3d",
    department_id: "dept_eng",
    coordinator_id: "user_carol",
    location: "Fab Lab Room 101",
    photo_url: null,
    restricted: false,
    requires_training: null,
    credit_cost: 2,
    max_session_minutes: 120,
    status: "available",
    last_inspection_at: null,
  };

  it("validates valid booking submissions successfully", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];

    const validData: BookingFormData = {
      resourceId: "res_printer1",
      date: dateStr,
      startTime: "10:00",
      endTime: "11:30",
      purpose: "Printing enclosure for capstone sensor array",
      notes: "PLA material",
    };

    const result = validateBookingForm(validData, sampleResource);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects booking dates in the past", () => {
    const pastData: BookingFormData = {
      resourceId: "res_printer1",
      date: "2020-01-01",
      startTime: "10:00",
      endTime: "11:00",
      purpose: "Valid purpose",
      notes: "",
    };
    const result = validateBookingForm(pastData, sampleResource);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "date")).toBe(true);
  });

  it("rejects reversed time ranges (end <= start)", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];

    const invalidTimes: BookingFormData = {
      resourceId: "res_printer1",
      date: dateStr,
      startTime: "14:00",
      endTime: "13:00",
      purpose: "Valid purpose",
      notes: "",
    };
    const result = validateBookingForm(invalidTimes, sampleResource);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "endTime")).toBe(true);
  });

  it("enforces minimum booking duration (30 mins)", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];

    const shortDuration: BookingFormData = {
      resourceId: "res_printer1",
      date: dateStr,
      startTime: "10:00",
      endTime: "10:15",
      purpose: "Valid purpose",
      notes: "",
    };
    const result = validateBookingForm(shortDuration, sampleResource);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("Minimum booking duration"))).toBe(true);
  });

  it("enforces maximum session minutes from resource configuration", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];

    const longDuration: BookingFormData = {
      resourceId: "res_printer1",
      date: dateStr,
      startTime: "10:00",
      endTime: "14:00", // 240 mins > 120 mins
      purpose: "Valid purpose",
      notes: "",
    };
    const result = validateBookingForm(longDuration, sampleResource);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("Maximum booking duration"))).toBe(true);
  });

  it("rejects unavailable resources (maintenance or retired)", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];

    const maintResource: Resource = {
      ...sampleResource,
      status: "maintenance",
    };
    const data: BookingFormData = {
      resourceId: "res_printer1",
      date: dateStr,
      startTime: "10:00",
      endTime: "11:00",
      purpose: "Valid purpose",
      notes: "",
    };
    const result = validateBookingForm(data, maintResource);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "resourceId")).toBe(true);
  });
});

describe("Workflow — Mock Adapter Operations", () => {
  let adapter: MockWorkflowAdapter;
  const mockUser: AuthUser = {
    uid: "user_alice",
    name: "Alice Chen",
    email: "alice@university.edu",
    role: "student",
  };

  beforeEach(() => {
    adapter = new MockWorkflowAdapter();
  });

  it("lists resources with optional type, department, and search filters", async () => {
    const all = await adapter.listResources();
    expect(all.length).toBeGreaterThanOrEqual(3);

    const studios = await adapter.listResources({ category: "studio" });
    expect(studios.every((r) => r.type === "studio")).toBe(true);

    const engResources = await adapter.listResources({ department: "dept_eng" });
    expect(engResources.every((r) => r.department_id === "dept_eng")).toBe(true);

    const search = await adapter.listResources({ search: "Prusa" });
    expect(search.length).toBeGreaterThan(0);
    expect(search[0].name).toContain("Prusa");
  });

  it("generates slots for a date and resource", async () => {
    const slots = await adapter.getResourceSlots("res_printer1", "2026-11-01");
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].resourceId).toBe("res_printer1");
    expect(slots[0].date).toBe("2026-11-01");
  });

  it("creates, retrieves, and cancels booking requests", async () => {
    const createRes = await adapter.createRequest(
      {
        resourceId: "res_printer1",
        date: "2026-11-05",
        startTime: "10:00",
        endTime: "11:00",
        purpose: "Capstone component 3D print",
        notes: "Notes",
      },
      mockUser,
    );

    expect(createRes.booking.id).toMatch(/^bk_mock_/);
    expect(createRes.booking.resource_id).toBe("res_printer1");
    expect(createRes.booking.user_id).toBe("user_alice");
    expect(createRes.booking.policy_version).toBeDefined();

    const fetched = await adapter.getRequest(createRes.booking.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(createRes.booking.id);

    const cancelRes = await adapter.cancelRequest(createRes.booking.id, mockUser, "Schedule change");
    expect(cancelRes.booking.status).toBe("cancelled");
    expect(cancelRes.credits_refunded).toBe(createRes.booking.cost_credits);
  });
});

describe("Workflow — AI Client Contract & Fallback", () => {
  it("provides deterministic allocation and fallback when service is offline", async () => {
    const ai = new MockAIClient();

    const health = await ai.healthCheck();
    expect(health.ok).toBe(true);

    const slot = {
      id: "slot_001",
      resourceId: "res_printer1",
      resourceName: "Prusa i3 MK4S #1",
      department: "dept_eng",
      startTime: "2026-10-30T10:00:00Z",
      endTime: "2026-10-30T11:00:00Z",
    };

    const allocResult = await ai.allocate({
      slot,
      requests: [
        {
          id: "req_1",
          userId: "user_alice",
          department: "dept_eng",
          requestedSlotId: "slot_001",
          sessionsThisMonth: 1,
          waitingHours: 4,
          projectNeedScore: 8.5,
          isPriorityGroup: true,
          trainingVerified: true,
          withinBookingLimit: true,
          noOverlap: true,
          resourceAvailable: true,
          currentCreditBalance: 10,
          freeSessionsLeft: 2,
          submittedAt: "2026-10-28T10:00:00Z",
        },
        {
          id: "req_2",
          userId: "user_bob",
          department: "dept_design",
          requestedSlotId: "slot_001",
          sessionsThisMonth: 5,
          waitingHours: 1,
          projectNeedScore: 5.0,
          isPriorityGroup: false,
          trainingVerified: true,
          withinBookingLimit: true,
          noOverlap: true,
          resourceAvailable: true,
          currentCreditBalance: 10,
          freeSessionsLeft: 0,
          submittedAt: "2026-10-29T10:00:00Z",
        },
      ],
    });

    expect(allocResult.allocated[0].requestId).toBe("req_1");
    expect(allocResult.waitlist[0].requestId).toBe("req_2");
    expect(allocResult.allocated[0].studentReason).toBeDefined();

    const alts = await ai.getAlternatives({
      requestedSlot: slot,
      availableSlots: [
        {
          id: "slot_002",
          resourceId: "res_studio_a",
          resourceName: "Recording Studio A",
          department: "dept_design",
          startTime: "2026-10-30T14:00:00Z",
          endTime: "2026-10-30T15:00:00Z",
        },
      ],
      userRequest: {
        id: "req_2",
        userId: "user_bob",
        department: "dept_design",
        requestedSlotId: "slot_001",
        submittedAt: "2026-10-29T10:00:00Z",
      },
    });
    expect(alts.alternatives.length).toBeGreaterThan(0);
    expect(alts.alternatives[0].reason).toBeDefined();
  });
});

describe("Workflow — State Machine Status Transitions", () => {
  it("validates booking transition rules", () => {
    expect(canTransition("submitted", "eligibility_passed")).toBe(true);
    expect(canTransition("submitted", "cancelled")).toBe(false);
    expect(canTransition("allocated", "cancelled")).toBe(true);
    expect(canTransition("confirmed", "checked_out")).toBe(true);
    expect(canTransition("confirmed", "cancelled")).toBe(true);
    expect(canTransition("checked_out", "returned")).toBe(true);

    expect(canTransition("cancelled", "confirmed")).toBe(false);
    expect(canTransition("returned", "checked_out")).toBe(false);

    expect(() => assertTransition("cancelled", "confirmed")).toThrow(InvalidTransitionError);
  });
});

describe("Workflow — API Routes Integration", () => {
  beforeEach(() => {
    process.env.USE_MOCK_DATA = "true";
  });

  it("GET /api/workflow/resources returns resources list", async () => {
    const req = new NextRequest("http://localhost:3000/api/workflow/resources");
    const res = await getResourcesRoute(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(3);
  });

  it("GET /api/workflow/resources/[id]/slots validates date parameter", async () => {
    const badReq = new NextRequest("http://localhost:3000/api/workflow/resources/res_printer1/slots?date=bad-date");
    const badRes = await getSlotsRoute(badReq, { params: Promise.resolve({ id: "res_printer1" }) });
    expect(badRes.status).toBe(400);

    const goodReq = new NextRequest("http://localhost:3000/api/workflow/resources/res_printer1/slots?date=2026-11-01");
    const goodRes = await getSlotsRoute(goodReq, { params: Promise.resolve({ id: "res_printer1" }) });
    const goodJson = await goodRes.json();
    expect(goodRes.status).toBe(200);
    expect(goodJson.data.slots.length).toBeGreaterThan(0);
  });

  it("POST /api/workflow/requests rejects invalid inputs with 400", async () => {
    const req = new NextRequest("http://localhost:3000/api/workflow/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceId: "res_printer1", purpose: "short" }),
    });
    const res = await createRequestRoute(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error.code).toBe("VALIDATION_FAILED");
  });

  it("POST /api/workflow/requests creates booking and cancels it via /cancel route", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const dateStr = tomorrow.toISOString().split("T")[0];

    const createReq = new NextRequest("http://localhost:3000/api/workflow/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resourceId: "res_printer1",
        date: dateStr,
        startTime: "10:00",
        endTime: "11:30",
        purpose: "Capstone testing prototype",
        notes: "Testing",
      }),
    });
    const createRes = await createRequestRoute(createReq);
    expect(createRes.status).toBe(201);
    const createJson = await createRes.json();
    expect(createJson.ok).toBe(true);
    const bookingId = createJson.data.booking.id;

    // GET /api/workflow/requests/[id]
    const getReq = new NextRequest(`http://localhost:3000/api/workflow/requests/${bookingId}`);
    const getRes = await getRequestByIdRoute(getReq, { params: Promise.resolve({ id: bookingId }) });
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json();
    expect(getJson.data.id).toBe(bookingId);

    // POST /api/workflow/requests/[id]/cancel
    const cancelReq = new NextRequest(`http://localhost:3000/api/workflow/requests/${bookingId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "No longer needed" }),
    });
    const cancelRes = await cancelRequestRoute(cancelReq, { params: Promise.resolve({ id: bookingId }) });
    expect(cancelRes.status).toBe(200);
    const cancelJson = await cancelRes.json();
    expect(cancelJson.data.booking.status).toBe("cancelled");
  });
});

describe("Scenario S1 — Direct Contention, Fair Allocation, Waitlist & Credits", () => {
  beforeEach(() => {
    process.env.USE_MOCK_DATA = "true";
  });

  it("executes Scenario S1 end-to-end: two teams compete for the same slot", async () => {
    const contestDate = "2026-11-20";
    const startTime = "14:00";
    const endTime = "15:30";
    const resourceId = "res_printer1";

    // Team 1 (Student Alice): Submits first request for the slot
    const req1 = new NextRequest("http://localhost:3000/api/workflow/requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mock-role": "student",
        "x-mock-uid": "student-01",
        "x-mock-name": "Alice Chen",
      },
      body: JSON.stringify({
        resourceId,
        date: contestDate,
        startTime,
        endTime,
        purpose: "Senior Capstone prototype housing",
        notes: "PETG material",
      }),
    });
    const res1 = await createRequestRoute(req1);
    expect(res1.status).toBe(201);
    const json1 = await res1.json();
    expect(json1.ok).toBe(true);
    expect(json1.data.waitlisted).toBe(false);
    expect(json1.data.booking.status).toBe("confirmed");
    expect(json1.data.booking.cost_credits).toBe(2);
    const firstBookingId = json1.data.booking.id;

    // Team 2 (Student Bob): Submits competing request for the EXACT SAME exclusive slot
    const req2 = new NextRequest("http://localhost:3000/api/workflow/requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mock-role": "student",
        "x-mock-uid": "student-02",
        "x-mock-name": "Bob Smith",
      },
      body: JSON.stringify({
        resourceId,
        date: contestDate,
        startTime,
        endTime,
        purpose: "Robotics club sensor bracket",
        notes: "PLA material",
      }),
    });
    const res2 = await createRequestRoute(req2);
    expect(res2.status).toBe(201);
    const json2 = await res2.json();
    expect(json2.ok).toBe(true);

    // Contention Verification:
    // Only ONE booking holds the slot; the other is waitlisted!
    const coordHeader = { "x-mock-role": "coordinator" };
    const booking1After = await (await getRequestByIdRoute(
      new NextRequest(`http://localhost:3000/api/workflow/requests/${firstBookingId}`, { headers: coordHeader }),
      { params: Promise.resolve({ id: firstBookingId }) },
    )).json();

    const secondBookingId = json2.data.booking.id;
    const booking2After = await (await getRequestByIdRoute(
      new NextRequest(`http://localhost:3000/api/workflow/requests/${secondBookingId}`, { headers: coordHeader }),
      { params: Promise.resolve({ id: secondBookingId }) },
    )).json();

    const statuses = [booking1After.data.status, booking2After.data.status];
    expect(statuses).toContain("confirmed");
    expect(statuses).toContain("waitlisted");

    // The waitlisted request must not be charged credits (cost_credits === 0)
    const waitlistedBooking = booking1After.data.status === "waitlisted" ? booking1After.data : booking2After.data;
    const confirmedBooking = booking1After.data.status === "confirmed" ? booking1After.data : booking2After.data;

    expect(waitlistedBooking.cost_credits).toBe(0);
    expect(confirmedBooking.cost_credits).toBe(2);

    // Both requests must carry plain-language explanations
    expect(waitlistedBooking.decision_reason).toBeDefined();
    expect(waitlistedBooking.decision_reason.length).toBeGreaterThan(10);
    expect(confirmedBooking.decision_reason).toBeDefined();

    // Verify Decision Source labeling is deterministic fallback
    expect(["fallback", "ai"]).toContain(waitlistedBooking.decision_source);

    // ─── Phase 3 Verification: Cancellation & Automatic Waitlist Promotion ───
    // When the winner cancels, the slot must free up and automatically promote the waitlisted request!
    const cancelWinnerReq = new NextRequest(
      `http://localhost:3000/api/workflow/requests/${confirmedBooking.id}/cancel`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-mock-role": "student",
          "x-mock-uid": confirmedBooking.user_id,
        },
        body: JSON.stringify({ reason: "Finished project early" }),
      },
    );
    const cancelRes = await cancelRequestRoute(cancelWinnerReq, {
      params: Promise.resolve({ id: confirmedBooking.id }),
    });
    expect(cancelRes.status).toBe(200);
    const cancelJson = await cancelRes.json();
    expect(cancelJson.data.booking.status).toBe("cancelled");
    expect(cancelJson.data.credits_refunded).toBe(2);

    // Now inspect the previously waitlisted booking: it must be automatically promoted to confirmed!
    const promotedCheck = await (await getRequestByIdRoute(
      new NextRequest(`http://localhost:3000/api/workflow/requests/${waitlistedBooking.id}`, { headers: coordHeader }),
      { params: Promise.resolve({ id: waitlistedBooking.id }) },
    )).json();

    expect(promotedCheck.data.status).toBe("confirmed");
    expect(promotedCheck.data.cost_credits).toBe(2);
    expect(promotedCheck.data.decision_reason).toContain("Promoted from waitlist");
  });
});

describe("Workflow — Eligibility Checks & Policy Constraints", () => {
  beforeEach(() => {
    process.env.USE_MOCK_DATA = "true";
  });

  it("checks student eligibility via /api/workflow/eligibility route", async () => {
    const { GET: getEligibilityRoute } = await import("@/app/api/workflow/eligibility/route");
    const req = new NextRequest("http://localhost:3000/api/workflow/eligibility?resourceId=res_printer1");
    const res = await getEligibilityRoute(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.eligible).toBe(true);
    expect(json.checks.account_active).toBe(true);
    expect(json.checks.has_sufficient_credits).toBe(true);
  });
});

describe("Workflow — Coordinator Lifecycle & Security Invariants", () => {
  beforeEach(() => {
    process.env.USE_MOCK_DATA = "true";
  });

  it("completes full coordinator lifecycle: approve -> checkout -> checkin", async () => {
    const { POST: approveRoute } = await import("@/app/api/workflow/requests/[id]/approve/route");
    const { POST: checkoutRoute } = await import("@/app/api/workflow/checkout/route");
    const { POST: checkinRoute } = await import("@/app/api/workflow/checkin/route");

    // 1. Create a booking that requires approval (restricted studio/lab resource)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    const dateStr = tomorrow.toISOString().split("T")[0];

    const createReq = new NextRequest("http://localhost:3000/api/workflow/requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mock-role": "student",
        "x-mock-uid": "student-01",
      },
      body: JSON.stringify({
        resourceId: "res_studio_a",
        date: dateStr,
        startTime: "13:00",
        endTime: "14:00",
        purpose: "Senior film sound editing",
        notes: "Restricted studio session",
      }),
    });
    const createRes = await createRequestRoute(createReq);
    expect(createRes.status).toBe(201);
    const createJson = await createRes.json();
    const bookingId = createJson.data.booking.id;
    expect(createJson.data.booking.status).toBe("pending_approval");

    // 2. Unauthorized student cannot approve!
    const unauthApprove = new NextRequest(`http://localhost:3000/api/workflow/requests/${bookingId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-mock-role": "student" },
      body: JSON.stringify({ note: "Self-approval attempt" }),
    });
    const unauthRes = await approveRoute(unauthApprove, { params: Promise.resolve({ id: bookingId }) });
    expect(unauthRes.status).toBe(403);

    // 3. Coordinator approves booking
    const coordApprove = new NextRequest(`http://localhost:3000/api/workflow/requests/${bookingId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-mock-role": "coordinator" },
      body: JSON.stringify({ note: "Schedule verified by lab manager" }),
    });
    const coordRes = await approveRoute(coordApprove, { params: Promise.resolve({ id: bookingId }) });
    expect(coordRes.status).toBe(200);
    const coordJson = await coordRes.json();
    expect(coordJson.data.status).toBe("confirmed");

    // 4. Coordinator checks out equipment/studio
    const checkoutReq = new NextRequest("http://localhost:3000/api/workflow/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-mock-role": "coordinator" },
      body: JSON.stringify({
        bookingId,
        itemCondition: "pristine",
        conditionNotes: "Console calibrated and keys handed over",
      }),
    });
    const checkoutRes = await checkoutRoute(checkoutReq);
    expect(checkoutRes.status).toBe(200);
    const checkoutJson = await checkoutRes.json();
    expect(checkoutJson.data.status).toBe("checked_out");

    // 5. Illegal transition: cannot cancel a checked-out booking!
    const illegalCancelReq = new NextRequest(`http://localhost:3000/api/workflow/requests/${bookingId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-mock-role": "student", "x-mock-uid": "student-01" },
    });
    const illegalCancelRes = await cancelRequestRoute(illegalCancelReq, { params: Promise.resolve({ id: bookingId }) });
    expect(illegalCancelRes.status).toBe(400);

    // 6. Coordinator checks in returned equipment
    const checkinReq = new NextRequest("http://localhost:3000/api/workflow/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-mock-role": "coordinator" },
      body: JSON.stringify({
        bookingId,
        itemCondition: "good",
        conditionNotes: "Returned on time, no damages",
      }),
    });
    const checkinRes = await checkinRoute(checkinReq);
    expect(checkinRes.status).toBe(200);
    const checkinJson = await checkinRes.json();
    expect(checkinJson.data.status).toBe("returned");
  });

  it("handles conflict resolution with mandatory override reason", async () => {
    const { POST: conflictRoute } = await import("@/app/api/workflow/conflicts/[id]/resolve/route");

    // Missing reason must be rejected with 400
    const badReq = new NextRequest("http://localhost:3000/api/workflow/conflicts/conf_01/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-mock-role": "coordinator" },
      body: JSON.stringify({ resolution: "approve_override", overrideReason: "" }),
    });
    const badRes = await conflictRoute(badReq, { params: Promise.resolve({ id: "conf_01" }) });
    expect(badRes.status).toBe(400);

    // Valid override with reason succeeds
    const goodReq = new NextRequest("http://localhost:3000/api/workflow/conflicts/conf_01/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-mock-role": "coordinator" },
      body: JSON.stringify({
        resolution: "approve_override",
        overrideReason: "Department Dean approved capstone priority override",
      }),
    });
    const goodRes = await conflictRoute(goodReq, { params: Promise.resolve({ id: "conf_01" }) });
    expect(goodRes.status).toBe(200);
    const goodJson = await goodRes.json();
    expect(goodJson.ok).toBe(true);
  });
});
