import test from "node:test";
import assert from "node:assert/strict";

import { validateBookingForm, timeToMinutes } from "./validation";
import { MockWorkflowAdapter } from "./workflow-adapter";
import { MockAIClient } from "../../../lib/ai-client";
import type { Resource, BookingFormData } from "./types";
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
    id: "res-test",
    name: "Test 3D Printer",
    category: "equipment",
    department: "Engineering",
    description: "Test equipment",
    location: "Lab 1",
    capacity: 1,
    status: "available",
    tags: ["test"],
    requiresTraining: false,
    minDurationMinutes: 30,
    maxDurationMinutes: 180,
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const validData: BookingFormData = {
    resourceId: "res-test",
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
    endTime: "10:15", // 15 mins < 30 mins
  };
  const shortResult = validateBookingForm(shortData, dummyResource);
  assert.equal(shortResult.valid, false);
  assert.ok(shortResult.errors.some((e) => e.field === "endTime" && e.message.includes("Minimum")));

  // Test duration above max
  const longData: BookingFormData = {
    ...validData,
    startTime: "10:00",
    endTime: "15:00", // 300 mins > 180 mins
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

  // Test space capacity requirements
  const spaceResource: Resource = {
    ...dummyResource,
    category: "space",
    capacity: 8,
  };

  const spaceWithoutHeadcount: BookingFormData = {
    ...validData,
    headcount: undefined,
  };
  const spaceHeadcountResult = validateBookingForm(spaceWithoutHeadcount, spaceResource);
  assert.equal(spaceHeadcountResult.valid, false);
  assert.ok(spaceHeadcountResult.errors.some((e) => e.field === "headcount"));

  const spaceOverCapacity: BookingFormData = {
    ...validData,
    headcount: 15,
  };
  const spaceOverCapResult = validateBookingForm(spaceOverCapacity, spaceResource);
  assert.equal(spaceOverCapResult.valid, false);
  assert.ok(spaceOverCapResult.errors.some((e) => e.field === "headcount" && e.message.includes("Maximum capacity")));

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

  const allResources = await adapter.listResources();
  assert.ok(allResources.length >= 8);

  // Filter by category
  const spaces = await adapter.listResources({ category: "space" });
  assert.ok(spaces.every((r) => r.category === "space"));

  // Search filter
  const searchResults = await adapter.listResources({ search: "3D" });
  assert.ok(searchResults.length > 0);
  assert.ok(searchResults.some((r) => r.name.includes("3D")));

  // Get single resource
  const res001 = await adapter.getResource("res-001");
  assert.ok(res001 !== null);
  assert.equal(res001?.id, "res-001");

  // Get slots
  const slots = await adapter.getResourceSlots("res-001", "2026-11-01");
  assert.ok(slots.length > 0);
  assert.equal(slots[0].resourceId, "res-001");

  // Create request
  const created = await adapter.createRequest({
    resourceId: "res-001",
    date: "2026-11-05",
    startTime: "10:00",
    endTime: "12:00",
    purpose: "Test purpose for capstone",
    notes: "Sample note",
  });
  assert.ok(created.id.startsWith("req-mock-"));
  assert.equal(created.status, "pending");
  assert.equal(created.resourceName, "Ultimaker S5 — 3D Printer");

  // Get request by id
  const fetched = await adapter.getRequest(created.id);
  assert.equal(fetched?.id, created.id);

  // Update status (e.g. cancel)
  const updated = await adapter.updateRequestStatus(created.id, "cancelled");
  assert.equal(updated?.status, "cancelled");
});

