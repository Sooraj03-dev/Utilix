/* ═══════════════════════════════════════════════════════════════════════════
 * Workflow Data Adapter — Owner B
 *
 * Implements the separation between:
 * - MockWorkflowAdapter: In-memory store for local UI development & demo
 * - FirebaseWorkflowAdapter: Real Firestore & Transactional database integration
 *
 * Configuration:
 * - Set USE_MOCK_DATA="true" or NEXT_PUBLIC_USE_MOCK_DATA="true" for mock mode.
 * - In production mode, uses Firebase Admin & Firestore transactions.
 * - NEVER falls back to mock data silently on errors.
 * ═══════════════════════════════════════════════════════════════════════════ */

import type {
  Resource as FoundationResource,
  Booking,
  BookingStatus,
  AuthUser,
  TimeSlot,
  BookingFormData,
} from "./types";

import {
  MOCK_RESOURCES,
  MOCK_BOOKINGS,
  generateMockSlots,
} from "./mock-data";

// ─── Adapter Interface ───────────────────────────────────────────────────

export interface WorkflowDataAdapter {
  isMock: boolean;

  // Resources
  listResources(filters?: {
    category?: string;
    department?: string;
    search?: string;
  }): Promise<FoundationResource[]>;
  getResource(id: string): Promise<FoundationResource | null>;
  getResourceSlots(id: string, date: string): Promise<TimeSlot[]>;

  // Bookings / Requests
  listRequests(userId?: string): Promise<Booking[]>;
  getRequest(id: string): Promise<Booking | null>;
  createRequest(data: BookingFormData, user: AuthUser): Promise<{ booking: Booking; waitlisted: boolean }>;
  cancelRequest(id: string, user: AuthUser, reason?: string): Promise<{ booking: Booking; credits_refunded: number }>;
}

// ─── Mock Adapter Implementation ─────────────────────────────────────────

const sessionBookings: Booking[] = [...MOCK_BOOKINGS];
let nextBookingId = 100;

export class MockWorkflowAdapter implements WorkflowDataAdapter {
  readonly isMock = true;

  async listResources(
    filters?: { category?: string; department?: string; search?: string },
  ): Promise<FoundationResource[]> {
    let results = [...MOCK_RESOURCES];

    if (filters?.category) {
      results = results.filter((r) => r.type === filters.category);
    }
    if (filters?.department) {
      results = results.filter((r) =>
        r.department_id.toLowerCase().includes(filters.department!.toLowerCase()),
      );
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q),
      );
    }

    return results;
  }

  async getResource(id: string): Promise<FoundationResource | null> {
    return MOCK_RESOURCES.find((r) => r.id === id) ?? null;
  }

  async getResourceSlots(id: string, date: string): Promise<TimeSlot[]> {
    return generateMockSlots(id, date);
  }

  async listRequests(userId?: string): Promise<Booking[]> {
    let list = [...sessionBookings];
    if (userId) {
      list = list.filter((b) => b.user_id === userId || b.member_ids.includes(userId));
    }
    return list.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  async getRequest(id: string): Promise<Booking | null> {
    return sessionBookings.find((b) => b.id === id) ?? null;
  }

  async createRequest(
    data: BookingFormData,
    user: AuthUser,
  ): Promise<{ booking: Booking; waitlisted: boolean }> {
    const resource = MOCK_RESOURCES.find((r) => r.id === data.resourceId);
    const now = new Date().toISOString();
    const bookingId = `bk_mock_${++nextBookingId}`;

    const slotStart = `${data.date}T${data.startTime}:00Z`;
    const slotEnd = `${data.date}T${data.endTime}:00Z`;
    const slotIds = [`${data.resourceId}_${data.date.replace(/-/g, "")}T${data.startTime.replace(":", "")}`];

    const booking: Booking = {
      id: bookingId,
      resource_id: data.resourceId,
      user_id: user.uid,
      member_ids: [user.uid],
      team_department_ids: ["dept_eng"],
      bundle_id: null,
      slot_start: slotStart,
      slot_end: slotEnd,
      slot_ids: slotIds,
      purpose: data.purpose,
      declared_deadline: null,
      status: (resource?.restricted ? "pending_approval" : "confirmed") as BookingStatus,
      slot_type: "credit",
      cost_credits: resource?.credit_cost ?? 1,
      allocation_score: 0.85,
      decision_reason: "Mock booking confirmed.",
      decision_source: "fallback",
      tiebreak: null,
      policy_version: "v0",
      created_at: now,
      updated_at: now,
    };

    sessionBookings.unshift(booking);
    return { booking, waitlisted: false };
  }

  async cancelRequest(
    id: string,
    user: AuthUser,
    reason?: string,
  ): Promise<{ booking: Booking; credits_refunded: number }> {
    const booking = sessionBookings.find((b) => b.id === id);
    if (!booking) {
      throw new Error(`Booking ${id} not found`);
    }

    if (booking.user_id !== user.uid && user.role === "student") {
      throw new Error("Unauthorized: you can only cancel your own bookings");
    }

    booking.status = "cancelled";
    booking.updated_at = new Date().toISOString();
    if (reason) {
      booking.decision_reason = reason;
    }

    return {
      booking: { ...booking },
      credits_refunded: booking.cost_credits,
    };
  }
}

