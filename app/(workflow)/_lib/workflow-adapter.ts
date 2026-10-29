/* ═══════════════════════════════════════════════════════════════════════════
 * Workflow Data Adapter — Owner B
 *
 * Implements the separation between:
 * - MockWorkflowAdapter: In-memory store for local UI development, testing & demo
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
  EligibilityResult,
  CheckoutData,
  CheckinData,
} from "./types";
import type { WaitlistEntry } from "@/lib/types";

import {
  MOCK_RESOURCES,
  MOCK_BOOKINGS,
  generateMockSlots,
} from "./mock-data";

import { aiClient } from "@/lib/ai-client";
import { assertTransition } from "@/lib/types/status";

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

  // Eligibility
  checkEligibility(
    userId: string,
    resourceId: string,
    slotStart?: string,
    slotEnd?: string,
  ): Promise<EligibilityResult>;

  // Bookings / Requests
  listRequests(userId?: string): Promise<Booking[]>;
  getRequest(id: string): Promise<Booking | null>;
  createRequest(data: BookingFormData, user: AuthUser): Promise<{ booking: Booking; waitlisted: boolean }>;
  cancelRequest(id: string, user: AuthUser, reason?: string): Promise<{ booking: Booking; credits_refunded: number }>;

  // Coordinator Actions
  approveBooking(id: string, actor: AuthUser, note?: string): Promise<{ booking: Booking }>;
  rejectBooking(id: string, actor: AuthUser, reason?: string): Promise<{ booking: Booking; credits_refunded: number }>;
  checkoutBooking(id: string, actor: AuthUser, data: CheckoutData): Promise<{ booking: Booking }>;
  checkinBooking(id: string, actor: AuthUser, data: CheckinData): Promise<{ booking: Booking }>;

  // Waitlist & Issues
  listWaitlist(resourceId?: string, slotId?: string): Promise<WaitlistEntry[]>;
  joinWaitlist(resourceId: string, slotId: string, user: AuthUser): Promise<{ waitlistEntry: WaitlistEntry }>;
  reportIssue(bookingId: string, user: AuthUser, description: string, severity?: string): Promise<Record<string, unknown>>;
  resolveConflict(conflictId: string, actor: AuthUser, resolution: string, overrideReason: string): Promise<Record<string, unknown>>;
}

// ─── Mock In-Memory State ────────────────────────────────────────────────

interface MockAuditLog {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  reason?: string | null;
  rule_version: string;
  created_at: string;
}

interface MockNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  created_at: string;
}

const sessionBookings: Booking[] = [...MOCK_BOOKINGS];
const sessionWaitlist: WaitlistEntry[] = [];
const sessionAuditLogs: MockAuditLog[] = [];
const sessionNotifications: MockNotification[] = [];
const sessionUserCredits: Record<string, number> = {
  user_alice: 10,
  user_bob: 10,
  "student-01": 12,
  "student-02": 8,
  "student-03": 15,
  "student-04": 2, // low credits / failed training in demo
};
const sessionUserTraining: Record<string, string[]> = {
  user_alice: ["3d_printing_basic", "Laser Cutter Level 1", "Prusa 3D Safety"],
  user_bob: ["3d_printing_basic", "Prusa 3D Safety"],
  "student-01": ["3d_printing_basic", "3D Printing Safety", "Electronics Lab Safety"],
  "student-02": ["3d_printing_basic", "3D Printing Safety"],
  "student-03": ["3d_printing_basic"],
  "student-04": [], // no training (fails training test)
};
let nextBookingId = 200;
let nextWaitlistId = 50;

// ─── Mock Adapter Implementation ─────────────────────────────────────────

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
    const slots = generateMockSlots(id, date);
    // Mark booked if slot has an active booking in session
    return slots.map((s) => {
      const isBooked = sessionBookings.some(
        (b) =>
          b.resource_id === id &&
          (b.status === "confirmed" || b.status === "allocated" || b.status === "pending_approval") &&
          b.slot_start.startsWith(date) &&
          b.slot_start.includes(s.startTime),
      );
      return {
        ...s,
        isAvailable: s.isAvailable && !isBooked,
      };
    });
  }

  async checkEligibility(
    userId: string,
    resourceId: string,
    slotStart?: string,
    slotEnd?: string,
  ): Promise<EligibilityResult> {
    const resource = await this.getResource(resourceId);
    if (!resource) {
      throw new Error(`Resource "${resourceId}" not found`);
    }

    const reasons: string[] = [];

    // 1. Account active check
    const accountActive = true;

    // 2. Training check
    let trainingVerified = true;
    if (resource.requires_training) {
      const userCerts = sessionUserTraining[userId] ?? [];
      trainingVerified = userCerts.some((c) =>
        c.toLowerCase().includes(resource.requires_training!.toLowerCase()),
      );
      if (!trainingVerified) {
        reasons.push(
          `Missing required certification: "${resource.requires_training}". Complete safety quiz before booking.`,
        );
      }
    }

    // 3. Active booking limit check
    const activeCount = sessionBookings.filter(
      (b) =>
        b.user_id === userId &&
        ["confirmed", "allocated", "pending_approval"].includes(b.status),
    ).length;
    const maxActive = 3;
    const bookingLimitPassed = activeCount < maxActive;
    if (!bookingLimitPassed) {
      reasons.push(
        `Active booking limit reached: Maximum ${maxActive} active bookings allowed per student.`,
      );
    }

    // 4. Credit balance check
    const currentBalance = sessionUserCredits[userId] ?? 10;
    const hasSufficientCredits = currentBalance >= resource.credit_cost;
    if (!hasSufficientCredits) {
      reasons.push(
        `Insufficient credit balance: Required ${resource.credit_cost} credits, current balance is ${currentBalance}.`,
      );
    }

    // 5. Overlapping booking check
    let noOverlap = true;
    if (slotStart && slotEnd) {
      const startMs = new Date(slotStart).getTime();
      const endMs = new Date(slotEnd).getTime();
      const overlap = sessionBookings.some((b) => {
        if (b.user_id !== userId) return false;
        if (!["confirmed", "allocated", "pending_approval"].includes(b.status)) return false;
        const bStart = new Date(b.slot_start).getTime();
        const bEnd = new Date(b.slot_end).getTime();
        return startMs < bEnd && endMs > bStart;
      });
      if (overlap) {
        noOverlap = false;
        reasons.push("Overlapping reservation detected: You already hold a booking in this time window.");
      }
    }

    const eligible = accountActive && trainingVerified && bookingLimitPassed && hasSufficientCredits && noOverlap;

    return {
      eligible,
      reasons,
      user_id: userId,
      resource_id: resourceId,
      checks: {
        account_active: accountActive,
        training_verified: trainingVerified,
        training_required: resource.requires_training,
        credit_balance: currentBalance,
        credit_cost: resource.credit_cost,
        has_sufficient_credits: hasSufficientCredits,
        booking_limit_passed: bookingLimitPassed,
        no_overlap: noOverlap,
      },
    };
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
    const resource = await this.getResource(data.resourceId);
    if (!resource) {
      throw new Error(`Resource "${data.resourceId}" not found`);
    }

    const slotStart = `${data.date}T${data.startTime}:00Z`;
    const slotEnd = `${data.date}T${data.endTime}:00Z`;
    const slotId = `${data.resourceId}_${data.date.replace(/-/g, "")}T${data.startTime.replace(":", "")}`;

    // 1. Eligibility Check
    const eligibility = await this.checkEligibility(user.uid, data.resourceId, slotStart, slotEnd);
    if (!eligibility.eligible) {
      throw new Error(eligibility.reasons.join(" "));
    }

    const now = new Date().toISOString();
    const bookingId = `bk_mock_${++nextBookingId}`;

    // 2. Contention Detection: Check if another active booking holds this slot
    const existingActiveBooking = sessionBookings.find(
      (b) =>
        b.resource_id === data.resourceId &&
        b.slot_ids.includes(slotId) &&
        ["confirmed", "allocated", "pending_approval"].includes(b.status),
    );

    let waitlisted = false;
    let initialStatus: BookingStatus = resource.restricted ? "pending_approval" : "confirmed";
    let decisionReason = "Booking confirmed via automated slot lock.";
    let decisionSource: "ai" | "fallback" = "fallback";
    let totalScore = 0.85;

    if (existingActiveBooking) {
      // Direct contention between existing holder and new request!
      const existingReqUser = existingActiveBooking.user_id;
      const allocationResp = await aiClient.allocate({
        slot: {
          id: slotId,
          resourceId: resource.id,
          resourceName: resource.name,
          department: resource.department_id,
          startTime: slotStart,
          endTime: slotEnd,
          capacity: 1,
          slotType: "credit",
          creditCost: resource.credit_cost,
        },
        requests: [
          {
            id: existingActiveBooking.id,
            userId: existingReqUser,
            department: resource.department_id,
            requestedSlotId: slotId,
            sessionsThisMonth: 3, // existing user has prior sessions
            waitingHours: 12.0,
            projectNeedScore: 6.0,
            submittedAt: existingActiveBooking.created_at,
          },
          {
            id: bookingId,
            userId: user.uid,
            department: resource.department_id,
            requestedSlotId: slotId,
            sessionsThisMonth: 0, // new student has 0 sessions (higher fairness priority)
            waitingHours: 24.0,
            projectNeedScore: 8.0,
            submittedAt: now,
          },
        ],
      });

      const winner = allocationResp.allocated[0];
      const newReqRanked = allocationResp.allocated.find((r) => r.requestId === bookingId) ||
        allocationResp.waitlist.find((r) => r.requestId === bookingId);

      decisionSource = (newReqRanked?.explanationSource === "ai" ? "ai" : "fallback");
      totalScore = newReqRanked?.totalScore ?? 0.75;

      if (winner && winner.requestId === bookingId) {
        // New requester won the contested slot!
        waitlisted = false;
        decisionReason = winner.studentReason || "Awarded slot through fairness allocation ranking.";
        // Previous holder moves to waitlist
        existingActiveBooking.status = "waitlisted";
        existingActiveBooking.decision_reason = "Bumped to waitlist due to higher priority allocation request.";
        // Refund previous holder credits
        if (existingActiveBooking.cost_credits > 0) {
          sessionUserCredits[existingReqUser] = (sessionUserCredits[existingReqUser] ?? 10) + existingActiveBooking.cost_credits;
          existingActiveBooking.cost_credits = 0;
        }
        sessionWaitlist.push({
          id: `wl_${++nextWaitlistId}`,
          resource_id: resource.id,
          slot_id: slotId,
          booking_id: existingActiveBooking.id,
          user_id: existingReqUser,
          position: 1,
          score: 0.5,
          created_at: now,
        });
      } else {
        // Existing holder won; new requester placed on waitlist
        waitlisted = true;
        initialStatus = "waitlisted";
        decisionReason = newReqRanked?.studentReason || "Slot contested: joined waitlist behind current booking.";
        sessionWaitlist.push({
          id: `wl_${++nextWaitlistId}`,
          resource_id: resource.id,
          slot_id: slotId,
          booking_id: bookingId,
          user_id: user.uid,
          position: sessionWaitlist.filter((w) => w.slot_id === slotId).length + 1,
          score: totalScore,
          created_at: now,
        });
      }
    }

    // 3. Deduct credits if confirmed and cost > 0
    const costCredits = waitlisted ? 0 : resource.credit_cost;
    if (!waitlisted && costCredits > 0) {
      const current = sessionUserCredits[user.uid] ?? 10;
      sessionUserCredits[user.uid] = current - costCredits;
    }

    const booking: Booking = {
      id: bookingId,
      resource_id: data.resourceId,
      user_id: user.uid,
      member_ids: [user.uid],
      team_department_ids: [resource.department_id],
      bundle_id: null,
      slot_start: slotStart,
      slot_end: slotEnd,
      slot_ids: [slotId],
      purpose: data.purpose,
      declared_deadline: null,
      status: initialStatus,
      slot_type: "credit",
      cost_credits: costCredits,
      allocation_score: totalScore,
      decision_reason: decisionReason,
      decision_source: decisionSource,
      tiebreak: null,
      policy_version: "v1",
      created_at: now,
      updated_at: now,
    };

    sessionBookings.unshift(booking);

    // Audit log
    sessionAuditLogs.unshift({
      id: `audit_${Date.now()}`,
      actor_id: user.uid,
      action: waitlisted ? "waitlist_joined" : "booking_created",
      entity_type: "booking",
      entity_id: bookingId,
      reason: decisionReason,
      rule_version: "v1",
      created_at: now,
    });

    return { booking, waitlisted };
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

    // Status transition check
    assertTransition(booking.status, "cancelled");

    booking.status = "cancelled";
    const now = new Date().toISOString();
    booking.updated_at = now;
    booking.decision_reason = reason ?? "Cancelled by user";

    // Refund credits
    const creditsRefunded = booking.cost_credits;
    if (creditsRefunded > 0) {
      sessionUserCredits[booking.user_id] = (sessionUserCredits[booking.user_id] ?? 10) + creditsRefunded;
    }

    // ─── Automatic Waitlist Promotion ────────────────────────────────────
    const slotId = booking.slot_ids[0];
    if (slotId) {
      const waitlistCandidates = sessionWaitlist
        .filter((w) => w.slot_id === slotId)
        .sort((a, b) => a.position - b.position);

      if (waitlistCandidates.length > 0) {
        const topCandidate = waitlistCandidates[0];
        const candidateBooking = sessionBookings.find((b) => b.id === topCandidate.booking_id);

        if (candidateBooking && candidateBooking.status === "waitlisted") {
          // Promote waitlisted booking!
          candidateBooking.status = "confirmed";
          candidateBooking.cost_credits = booking.cost_credits;
          candidateBooking.updated_at = now;
          candidateBooking.decision_reason = "Promoted from waitlist following slot cancellation.";

          // Deduct credits for promoted candidate
          if (candidateBooking.cost_credits > 0) {
            const currentBal = sessionUserCredits[candidateBooking.user_id] ?? 10;
            sessionUserCredits[candidateBooking.user_id] = Math.max(0, currentBal - candidateBooking.cost_credits);
          }

          // Remove from waitlist
          const wlIndex = sessionWaitlist.findIndex((w) => w.id === topCandidate.id);
          if (wlIndex !== -1) sessionWaitlist.splice(wlIndex, 1);

          // Promotion notification
          sessionNotifications.unshift({
            id: `notif_${Date.now()}`,
            user_id: candidateBooking.user_id,
            type: "waitlist_promoted",
            title: "Waitlist Slot Available & Confirmed!",
            body: `Your booking for slot ${slotId} has been automatically promoted and confirmed.`,
            link: `/requests/${candidateBooking.id}`,
            read: false,
            created_at: now,
          });

          // Audit log for promotion
          sessionAuditLogs.unshift({
            id: `audit_prom_${Date.now()}`,
            actor_id: "system",
            action: "waitlist_promoted",
            entity_type: "booking",
            entity_id: candidateBooking.id,
            reason: `Promoted after booking ${id} cancellation`,
            rule_version: "v1",
            created_at: now,
          });
        }
      }
    }

    return {
      booking: { ...booking },
      credits_refunded: creditsRefunded,
    };
  }

  async approveBooking(id: string, actor: AuthUser, note?: string): Promise<{ booking: Booking }> {
    const booking = sessionBookings.find((b) => b.id === id);
    if (!booking) throw new Error(`Booking ${id} not found`);

    assertTransition(booking.status, "confirmed");

    booking.status = "confirmed";
    booking.updated_at = new Date().toISOString();
    booking.decision_reason = note || "Approved by coordinator";

    sessionAuditLogs.unshift({
      id: `audit_${Date.now()}`,
      actor_id: actor.uid,
      action: "booking_approved",
      entity_type: "booking",
      entity_id: id,
      reason: note || "Coordinator approval granted",
      rule_version: "v1",
      created_at: booking.updated_at,
    });

    sessionNotifications.unshift({
      id: `notif_${Date.now()}`,
      user_id: booking.user_id,
      type: "booking_approved",
      title: "Booking Request Approved",
      body: `Your booking request ${id} has been approved by the resource coordinator.`,
      link: `/requests/${id}`,
      read: false,
      created_at: booking.updated_at,
    });

    return { booking: { ...booking } };
  }

  async rejectBooking(id: string, actor: AuthUser, reason?: string): Promise<{ booking: Booking; credits_refunded: number }> {
    const booking = sessionBookings.find((b) => b.id === id);
    if (!booking) throw new Error(`Booking ${id} not found`);

    assertTransition(booking.status, "rejected");

    booking.status = "rejected";
    booking.updated_at = new Date().toISOString();
    booking.decision_reason = reason || "Rejected by coordinator";

    const creditsRefunded = booking.cost_credits;
    if (creditsRefunded > 0) {
      sessionUserCredits[booking.user_id] = (sessionUserCredits[booking.user_id] ?? 10) + creditsRefunded;
    }

    sessionAuditLogs.unshift({
      id: `audit_${Date.now()}`,
      actor_id: actor.uid,
      action: "booking_rejected",
      entity_type: "booking",
      entity_id: id,
      reason: reason || "Coordinator rejected request",
      rule_version: "v1",
      created_at: booking.updated_at,
    });

    sessionNotifications.unshift({
      id: `notif_${Date.now()}`,
      user_id: booking.user_id,
      type: "booking_rejected",
      title: "Booking Request Rejected",
      body: `Your booking request ${id} was rejected: ${reason || "No reason provided"}`,
      link: `/requests/${id}`,
      read: false,
      created_at: booking.updated_at,
    });

    return { booking: { ...booking }, credits_refunded: creditsRefunded };
  }

  async checkoutBooking(id: string, actor: AuthUser, data: CheckoutData): Promise<{ booking: Booking }> {
    const booking = sessionBookings.find((b) => b.id === id);
    if (!booking) throw new Error(`Booking ${id} not found`);

    assertTransition(booking.status, "checked_out");

    booking.status = "checked_out";
    booking.updated_at = new Date().toISOString();
    booking.decision_reason = `Checked out. Condition: ${data.itemCondition || "good"}. Notes: ${data.conditionNotes || "none"}`;

    sessionAuditLogs.unshift({
      id: `audit_${Date.now()}`,
      actor_id: actor.uid,
      action: "booking_checked_out",
      entity_type: "booking",
      entity_id: id,
      reason: data.conditionNotes || "Item checked out in verified condition",
      rule_version: "v1",
      created_at: booking.updated_at,
    });

    return { booking: { ...booking } };
  }

  async checkinBooking(id: string, actor: AuthUser, data: CheckinData): Promise<{ booking: Booking }> {
    const booking = sessionBookings.find((b) => b.id === id);
    if (!booking) throw new Error(`Booking ${id} not found`);

    assertTransition(booking.status, "returned");

    booking.status = "returned";
    booking.updated_at = new Date().toISOString();
    booking.decision_reason = `Returned. Final Condition: ${data.itemCondition || "good"}. Notes: ${data.conditionNotes || "none"}`;

    sessionAuditLogs.unshift({
      id: `audit_${Date.now()}`,
      actor_id: actor.uid,
      action: "booking_returned",
      entity_type: "booking",
      entity_id: id,
      reason: data.conditionNotes || "Item returned and inspected",
      rule_version: "v1",
      created_at: booking.updated_at,
    });

    return { booking: { ...booking } };
  }

  async listWaitlist(resourceId?: string, slotId?: string): Promise<WaitlistEntry[]> {
    let list = [...sessionWaitlist];
    if (resourceId) list = list.filter((w) => w.resource_id === resourceId);
    if (slotId) list = list.filter((w) => w.slot_id === slotId);
    return list;
  }

  async joinWaitlist(resourceId: string, slotId: string, user: AuthUser): Promise<{ waitlistEntry: WaitlistEntry }> {
    const existing = sessionWaitlist.filter((w) => w.slot_id === slotId);
    const entry: WaitlistEntry = {
      id: `wl_${++nextWaitlistId}`,
      resource_id: resourceId,
      slot_id: slotId,
      booking_id: `bk_mock_wl_${nextWaitlistId}`,
      user_id: user.uid,
      position: existing.length + 1,
      score: 0.5,
      created_at: new Date().toISOString(),
    };
    sessionWaitlist.push(entry);
    return { waitlistEntry: entry };
  }

  async reportIssue(bookingId: string, user: AuthUser, description: string, severity = "medium") {
    const record = {
      id: `issue_${Date.now()}`,
      booking_id: bookingId,
      reporter_id: user.uid,
      description,
      severity,
      created_at: new Date().toISOString(),
    };
    sessionAuditLogs.unshift({
      id: `audit_${Date.now()}`,
      actor_id: user.uid,
      action: "issue_reported",
      entity_type: "booking",
      entity_id: bookingId,
      reason: `[${severity.toUpperCase()}] ${description}`,
      rule_version: "v1",
      created_at: record.created_at,
    });
    return record;
  }

  async resolveConflict(conflictId: string, actor: AuthUser, resolution: string, overrideReason: string) {
    if (!overrideReason || overrideReason.trim().length === 0) {
      throw new Error("Administrative override requires a documented reason.");
    }
    const record = {
      conflict_id: conflictId,
      resolved_by: actor.uid,
      resolution,
      override_reason: overrideReason,
      resolved_at: new Date().toISOString(),
    };
    sessionAuditLogs.unshift({
      id: `audit_${Date.now()}`,
      actor_id: actor.uid,
      action: "conflict_override",
      entity_type: "conflict",
      entity_id: conflictId,
      reason: `Resolution: ${resolution}. Reason: ${overrideReason}`,
      rule_version: "v1",
      created_at: record.resolved_at,
    });
    return record;
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

    const start = new Date(`${date}T08:00:00Z`);
    const end = new Date(`${date}T18:00:00Z`);
    const slotIds = slotIdsForRange(id, start, end, slotMinutes);

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

  async checkEligibility(
    userId: string,
    resourceId: string,
    slotStart?: string,
    slotEnd?: string,
  ): Promise<EligibilityResult> {
    const { getResourceById } = await import("@/lib/db/resources");
    const { getUserById } = await import("@/lib/db/users");
    const { hasTraining } = await import("@/lib/db/training");
    const { getActivePolicy } = await import("@/lib/db/policy");
    const { bookingsCol } = await import("@/lib/db/collections");

    const resource = await getResourceById(resourceId);
    if (!resource) throw new Error(`Resource "${resourceId}" not found`);

    const user = await getUserById(userId);
    const policy = await getActivePolicy();
    const reasons: string[] = [];

    const accountActive = user ? user.active : true;
    if (!accountActive) {
      reasons.push("Account is deactivated. Contact campus facilities administrator.");
    }

    let trainingVerified = true;
    if (resource.requires_training) {
      trainingVerified = await hasTraining(userId, resource.requires_training);
      if (!trainingVerified) {
        reasons.push(`Missing mandatory certification: "${resource.requires_training}".`);
      }
    }

    const activeSnaps = await bookingsCol()
      .where("user_id", "==", userId)
      .where("status", "in", ["confirmed", "allocated", "pending_approval"])
      .get();
    const bookingLimitPassed = activeSnaps.size < policy.max_active_bookings;
    if (!bookingLimitPassed) {
      reasons.push(`Active booking limit reached (${policy.max_active_bookings}).`);
    }

    const creditBalance = user ? user.credit_balance : 10;
    const hasSufficientCredits = creditBalance >= resource.credit_cost;
    if (!hasSufficientCredits) {
      reasons.push(`Insufficient credits. Required: ${resource.credit_cost}, balance: ${creditBalance}.`);
    }

    let noOverlap = true;
    if (slotStart && slotEnd) {
      const startMs = new Date(slotStart).getTime();
      const endMs = new Date(slotEnd).getTime();
      for (const doc of activeSnaps.docs) {
        const data = doc.data();
        const bStart = data.slot_start?.toDate?.() ? data.slot_start.toDate().getTime() : new Date(data.slot_start).getTime();
        const bEnd = data.slot_end?.toDate?.() ? data.slot_end.toDate().getTime() : new Date(data.slot_end).getTime();
        if (startMs < bEnd && endMs > bStart) {
          noOverlap = false;
          reasons.push("Overlapping booking detected in the requested time frame.");
          break;
        }
      }
    }

    const eligible = accountActive && trainingVerified && bookingLimitPassed && hasSufficientCredits && noOverlap;

    return {
      eligible,
      reasons,
      user_id: userId,
      resource_id: resourceId,
      checks: {
        account_active: accountActive,
        training_verified: trainingVerified,
        training_required: resource.requires_training,
        credit_balance: creditBalance,
        credit_cost: resource.credit_cost,
        has_sufficient_credits: hasSufficientCredits,
        booking_limit_passed: bookingLimitPassed,
        no_overlap: noOverlap,
      },
    };
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

    return await adminDb.runTransaction(async (tx) => {
      const creditState = await readCreditState(tx, user.uid, idempotencyKey);

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

      let waitlisted = false;
      try {
        await acquireSlotLocks(tx, bookingId, user.uid, slotIds);
      } catch (err) {
        if (err instanceof SlotTakenError) {
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
    const { releaseSlotLocks, acquireSlotLocks } = await import("@/lib/db/slots");
    const { readCreditState, writeCredit } = await import("@/lib/db/ledger");
    const { assertTransition } = await import("@/lib/types/status");
    const { writeAudit } = await import("@/lib/db/audit");
    const { listWaitlistForSlot, deleteWaitlistEntry } = await import("@/lib/db/waitlist");
    const { createNotification } = await import("@/lib/db/notifications");

    const policy = await getActivePolicy();

    return await adminDb.runTransaction(async (tx) => {
      const booking = await getBookingByIdTx(tx, id);
      if (!booking) throw new Error(`Booking ${id} not found`);

      if (booking.user_id !== user.uid && user.role === "student") {
        throw new Error("Unauthorized: you can only cancel your own bookings");
      }

      assertTransition(booking.status, "cancelled");

      if (booking.slot_ids && booking.slot_ids.length > 0) {
        releaseSlotLocks(tx, booking.slot_ids);
      }

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

      await updateBookingStatus(
        id,
        "cancelled",
        {
          decision_reason: `Cancelled by ${user.role} (${user.uid}). Refunded ${creditsRefunded} credits.`,
        },
        tx,
      );

      await writeAudit(tx, {
        actor_id: user.uid,
        action: "booking_cancelled",
        entity_type: "booking",
        entity_id: id,
        rule_version: `v${policy.version}`,
        reason: _reason ?? "User cancelled booking",
      });

      // ─── Automatic Waitlist Promotion ──────────────────────────────────
      const slotId = booking.slot_ids?.[0];
      if (slotId) {
        const waitlistEntries = await listWaitlistForSlot(booking.resource_id, slotId);
        if (waitlistEntries.length > 0) {
          const topEntry = waitlistEntries[0];
          const promotedBooking = await getBookingByIdTx(tx, topEntry.booking_id);

          if (promotedBooking && promotedBooking.status === "waitlisted") {
            try {
              await acquireSlotLocks(tx, promotedBooking.id, promotedBooking.user_id, booking.slot_ids);
              const chargeKey = `charge_promote_${promotedBooking.id}`;
              const candidateCredit = await readCreditState(tx, promotedBooking.user_id, chargeKey);
              if (booking.cost_credits > 0) {
                writeCredit(tx, candidateCredit, {
                  userId: promotedBooking.user_id,
                  delta: -booking.cost_credits,
                  reason: "booking_charge",
                  bookingId: promotedBooking.id,
                  idempotencyKey: chargeKey,
                });
              }

              await updateBookingStatus(
                promotedBooking.id,
                "confirmed",
                {
                  cost_credits: booking.cost_credits,
                  decision_reason: "Promoted from waitlist after slot cancellation.",
                },
                tx,
              );

              await deleteWaitlistEntry(topEntry.id, tx);

              await createNotification(
                {
                  user_id: promotedBooking.user_id,
                  type: "waitlist_promoted",
                  title: "Waitlist Slot Confirmed!",
                  body: `Your booking for slot ${slotId} has been confirmed following a cancellation.`,
                  link: `/requests/${promotedBooking.id}`,
                  read: false,
                },
                undefined,
                tx,
              );

              await writeAudit(tx, {
                actor_id: "system",
                action: "booking_status_changed",
                entity_type: "booking",
                entity_id: promotedBooking.id,
                reason: `Promoted following cancellation of ${id}`,
                rule_version: `v${policy.version}`,
              });
            } catch (promoteErr) {
              console.warn("Could not promote waitlist candidate in cancellation transaction:", promoteErr);
            }
          }
        }
      }

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

  async approveBooking(id: string, actor: AuthUser, note?: string): Promise<{ booking: Booking }> {
    const { getBookingById, updateBookingStatus } = await import("@/lib/db/bookings");
    const { writeAudit } = await import("@/lib/db/audit");
    const { createNotification } = await import("@/lib/db/notifications");
    const { assertTransition } = await import("@/lib/types/status");

    const booking = await getBookingById(id);
    if (!booking) throw new Error(`Booking ${id} not found`);

    assertTransition(booking.status, "confirmed");

    await updateBookingStatus(id, "confirmed", {
      decision_reason: note || "Approved by coordinator",
      decision_source: "fallback",
    });

    await writeAudit(undefined, {
      actor_id: actor.uid,
      action: "approval_decided",
      entity_type: "booking",
      entity_id: id,
      reason: note || "approved",
    });

    await createNotification({
      user_id: booking.user_id,
      type: "booking_confirmed",
      title: "Booking Request Approved",
      body: `Your request for ${booking.resource_id} has been approved.`,
      link: `/requests/${id}`,
      read: false,
    });

    return { booking: { ...booking, status: "confirmed" } };
  }

  async rejectBooking(id: string, actor: AuthUser, reason?: string): Promise<{ booking: Booking; credits_refunded: number }> {
    const { adminDb } = await import("@/lib/firebase/admin");
    const { getBookingByIdTx, updateBookingStatus } = await import("@/lib/db/bookings");
    const { releaseSlotLocks } = await import("@/lib/db/slots");
    const { readCreditState, writeCredit } = await import("@/lib/db/ledger");
    const { assertTransition } = await import("@/lib/types/status");
    const { writeAudit } = await import("@/lib/db/audit");
    const { createNotification } = await import("@/lib/db/notifications");

    return await adminDb.runTransaction(async (tx) => {
      const booking = await getBookingByIdTx(tx, id);
      if (!booking) throw new Error(`Booking ${id} not found`);

      assertTransition(booking.status, "rejected");

      if (booking.slot_ids && booking.slot_ids.length > 0) {
        releaseSlotLocks(tx, booking.slot_ids);
      }

      let creditsRefunded = 0;
      if (booking.cost_credits > 0) {
        creditsRefunded = booking.cost_credits;
        const refundKey = `refund_rejection_${id}`;
        const creditState = await readCreditState(tx, booking.user_id, refundKey);
        writeCredit(tx, creditState, {
          userId: booking.user_id,
          delta: creditsRefunded,
          reason: "refund_coordinator_cancel",
          bookingId: id,
          idempotencyKey: refundKey,
        });
      }

      await updateBookingStatus(
        id,
        "rejected",
        {
          decision_reason: reason || "Rejected by coordinator",
        },
        tx,
      );

      await writeAudit(tx, {
        actor_id: actor.uid,
        action: "approval_decided",
        entity_type: "booking",
        entity_id: id,
        reason: reason || "Rejected",
      });

      await createNotification(
        {
          user_id: booking.user_id,
          type: "booking_rejected",
          title: "Booking Request Rejected",
          body: `Your booking request ${id} was rejected: ${reason || "No reason provided."}`,
          link: `/requests/${id}`,
          read: false,
        },
        undefined,
        tx,
      );

      return {
        booking: { ...booking, status: "rejected" },
        credits_refunded: creditsRefunded,
      };
    });
  }

  async checkoutBooking(id: string, actor: AuthUser, data: CheckoutData): Promise<{ booking: Booking }> {
    const { getBookingById, updateBookingStatus } = await import("@/lib/db/bookings");
    const { writeAudit } = await import("@/lib/db/audit");
    const { assertTransition } = await import("@/lib/types/status");

    const booking = await getBookingById(id);
    if (!booking) throw new Error(`Booking ${id} not found`);

    assertTransition(booking.status, "checked_out");

    await updateBookingStatus(id, "checked_out", {
      decision_reason: `Checked out. Condition: ${data.itemCondition || "good"}. Notes: ${data.conditionNotes || "none"}`,
    });

    await writeAudit(undefined, {
      actor_id: actor.uid,
      action: "checkout",
      entity_type: "booking",
      entity_id: id,
      reason: data.conditionNotes || "Item checked out in verified condition",
    });

    return { booking: { ...booking, status: "checked_out" } };
  }

  async checkinBooking(id: string, actor: AuthUser, data: CheckinData): Promise<{ booking: Booking }> {
    const { adminDb } = await import("@/lib/firebase/admin");
    const { getBookingByIdTx, updateBookingStatus } = await import("@/lib/db/bookings");
    const { releaseSlotLocks } = await import("@/lib/db/slots");
    const { writeAudit } = await import("@/lib/db/audit");
    const { assertTransition } = await import("@/lib/types/status");

    return await adminDb.runTransaction(async (tx) => {
      const booking = await getBookingByIdTx(tx, id);
      if (!booking) throw new Error(`Booking ${id} not found`);

      assertTransition(booking.status, "returned");

      if (booking.slot_ids && booking.slot_ids.length > 0) {
        releaseSlotLocks(tx, booking.slot_ids);
      }

      await updateBookingStatus(
        id,
        "returned",
        {
          decision_reason: `Returned. Final Condition: ${data.itemCondition || "good"}. Notes: ${data.conditionNotes || "none"}`,
        },
        tx,
      );

      await writeAudit(tx, {
        actor_id: actor.uid,
        action: "return",
        entity_type: "booking",
        entity_id: id,
        reason: data.conditionNotes || "Item returned and inspected",
      });

      return { booking: { ...booking, status: "returned" } };
    });
  }

  async listWaitlist(resourceId?: string, slotId?: string): Promise<WaitlistEntry[]> {
    const { waitlistCol } = await import("@/lib/db/collections");
    const { docToEntity } = await import("@/lib/db/converters");
    let query = waitlistCol().orderBy("position", "asc");
    if (resourceId) query = query.where("resource_id", "==", resourceId);
    if (slotId) query = query.where("slot_id", "==", slotId);
    const snap = await query.get();
    return snap.docs
      .map((d) => docToEntity<WaitlistEntry>(d.id, d.data()))
      .filter((e): e is WaitlistEntry => e !== null);
  }

  async joinWaitlist(resourceId: string, slotId: string, user: AuthUser): Promise<{ waitlistEntry: WaitlistEntry }> {
    const { createWaitlistEntry, listWaitlistForSlot } = await import("@/lib/db/waitlist");
    const existing = await listWaitlistForSlot(resourceId, slotId);
    const entry = await createWaitlistEntry({
      resource_id: resourceId,
      slot_id: slotId,
      booking_id: `wl_req_${Date.now()}`,
      user_id: user.uid,
      position: existing.length + 1,
      score: 0.5,
    });
    return { waitlistEntry: entry };
  }

  async reportIssue(bookingId: string, user: AuthUser, description: string, severity = "medium") {
    const { writeAudit } = await import("@/lib/db/audit");
    await writeAudit(undefined, {
      actor_id: user.uid,
      action: "issue_reported",
      entity_type: "booking",
      entity_id: bookingId,
      reason: `[${severity.toUpperCase()}] ${description}`,
    });
    return {
      id: `issue_${Date.now()}`,
      booking_id: bookingId,
      reporter_id: user.uid,
      description,
      severity,
      created_at: new Date().toISOString(),
    };
  }

  async resolveConflict(conflictId: string, actor: AuthUser, resolution: string, overrideReason: string) {
    if (!overrideReason || overrideReason.trim().length === 0) {
      throw new Error("Administrative override requires a documented reason.");
    }
    const { writeAudit } = await import("@/lib/db/audit");
    await writeAudit(undefined, {
      actor_id: actor.uid,
      action: "booking_status_changed",
      entity_type: "conflict",
      entity_id: conflictId,
      reason: `Resolution: ${resolution}. Reason: ${overrideReason}`,
    });
    return {
      conflict_id: conflictId,
      resolved_by: actor.uid,
      resolution,
      override_reason: overrideReason,
      resolved_at: new Date().toISOString(),
    };
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

  checkEligibility(userId: string, resourceId: string, slotStart?: string, slotEnd?: string) {
    return this.delegate.checkEligibility(userId, resourceId, slotStart, slotEnd);
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

  approveBooking(id: string, actor: AuthUser, note?: string) {
    return this.delegate.approveBooking(id, actor, note);
  }

  rejectBooking(id: string, actor: AuthUser, reason?: string) {
    return this.delegate.rejectBooking(id, actor, reason);
  }

  checkoutBooking(id: string, actor: AuthUser, data: CheckoutData) {
    return this.delegate.checkoutBooking(id, actor, data);
  }

  checkinBooking(id: string, actor: AuthUser, data: CheckinData) {
    return this.delegate.checkinBooking(id, actor, data);
  }

  listWaitlist(resourceId?: string, slotId?: string) {
    return this.delegate.listWaitlist(resourceId, slotId);
  }

  joinWaitlist(resourceId: string, slotId: string, user: AuthUser) {
    return this.delegate.joinWaitlist(resourceId, slotId, user);
  }

  reportIssue(bookingId: string, user: AuthUser, description: string, severity?: string) {
    return this.delegate.reportIssue(bookingId, user, description, severity);
  }

  resolveConflict(conflictId: string, actor: AuthUser, resolution: string, overrideReason: string) {
    return this.delegate.resolveConflict(conflictId, actor, resolution, overrideReason);
  }
}

export const workflowAdapter: WorkflowDataAdapter = new DynamicWorkflowAdapter();

export function getWorkflowAdapter(): WorkflowDataAdapter {
  return workflowAdapter;
}
