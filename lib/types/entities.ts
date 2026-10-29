// Utilix — Firestore entity interfaces (ISO-string timestamps)
// Owner: A
// All timestamps are ISO 8601 strings in the TS layer.
// Firestore stores them as Timestamps; converters.ts handles the mapping.

import type {
  UserRole,
  ResourceType,
  ResourceStatus,
  SlotType,
  BookingStatus,
  BundleStatus,
  ApprovalDecision,
  CreditReason,
  IssueStatus,
  IssueCategory,
  TrainingRequestStatus,
  NotificationType,
  DecisionSource,
  TiebreakMethod,
  AuditAction,
  Weekday,
  TrainingRequestStatus,
} from "./enums";

// ─── users ───
export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  department_id: string;
  year: number;
  credit_balance: number;
  free_sessions_used: number;
  /** ISO week key like "2026-W44"; resets free_sessions_used when week changes */
  free_sessions_week: string;
  active: boolean;
  created_at: string;
}

// ─── departments ───
export interface Department {
  id: string;
  name: string;
  code: string;
}

// ─── resources ───
export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  department_id: string;
  coordinator_id: string;
  location: string;
  photo_url: string | null;
  /** Needs coordinator approval after allocation */
  restricted: boolean;
  /** Training type string or null */
  requires_training: string | null;
  credit_cost: number;
  max_session_minutes: number;
  status: ResourceStatus;
  last_inspection_at: string | null;
}

// ─── availability_windows ───
export interface AvailabilityWindow {
  id: string;
  resource_id: string;
  /** Weekday (0-6) for recurring, null for date-specific */
  weekday: Weekday | null;
  /** YYYY-MM-DD for date-specific, null for recurring */
  date: string | null;
  /** HH:mm */
  start: string;
  /** HH:mm */
  end: string;
  slot_type: SlotType;
  note: string | null;
}

// ─── training_certifications ───
// Doc ID = `${userId}_${trainingType}`
export interface TrainingCertification {
  id: string;
  user_id: string;
  training_type: string;
  certified_by: string;
  certified_at: string;
  expires_at?: string | null;
  revoked_at?: string | null;
}

// ─── training_requests ───
export interface TrainingRequest {
  id: string;
  user_id: string;
  training_type: string;
  status: TrainingRequestStatus;
  created_at: string;
  decided_at?: string | null;
  decided_by?: string | null;
  notes?: string | null;
}

// ─── bookings ───
export interface TiebreakInfo {
  used: boolean;
  seed: string;
  method: TiebreakMethod;
}

export interface Booking {
  id: string;
  resource_id: string;
  user_id: string;
  member_ids: string[];
  /** Department IDs for interdisciplinary mix */
  team_department_ids: string[];
  bundle_id: string | null;
  /** ISO 8601 */
  slot_start: string;
  /** ISO 8601 */
  slot_end: string;
  slot_ids: string[];
  purpose: string;
  /** ISO 8601, nullable */
  declared_deadline: string | null;
  status: BookingStatus;
  slot_type: SlotType;
  cost_credits: number;
  allocation_score: number | null;
  decision_reason: string | null;
  decision_source: DecisionSource;
  tiebreak: TiebreakInfo | null;
  policy_version: string;
  created_at: string;
  updated_at: string;
}

// ─── bundles ───
export interface Bundle {
  id: string;
  user_id: string;
  booking_ids: string[];
  status: BundleStatus;
  created_at: string;
}

// ─── waitlist ───
export interface WaitlistEntry {
  id: string;
  resource_id: string;
  slot_id: string;
  booking_id: string;
  user_id: string;
  position: number;
  score: number;
  created_at: string;
}

// ─── approvals ───
export interface Approval {
  id: string;
  booking_id: string;
  requested_at: string;
  decided_by: string | null;
  decision: ApprovalDecision;
  note: string | null;
  decided_at: string | null;
}

// ─── checkouts ───
export interface Checkout {
  id: string;
  booking_id: string;
  checked_out_by: string;
  checked_out_at: string;
  condition_before: string;
  returned_at: string | null;
  condition_after: string | null;
  notes: string | null;
  photo_url: string | null;
  overdue: boolean;
}

// ─── issue_reports ───
export interface IssueReport {
  id: string;
  booking_id: string;
  resource_id: string;
  user_id: string;
  category: IssueCategory;
  notes: string;
  photo_url: string | null;
  status: IssueStatus;
  created_at: string;
}

// ─── training_requests ───
export interface TrainingRequest {
  id: string;
  user_id: string;
  training_type: string;
  status: TrainingRequestStatus;
  created_at: string;
}

// ─── credit_ledger ───
// Doc ID = idempotency_key
export interface CreditLedgerEntry {
  id: string;
  user_id: string;
  delta: number;
  reason: CreditReason;
  booking_id: string | null;
  balance_after: number;
  idempotency_key: string;
  created_at: string;
}

// ─── notifications ───
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

// ─── policies ───
// Doc ID = `v${version}`
export interface PolicyWeights {
  usage_fairness: number;
  waiting_time: number;
  declared_need: number;
  interdisciplinary_bonus: number;
}

export interface PeakDefinition {
  weekday: Weekday;
  start: string; // HH:mm
  end: string;   // HH:mm
}

export interface Policy {
  id: string;
  version: number;
  is_active: boolean;
  monthly_credits: number;
  free_sessions_per_week: number;
  max_active_bookings: number;
  slot_minutes: number;
  cancel_refund_hours: number;
  weights: PolicyWeights;
  tiebreak_order: TiebreakMethod[];
  peak_definition: PeakDefinition[];
  deadline_window_days: number;
  created_by: string;
  created_at: string;
}

// ─── audit_log ───
export interface AuditLogEntry {
  id: string;
  actor_id: string;
  action: AuditAction;
  entity_type: string;
  entity_id: string;
  rule_version: string;
  scores: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
}

// ─── slot_locks ───
// Doc ID = slotId
export interface SlotLock {
  booking_id: string;
  user_id: string;
  locked_at: string;
}

// ─── Auth user (decoded from Firebase ID token) ───
export interface AuthUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
}
