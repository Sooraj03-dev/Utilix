import { test } from "vitest";
import assert from "node:assert/strict";

process.env.USE_MOCK_DATA = "true";

import { validateBookingForm, timeToMinutes } from "./validation";
import { MockWorkflowAdapter } from "./workflow-adapter";
import { MockAIClient } from "../../../lib/ai-client";
import type { Resource, BookingFormData, AuthUser } from "./types";
import { NextRequest } from "next/server";
import { GET as getResourcesRoute } from "../../api/workflow/resources/route";
import { GET as getSlotsRoute } from "../../api/workflow/resources/[id]/slots/route";
import { GET as getRequestsRoute, POST as createRequestRoute } from "../../api/workflow/requests/route";
import { GET as getRequestByIdRoute } from "../../api/workflow/requests/[id]/route";
import { POST as cancelRequestRoute } from "../../api/workflow/requests/[id]/cancel/route";

test("timeToMinutes converts valid HH:mm correctly", () => {
  assert.equal(timeToMinutes("00:00"), 0);
  assert.equal(timeToMinutes("09:30"), 570);
  assert.equal(timeToMinutes("14:15"), 855);
  assert.equal(timeToMinutes("23:59"), 1439);
  assert.ok(Number.isNaN(timeToMinutes("invalid")));
  assert.ok(Number.isNaN(timeToMinutes("25:00")));
  assert.ok(Number.isNaN(timeToMinutes("12:60")));
});

