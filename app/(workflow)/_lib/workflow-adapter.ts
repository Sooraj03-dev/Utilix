/* ═══════════════════════════════════════════════════════════════════════════
 * Workflow Data Adapter — Owner B
 *
 * ⚠️  MOCK ADAPTER — This adapter uses in-memory mock data. It does NOT
 *     persist anything to a database. Replace with Owner A's Firebase/DB
 *     helpers when they are available.
 *
 * The adapter exposes a typed interface so swapping implementations is a
 * single-file change with no impact on API routes or UI pages.
 * ═══════════════════════════════════════════════════════════════════════════ */

import type {
  Resource,
  TimeSlot,
  BookingRequest,
  BookingFormData,
  RequestStatus,
} from "./types";

import {
  MOCK_RESOURCES,
  MOCK_REQUESTS,
  generateMockSlots,
} from "./mock-data";

// ─── Adapter Interface ───────────────────────────────────────────────────
// When Firebase is ready, implement this interface with real DB calls.

export interface WorkflowDataAdapter {
  // Resources
  listResources(filters?: {
    category?: string;
    department?: string;
    search?: string;
  }): Promise<Resource[]>;
  getResource(id: string): Promise<Resource | null>;
  getResourceSlots(id: string, date: string): Promise<TimeSlot[]>;

  // Booking Requests
  listRequests(userId?: string): Promise<BookingRequest[]>;
  getRequest(id: string): Promise<BookingRequest | null>;
  createRequest(data: BookingFormData): Promise<BookingRequest>;
  updateRequestStatus(
    id: string,
    status: RequestStatus,
    reason?: string,
  ): Promise<BookingRequest | null>;
}

// ─── Mock Implementation ─────────────────────────────────────────────────

// In-memory store for requests created during this session
let sessionRequests: BookingRequest[] = [...MOCK_REQUESTS];
let nextRequestId = 100;

export class MockWorkflowAdapter implements WorkflowDataAdapter {
  async listResources(
    filters?: { category?: string; department?: string; search?: string },
  ): Promise<Resource[]> {
    let results = [...MOCK_RESOURCES];

    if (filters?.category) {
      results = results.filter((r) => r.category === filters.category);
    }
    if (filters?.department) {
      results = results.filter((r) =>
        r.department.toLowerCase().includes(filters.department!.toLowerCase()),
      );
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    return results;
  }

  async getResource(id: string): Promise<Resource | null> {
    return MOCK_RESOURCES.find((r) => r.id === id) ?? null;
  }

  async getResourceSlots(id: string, date: string): Promise<TimeSlot[]> {
    return generateMockSlots(id, date);
  }

  async listRequests(_userId?: string): Promise<BookingRequest[]> {
    // In mock mode, return all requests (no auth filtering)
    return [...sessionRequests].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async getRequest(id: string): Promise<BookingRequest | null> {
    return sessionRequests.find((r) => r.id === id) ?? null;
  }

  async createRequest(data: BookingFormData): Promise<BookingRequest> {
    const resource = MOCK_RESOURCES.find((r) => r.id === data.resourceId);
    const now = new Date().toISOString();

    const request: BookingRequest = {
      id: `req-mock-${++nextRequestId}`,
      resourceId: data.resourceId,
      resourceName: resource?.name ?? "Unknown Resource",
      userId: "user-mock-001",
      userName: "Demo User",
      department: "Engineering",
      status: "pending",
      purpose: data.purpose,
      notes: data.notes,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      headcount: data.headcount,
      createdAt: now,
      updatedAt: now,
    };

    sessionRequests.push(request);
    return request;
  }

  async updateRequestStatus(
    id: string,
    status: RequestStatus,
    reason?: string,
  ): Promise<BookingRequest | null> {
    const request = sessionRequests.find((r) => r.id === id);
    if (!request) return null;

    request.status = status;
    request.updatedAt = new Date().toISOString();
    if (reason && status === "rejected") {
      request.rejectionReason = reason;
    }

    return { ...request };
  }
}

// ─── Singleton Export ────────────────────────────────────────────────────
// TODO: Replace with FirebaseWorkflowAdapter when Owner A's helpers are ready.
//       The swap is: `export const workflowAdapter = new FirebaseWorkflowAdapter();`

export const workflowAdapter: WorkflowDataAdapter = new MockWorkflowAdapter();