// ─── Real Firebase Adapter Implementation ────────────────────────────────

export class FirebaseWorkflowAdapter implements WorkflowDataAdapter {
  readonly isMock = false;

  async listResources(filters?: {
    category?: string;
    department?: string;
    search?: string;
  }): Promise<FoundationResource[]> {
    const { listResources } = await import("@/lib/db/resources");
    const resources = await listResources();
    let results = resources;

    if (filters?.category) {
      results = results.filter((r) => r.type === filters.category);
    }
    if (filters?.department) {
      results = results.filter((r) =>
        r.department_id.toLowerCase().includes(filters.department!.toLowerCase()),
      );
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q),
      );
    }

    return results;
  }

  async getResource(id: string): Promise<FoundationResource | null> {
    const { getResourceById } = await import("@/lib/db/resources");
    return getResourceById(id);
  }

  async getResourceSlots(id: string, date: string): Promise<TimeSlot[]> {
    const { getResourceById } = await import("@/lib/db/resources");
    const { getActivePolicy } = await import("@/lib/db/policy");
    const { slotIdsForRange, toSlotId } = await import("@/lib/db/slots");
    const { slotLocksCol } = await import("@/lib/db/collections");

    const resource = await getResourceById(id);
    if (!resource) return [];

    const policy = await getActivePolicy();
    const slotMinutes = policy.slot_minutes || 60;

    // Generate slots from 08:00 to 18:00 UTC for the given date
    const start = new Date(`${date}T08:00:00Z`);
    const end = new Date(`${date}T18:00:00Z`);
    const slotIds = slotIdsForRange(id, start, end, slotMinutes);

    // Check slot locks in Firestore
    const locksSnap = await slotLocksCol().get();
    const lockedIds = new Set(locksSnap.docs.map((d) => d.id));

    const cursor = new Date(start.getTime());
    const slots: TimeSlot[] = [];

    for (let i = 0; i < slotIds.length; i++) {
      const slotStart = new Date(cursor.getTime());
      cursor.setUTCMinutes(cursor.getUTCMinutes() + slotMinutes);
      const slotEnd = new Date(cursor.getTime());

      const startHHMM = slotStart.toISOString().substring(11, 16);
      const endHHMM = slotEnd.toISOString().substring(11, 16);
      const slotId = toSlotId(id, slotStart);
      const isLocked = lockedIds.has(slotId);

      slots.push({
        id: slotId,
        resourceId: id,
        date,
        startTime: startHHMM,
        endTime: endHHMM,
        isAvailable: resource.status === "available" && !isLocked,
      });
    }

    return slots;
  }

  async listRequests(userId?: string): Promise<Booking[]> {
    const { listBookingsByUser } = await import("@/lib/db/bookings");
    if (!userId) {
      const { bookingsCol } = await import("@/lib/db/collections");
      const { docToEntity } = await import("@/lib/db/converters");
      const snap = await bookingsCol().orderBy("slot_start", "desc").get();
      return snap.docs
        .map((d) => docToEntity<Booking>(d.id, d.data()))
        .filter((b): b is Booking => b !== null);
    }
    return listBookingsByUser(userId);
  }

  async getRequest(id: string): Promise<Booking | null> {
    const { getBookingById } = await import("@/lib/db/bookings");
    return getBookingById(id);
  }

  async createRequest(
    data: BookingFormData,
    user: AuthUser,
  ): Promise<{ booking: Booking; waitlisted: boolean }> {
    const { adminDb } = await import("@/lib/firebase/admin");
    const { getResourceById } = await import("@/lib/db/resources");
    const { getActivePolicy } = await import("@/lib/db/policy");
    const { slotIdsForRange, acquireSlotLocks } = await import("@/lib/db/slots");
    const { readCreditState, writeCredit } = await import("@/lib/db/ledger");
    const { createBooking } = await import("@/lib/db/bookings");
    const { hasTraining } = await import("@/lib/db/training");
    const { writeAudit } = await import("@/lib/db/audit");
    const { createWaitlistEntry } = await import("@/lib/db/waitlist");
    const { bookingsCol } = await import("@/lib/db/collections");
    const { SlotTakenError } = await import("@/lib/db/errors");

    // 1. Validate resource
    const resource = await getResourceById(data.resourceId);
    if (!resource) {
      throw new Error(`Resource ${data.resourceId} not found`);
    }
    if (resource.status !== "available") {
      throw new Error(`Resource ${resource.name} is currently ${resource.status}`);
    }

    // 2. Validate training
    if (resource.requires_training) {
      const certified = await hasTraining(user.uid, resource.requires_training);
      if (!certified) {
        throw new Error(
          `Training required: You must complete "${resource.requires_training}" before booking this resource.`,
        );
      }
    }

    // 3. Load policy
    const policy = await getActivePolicy();
    const policyVersion = `v${policy.version}`;

    // 4. Time range and slots
    const start = new Date(`${data.date}T${data.startTime}:00Z`);
    const end = new Date(`${data.date}T${data.endTime}:00Z`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Invalid start or end time");
    }
    if (end.getTime() <= start.getTime()) {
      throw new Error("End time must be after start time");
    }

    const durationMinutes = (end.getTime() - start.getTime()) / (60 * 1000);
    if (durationMinutes > resource.max_session_minutes) {
      throw new Error(
        `Duration exceeds maximum allowed (${resource.max_session_minutes} minutes)`,
      );
    }

    const slotIds = slotIdsForRange(resource.id, start, end, policy.slot_minutes || 60);
    if (slotIds.length === 0) {
      throw new Error("No valid time slots in requested range");
    }

    const bookingRef = bookingsCol().doc();
    const bookingId = bookingRef.id;
    const idempotencyKey = `charge_${bookingId}`;

    // 5. Execute composite Firestore transaction
    return await adminDb.runTransaction(async (tx) => {
      // Read 1: Credit state
      const creditState = await readCreditState(tx, user.uid, idempotencyKey);

      // Read 2: Check active booking limit
      const activeSnaps = await tx.get(
        bookingsCol()
          .where("user_id", "==", user.uid)
          .where("status", "in", ["confirmed", "allocated", "pending_approval"]),
      );
      if (activeSnaps.size >= policy.max_active_bookings) {
        throw new Error(
          `Active booking limit reached: Maximum ${policy.max_active_bookings} active bookings allowed`,
        );
      }

      // Read 3 & Write 1: Try acquiring slot locks
      let waitlisted = false;
      try {
        await acquireSlotLocks(tx, bookingId, user.uid, slotIds);
      } catch (err) {
        if (err instanceof SlotTakenError) {
          // Slot is contested: create waitlist entry
          waitlisted = true;
          await createWaitlistEntry(
            {
              resource_id: resource.id,
              slot_id: slotIds[0],
              booking_id: bookingId,
              user_id: user.uid,
              position: 1,
              score: 0.5,
            },
            undefined,
            tx,
          );
        } else {
          throw err;
        }
      }

      // Write 2: Apply credit deduction if not waitlisted and cost > 0
      const costCredits = waitlisted ? 0 : resource.credit_cost;
      if (!waitlisted && costCredits > 0) {
        writeCredit(tx, creditState, {
          userId: user.uid,
          delta: -costCredits,
          reason: "booking_charge",
          bookingId,
          idempotencyKey,
        });
      }

      // Write 3: Create booking
      const initialStatus: BookingStatus = waitlisted
        ? "waitlisted"
        : resource.restricted
          ? "pending_approval"
          : "confirmed";

      const created = await createBooking(
        {
          resource_id: resource.id,
          user_id: user.uid,
          member_ids: [user.uid],
          team_department_ids: [resource.department_id],
          bundle_id: null,
          slot_start: start.toISOString(),
          slot_end: end.toISOString(),
          slot_ids: slotIds,
          purpose: data.purpose,
          declared_deadline: null,
          status: initialStatus,
          slot_type: "credit",
          cost_credits: costCredits,
          allocation_score: 1.0,
          decision_reason: waitlisted
            ? "Slot contended; joined waitlist."
            : resource.restricted
              ? "Pending coordinator approval."
              : "Slot locked and booking confirmed.",
          decision_source: "fallback",
          tiebreak: null,
          policy_version: policyVersion,
        },
        bookingId,
        tx,
      );

      // Write 4: Audit log
      await writeAudit(tx, {
        actor_id: user.uid,
        action: "booking_created",
        entity_type: "booking",
        entity_id: bookingId,
        rule_version: policyVersion,
        reason: data.purpose,
      });

      return { booking: created, waitlisted };
    });
  }

  async cancelRequest(
    id: string,
    user: AuthUser,
    _reason?: string,
  ): Promise<{ booking: Booking; credits_refunded: number }> {
    const { adminDb } = await import("@/lib/firebase/admin");
    const { getBookingByIdTx, updateBookingStatus } = await import("@/lib/db/bookings");
    const { getActivePolicy } = await import("@/lib/db/policy");
    const { releaseSlotLocks } = await import("@/lib/db/slots");
    const { readCreditState, writeCredit } = await import("@/lib/db/ledger");
    const { assertTransition } = await import("@/lib/types/status");
    const { writeAudit } = await import("@/lib/db/audit");

    const policy = await getActivePolicy();

    return await adminDb.runTransaction(async (tx) => {
      const booking = await getBookingByIdTx(tx, id);
      if (!booking) {
        throw new Error(`Booking ${id} not found`);
      }

      // Authorization check
      if (booking.user_id !== user.uid && user.role === "student") {
        throw new Error("Unauthorized: you can only cancel your own bookings");
      }

      // Legal status transition assertion
      assertTransition(booking.status, "cancelled");

      // Release slot locks
      if (booking.slot_ids && booking.slot_ids.length > 0) {
        releaseSlotLocks(tx, booking.slot_ids);
      }

      // Calculate refund
      const now = new Date();
      const slotStart = new Date(booking.slot_start);
      const hoursUntilStart = (slotStart.getTime() - now.getTime()) / (3600 * 1000);
      let creditsRefunded = 0;

      if (
        hoursUntilStart >= (policy.cancel_refund_hours ?? 24) &&
        booking.cost_credits > 0
      ) {
        creditsRefunded = booking.cost_credits;
        const refundKey = `refund_early_cancel_${id}`;
        const creditState = await readCreditState(tx, booking.user_id, refundKey);
        writeCredit(tx, creditState, {
          userId: booking.user_id,
          delta: creditsRefunded,
          reason: "refund_early_cancel",
          bookingId: id,
          idempotencyKey: refundKey,
        });
      }

      // Update booking status
      await updateBookingStatus(
        id,
        "cancelled",
        {
          decision_reason: `Cancelled by ${user.role} (${user.uid}). Refunded ${creditsRefunded} credits.`,
        },
        tx,
      );

      // Audit log
      await writeAudit(tx, {
        actor_id: user.uid,
        action: "booking_cancelled",
        entity_type: "booking",
        entity_id: id,
        rule_version: `v${policy.version}`,
        reason: _reason ?? "User cancelled booking",
      });

      return {
        booking: {
          ...booking,
          status: "cancelled",
          updated_at: new Date().toISOString(),
        },
        credits_refunded: creditsRefunded,
      };
    });
  }
}

