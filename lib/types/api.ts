// Utilix — API request/response shapes for workflow routes
// Owner: A
// B uses these types in /app/api/workflow route handlers.

import type {
  Booking,
  Resource,
  TiebreakInfo,
  WaitlistEntry,
} from "./entities";
import type {
  BookingStatus,
  SlotType,
  DecisionSource,
  ApprovalDecision,
} from "./enums";

// ─── Eligibility preview ───

export interface EligibilityPreviewRequest {
  user_id: string;
  resource_id: string;
  slot_start: string; // ISO 8601
  slot_end: string;   // ISO 8601
}

export interface EligibilityPreviewResponse {
  eligible: boolean;
  reasons: string[];
  credit_balance: number;
  free_sessions_left: number;
  slot_type: SlotType;
  estimated_cost: number;
  active_bookings: number;
  max_active_bookings: number;
  training_verified: boolean;
  resource: Pick<Resource, "id" | "name" | "type" | "restricted" | "requires_training" | "credit_cost">;
}

// ─── Create booking request ───

export interface CreateBookingRequest {
  resource_id: string;
  slot_start: string;
  slot_end: string;
  purpose: string;
  declared_deadline?: string | null;
  member_ids?: string[];
}

export interface CreateBookingResponse {
  booking: Booking;
  waitlisted: boolean;
}

// ─── Decision payload (AI / fallback) ───

export interface ScoreBreakdown {
  usage_fairness: number;
  waiting_time: number;
  declared_need: number;
  interdisciplinary_bonus: number;
}

export interface DecisionPayload {
  booking_id: string;
  status: BookingStatus;
  allocation_score: number | null;
  score_breakdown: ScoreBreakdown | null;
  decision_reason: string;
  decision_source: DecisionSource;
  tiebreak: TiebreakInfo | null;
  policy_version: string;
  /** Student-facing "Why this decision?" explanation */
  student_explanation: string;
  /** Coordinator-facing summary with full breakdown */
  coordinator_summary: string;
}

// ─── Approval action ───

export interface ApprovalActionRequest {
  booking_id: string;
  decision: Exclude<ApprovalDecision, "pending">;
  note?: string;
}

export interface ApprovalActionResponse {
  booking: Booking;
  approval_id: string;
}

// ─── Cancel booking ───

export interface CancelBookingRequest {
  booking_id: string;
  reason?: string;
}

export interface CancelBookingResponse {
  booking: Booking;
  credits_refunded: number;
}

// ─── Waitlist status ───

export interface WaitlistStatusResponse {
  entries: WaitlistEntry[];
  position: number | null;
}

// ─── Generic API envelope ───

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: ApiError;
}