test("MockAIClient provides typed responses", async () => {
  const ai = new MockAIClient();

  const health = await ai.healthCheck();
  assert.equal(health.ok, true);
  assert.equal(health.service, "ai-service-mock");

  const allocateRes = await ai.allocate({
    slot: {
      id: "slot-1",
      resourceId: "res-001",
      resourceName: "Ultimaker S5",
      department: "Engineering",
      startTime: "10:00",
      endTime: "12:00",
      capacity: 1,
    },
    requests: [
      {
        id: "req-1",
        userId: "user-1",
        userName: "Alice",
        department: "Engineering",
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
      {
        id: "req-2",
        userId: "user-2",
        userName: "Bob",
        department: "Engineering",
        requestedSlotId: "slot-1",
        sessionsThisMonth: 4,
        waitingHours: 0.5,
        projectNeedScore: 5.0,
        isPriorityGroup: false,
        trainingVerified: true,
        withinBookingLimit: true,
        noOverlap: true,
        resourceAvailable: true,
        currentCreditBalance: 10,
        freeSessionsLeft: 1,
        submittedAt: new Date().toISOString(),
      },
    ],
  });

  assert.equal(allocateRes.allocated.length, 1);
  assert.equal(allocateRes.waitlist.length, 1);
  assert.equal(allocateRes.allocated[0].requestId, "req-1");
  assert.equal(allocateRes.waitlist[0].requestId, "req-2");
  assert.ok(allocateRes.allocated[0].studentReason.length > 0);

  const alts = await ai.getAlternatives("res-001", "slot-1", "user-2", "Engineering");
  assert.ok(alts.alternatives.length > 0);
  assert.ok(alts.alternatives[0].reason.length > 0);
});

test("Workflow API Routes handle full lifecycle with mock adapter", async () => {
  // 1. GET /api/workflow/resources
  const reqRes = new NextRequest("http://localhost:3000/api/workflow/resources?category=equipment");
  const resRes = await getResourcesRoute(reqRes);
  const dataRes = await resRes.json();
  assert.equal(resRes.status, 200);
  assert.equal(dataRes.success, true);
  assert.equal(dataRes._mock, true);
  assert.ok(dataRes.data.length > 0);
  assert.ok(dataRes.data.every((r: Resource) => r.category === "equipment"));

  // 2. GET /api/workflow/resources/[id]/slots
  const reqSlots = new NextRequest("http://localhost:3000/api/workflow/resources/res-001/slots?date=2026-11-02");
  const resSlots = await getSlotsRoute(reqSlots, { params: Promise.resolve({ id: "res-001" }) });
  const dataSlots = await resSlots.json();
  assert.equal(resSlots.status, 200);
  assert.equal(dataSlots.success, true);
  assert.ok(dataSlots.data.slots.length > 0);

  // 3. POST /api/workflow/requests - Invalid validation returns 400
  const reqInvalid = new NextRequest("http://localhost:3000/api/workflow/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resourceId: "res-001", purpose: "abc" }),
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
      resourceId: "res-001",
      date: tomorrowStr,
      startTime: "10:00",
      endTime: "12:00",
      purpose: "E2E API test for booking workflow",
      notes: "Test notes",
    }),
  });
  const resValid = await createRequestRoute(reqValid);
  assert.equal(resValid.status, 201);
  const dataValid = await resValid.json();
  assert.equal(dataValid.success, true);
  assert.equal(dataValid._mock, true);
  assert.ok(dataValid.data.id.startsWith("req-mock-"));

  const newRequestId = dataValid.data.id;

  // 5. GET /api/workflow/requests/[id]
  const reqGet = new NextRequest(`http://localhost:3000/api/workflow/requests/${newRequestId}`);
  const resGet = await getRequestByIdRoute(reqGet, { params: Promise.resolve({ id: newRequestId }) });
  const dataGet = await resGet.json();
  assert.equal(resGet.status, 200);
  assert.equal(dataGet.success, true);
  assert.equal(dataGet.data.id, newRequestId);

  // 6. POST /api/workflow/requests/[id]/cancel
  const reqCancel = new NextRequest(`http://localhost:3000/api/workflow/requests/${newRequestId}/cancel`, {
    method: "POST",
  });
  const resCancel = await cancelRequestRoute(reqCancel, { params: Promise.resolve({ id: newRequestId }) });
  const dataCancel = await resCancel.json();
  assert.equal(resCancel.status, 200);
  assert.equal(dataCancel.success, true);
  assert.equal(dataCancel.data.status, "cancelled");
});