test("validateBookingForm validates correctly", () => {
  const dummyResource: Resource = {
    id: "res_printer1",
    name: "Test 3D Printer",
    type: "printer_3d",
    department_id: "dept_eng",
    coordinator_id: "user_carol",
    location: "Lab 1",
    photo_url: null,
    restricted: false,
    requires_training: null,
    credit_cost: 2,
    max_session_minutes: 180,
    status: "available",
    last_inspection_at: null,
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const validData: BookingFormData = {
    resourceId: "res_printer1",
    date: tomorrowStr,
    startTime: "10:00",
    endTime: "11:30",
    purpose: "Printing enclosure for capstone",
    notes: "PLA plastic",
  };

  const validResult = validateBookingForm(validData, dummyResource);
  assert.equal(validResult.valid, true);
  assert.equal(validResult.errors.length, 0);

  // Test past date
  const pastData: BookingFormData = {
    ...validData,
    date: "2020-01-01",
  };
  const pastResult = validateBookingForm(pastData, dummyResource);
  assert.equal(pastResult.valid, false);
  assert.ok(pastResult.errors.some((e) => e.field === "date"));

  // Test invalid time range (end <= start)
  const invalidTimeData: BookingFormData = {
    ...validData,
    startTime: "14:00",
    endTime: "13:00",
  };
  const invalidTimeResult = validateBookingForm(invalidTimeData, dummyResource);
  assert.equal(invalidTimeResult.valid, false);
  assert.ok(invalidTimeResult.errors.some((e) => e.field === "endTime" && e.message.includes("after start")));

  // Test duration below min
  const shortData: BookingFormData = {
    ...validData,
    startTime: "10:00",
    endTime: "10:15",
  };
  const shortResult = validateBookingForm(shortData, dummyResource);
  assert.equal(shortResult.valid, false);
  assert.ok(shortResult.errors.some((e) => e.field === "endTime" && e.message.includes("Minimum")));

  // Test duration above max
  const longData: BookingFormData = {
    ...validData,
    startTime: "10:00",
    endTime: "15:00",
  };
  const longResult = validateBookingForm(longData, dummyResource);
  assert.equal(longResult.valid, false);
  assert.ok(longResult.errors.some((e) => e.field === "endTime" && e.message.includes("Maximum")));

  // Test short purpose
  const shortPurpose: BookingFormData = {
    ...validData,
    purpose: "Hi",
  };
  const shortPurposeResult = validateBookingForm(shortPurpose, dummyResource);
  assert.equal(shortPurposeResult.valid, false);
  assert.ok(shortPurposeResult.errors.some((e) => e.field === "purpose"));

  // Test unavailable resource
  const maintenanceResource: Resource = {
    ...dummyResource,
    status: "maintenance",
  };
  const maintResult = validateBookingForm(validData, maintenanceResource);
  assert.equal(maintResult.valid, false);
  assert.ok(maintResult.errors.some((e) => e.field === "resourceId" && e.message.includes("maintenance")));
});

test("MockWorkflowAdapter manages resources and requests correctly", async () => {
  const adapter = new MockWorkflowAdapter();
  const mockUser: AuthUser = {
    uid: "user_alice",
    name: "Alice Chen",
    email: "alice@university.edu",
    role: "student",
  };

  const allResources = await adapter.listResources();
  assert.ok(allResources.length >= 3);

  // Filter by category
  const studios = await adapter.listResources({ category: "studio" });
  assert.ok(studios.every((r) => r.type === "studio"));

  // Search filter
  const searchResults = await adapter.listResources({ search: "Prusa" });
  assert.ok(searchResults.length > 0);
  assert.ok(searchResults.some((r) => r.name.includes("Prusa")));

  // Get single resource
  const resPrinter = await adapter.getResource("res_printer1");
  assert.ok(resPrinter !== null);
  assert.equal(resPrinter?.id, "res_printer1");

  // Get slots
  const slots = await adapter.getResourceSlots("res_printer1", "2026-11-01");
  assert.ok(slots.length > 0);
  assert.equal(slots[0].resourceId, "res_printer1");

  // Create request
  const created = await adapter.createRequest(
    {
      resourceId: "res_printer1",
      date: "2026-11-05",
      startTime: "10:00",
      endTime: "11:00",
      purpose: "Test purpose for capstone",
      notes: "Sample note",
    },
    mockUser,
  );
  assert.ok(created.booking.id.startsWith("bk_mock_"));
  assert.equal(created.booking.resource_id, "res_printer1");

  // Get request by id
  const fetched = await adapter.getRequest(created.booking.id);
  assert.equal(fetched?.id, created.booking.id);

  // Update status (cancel)
  const cancelled = await adapter.cancelRequest(created.booking.id, mockUser, "Cancelled for test");
  assert.equal(cancelled.booking.status, "cancelled");
});

test("MockAIClient provides typed responses", async () => {
  const ai = new MockAIClient();

  const health = await ai.healthCheck();
  assert.equal(health.ok, true);

  const slot = {
    id: "slot-1",
    resourceId: "res_printer1",
    resourceName: "Prusa i3 MK4S #1",
    department: "dept_eng",
    startTime: "2026-11-01T10:00:00Z",
    endTime: "2026-11-01T11:00:00Z",
  };

  const allocateRes = await ai.allocate({
    slot,
    requests: [
      {
        id: "req-1",
        userId: "user_alice",
        department: "dept_eng",
        requestedSlotId: "slot-1",
        sessionsThisMonth: 1,
        waitingHours: 2.5,
        projectNeedScore: 8.0,
        isPriorityGroup: false,
        trainingVerified: true,
        withinBookingLimit: true,
        noOverlap: true,
        resourceAvailable: true,
        currentCreditBalance: 10,
        freeSessionsLeft: 3,
        submittedAt: new Date().toISOString(),
      },
    ],
  });

  assert.equal(allocateRes.allocated[0].requestId, "req-1");

  const alts = await ai.getAlternatives({
    requestedSlot: slot,
    availableSlots: [
      {
        id: "slot-2",
        resourceId: "res_studio_a",
        resourceName: "Recording Studio A",
        department: "dept_design",
        startTime: "2026-11-01T14:00:00Z",
        endTime: "2026-11-01T15:00:00Z",
      },
    ],
    userRequest: {
      id: "req-2",
      userId: "user_bob",
      department: "dept_design",
      requestedSlotId: "slot-1",
      submittedAt: new Date().toISOString(),
    },
  });
  assert.ok(alts.alternatives.length > 0);
  assert.ok(alts.alternatives[0].reason.length > 0);
});

test("Workflow API Routes handle full lifecycle with mock adapter", async () => {
  // 1. GET /api/workflow/resources
  const reqRes = new NextRequest("http://localhost:3000/api/workflow/resources?category=studio");
  const resRes = await getResourcesRoute(reqRes);
  const dataRes = await resRes.json();
  assert.equal(resRes.status, 200);
  assert.equal(dataRes.success, true);
  assert.equal(dataRes._mock, true);
  assert.ok(dataRes.data.length > 0);
  assert.ok(dataRes.data.every((r: Resource) => r.type === "studio"));

  // 2. GET /api/workflow/resources/[id]/slots
  const reqSlots = new NextRequest("http://localhost:3000/api/workflow/resources/res_printer1/slots?date=2026-11-02");
  const resSlots = await getSlotsRoute(reqSlots, { params: Promise.resolve({ id: "res_printer1" }) });
  const dataSlots = await resSlots.json();
  assert.equal(resSlots.status, 200);
  assert.equal(dataSlots.success, true);
  assert.ok(dataSlots.data.slots.length > 0);

  // 3. POST /api/workflow/requests - Invalid validation returns 400
  const reqInvalid = new NextRequest("http://localhost:3000/api/workflow/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resourceId: "res_printer1", purpose: "abc" }),
  });
  const resInvalid = await createRequestRoute(reqInvalid);
  assert.equal(resInvalid.status, 400);
  const dataInvalid = await resInvalid.json();
  assert.equal(dataInvalid.success, false);
  assert.ok(dataInvalid.errors.length > 0);

  // 4. POST /api/workflow/requests - Valid submission returns 201
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const reqValid = new NextRequest("http://localhost:3000/api/workflow/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resourceId: "res_printer1",
      date: tomorrowStr,
      startTime: "10:00",
      endTime: "11:00",
      purpose: "E2E API test for booking workflow",
      notes: "Test notes",
    }),
  });
  const resValid = await createRequestRoute(reqValid);
  assert.equal(resValid.status, 201);
  const dataValid = await resValid.json();
  assert.equal(dataValid.success, true);
  assert.equal(dataValid._mock, true);
  assert.ok(dataValid.data.booking.id.startsWith("bk_mock_"));

  const newRequestId = dataValid.data.booking.id;

  // 5. GET /api/workflow/requests/[id]
  const reqGet = new NextRequest(`http://localhost:3000/api/workflow/requests/${newRequestId}`);
  const resGet = await getRequestByIdRoute(reqGet, { params: Promise.resolve({ id: newRequestId }) });
  const dataGet = await resGet.json();
  assert.equal(resGet.status, 200);
  assert.equal(dataGet.success, true);
  assert.equal(dataGet.data.id, newRequestId);

  // 6. GET /api/workflow/requests (list)
  const reqList = new NextRequest("http://localhost:3000/api/workflow/requests");
  const resList = await getRequestsRoute(reqList);
  const dataList = await resList.json();
  assert.equal(resList.status, 200);
  assert.equal(dataList.success, true);
  assert.ok(dataList.data.length > 0);

  // 7. POST /api/workflow/requests/[id]/cancel
  const reqCancel = new NextRequest(`http://localhost:3000/api/workflow/requests/${newRequestId}/cancel`, {
    method: "POST",
  });
  const resCancel = await cancelRequestRoute(reqCancel, { params: Promise.resolve({ id: newRequestId }) });
  const dataCancel = await resCancel.json();
  assert.equal(resCancel.status, 200);
  assert.equal(dataCancel.success, true);
  assert.equal(dataCancel.data.booking.status, "cancelled");
});
