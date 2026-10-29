/* ═══════════════════════════════════════════════════════════════════════════
 * Workflow Types — Owner B
 *
 * Imports and re-exports Owner A's shared foundation contracts, and defines
 * workflow-specific form, validation, and UI model types.
 * ═══════════════════════════════════════════════════════════════════════════ */

import type {
  Resource as FoundationResource,
  Booking,
  BookingStatus,
  ResourceStatus,
  SlotType,
  UserRole,
  AuthUser,
  CreateBookingRequest,
  CreateBookingResponse,
  CancelBookingResponse,
  ApiResponse as FoundationApiResponse,
  ApiError,
} from "@/lib/types";

// Re-export foundation types
export type {
  FoundationResource as Resource,
  Booking,
  BookingStatus,
  ResourceStatus,
  SlotType,
  UserRole,
  AuthUser,
  CreateBookingRequest,
  CreateBookingResponse,
  CancelBookingResponse,
  FoundationApiResponse,
  ApiError,
};

// ─── Resource Category for UI Filter ─────────────────────────────────────

export type ResourceCategory = "equipment" | "space" | "all";

// ─── Time Slots for UI ───────────────────────────────────────────────────

export interface TimeSlot {
  id: string;
  resourceId: string;
  date: string; // ISO date, e.g. "2026-11-01"
  startTime: string; // "HH:mm" 24h format
  endTime: string; // "HH:mm" 24h format
  isAvailable: boolean;
}

// ─── Form Input Data ─────────────────────────────────────────────────────

export interface BookingFormData {
  resourceId: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  notes: string;
  headcount?: number;
}

// ─── UI-Facing Request (Bridge for Booking) ──────────────────────────────

export type RequestStatus = BookingStatus;

export interface AlternativeResource {
  slotId: string;
  resourceId: string;
  resourceName: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface BookingRequest {
  id: string;
  resourceId: string;
  resourceName: string;
  userId: string;
  userName?: string;
  department?: string;
  status: RequestStatus;
  purpose: string;
  notes?: string;
  date: string;
  startTime: string;
  endTime: string;
  headcount?: number;
  costCredits?: number;
  createdAt: string;
  updatedAt: string;
  rank?: number;
  studentExplanation?: string;
  alternatives?: AlternativeResource[];
}

// ─── Form Validation ─────────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ─── Workflow Actions & Eligibility ──────────────────────────────────────

export interface EligibilityChecks {
  account_active: boolean;
  training_verified: boolean;
  training_required: string | null;
  credit_balance: number;
  credit_cost: number;
  has_sufficient_credits: boolean;
  booking_limit_passed: boolean;
  no_overlap: boolean;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  checks: EligibilityChecks;
  user_id: string;
  resource_id: string;
}

export interface ApprovalActionData {
  note?: string;
}

export interface CheckoutData {
  bookingId: string;
  conditionNotes?: string;
  itemCondition?: string;
}

export interface CheckinData {
  bookingId: string;
  conditionNotes?: string;
  itemCondition?: string;
}

export interface IssueReportData {
  bookingId: string;
  description: string;
  severity?: "low" | "medium" | "high" | "critical";
}

export interface ConflictResolveData {
  conflictId: string;
  resolution: "approve_override" | "reject_override" | "split";
  overrideReason: string;
}