// ─── Adapter Selection ───────────────────────────────────────────────────

class DynamicWorkflowAdapter implements WorkflowDataAdapter {
  private mockAdapter = new MockWorkflowAdapter();
  private firebaseAdapter?: FirebaseWorkflowAdapter;

  private get delegate(): WorkflowDataAdapter {
    const useMock =
      process.env.USE_MOCK_DATA === "true" ||
      process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

    if (useMock) {
      return this.mockAdapter;
    }
    if (!this.firebaseAdapter) {
      this.firebaseAdapter = new FirebaseWorkflowAdapter();
    }
    return this.firebaseAdapter;
  }

  get isMock(): boolean {
    return this.delegate.isMock;
  }

  listResources(filters?: { category?: string; department?: string; search?: string }) {
    return this.delegate.listResources(filters);
  }

  getResource(id: string) {
    return this.delegate.getResource(id);
  }

  getResourceSlots(id: string, date: string) {
    return this.delegate.getResourceSlots(id, date);
  }

  listRequests(userId?: string) {
    return this.delegate.listRequests(userId);
  }

  getRequest(id: string) {
    return this.delegate.getRequest(id);
  }

  createRequest(data: BookingFormData, user: AuthUser) {
    return this.delegate.createRequest(data, user);
  }

  cancelRequest(id: string, user: AuthUser, reason?: string) {
    return this.delegate.cancelRequest(id, user, reason);
  }
}

export const workflowAdapter: WorkflowDataAdapter = new DynamicWorkflowAdapter();

export function getWorkflowAdapter(): WorkflowDataAdapter {
  return workflowAdapter;
}
