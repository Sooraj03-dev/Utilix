// Utilix — shared enumerations
// Owner: A

/** Firebase custom claim role */
export type UserRole = "student" | "coordinator" | "admin";

/** Equipment / space category */
export type ResourceType =
  | "printer_3d"
  | "arduino_kit"
  | "camera"
  | "studio"
  | "project_room"
  | "lab_instrument";

/** Operational status of a resource */
export type ResourceStatus = "available" | "maintenance" | "retired";

/** Availability window slot type */
export type SlotType = "free" | "credit" | "blocked";

/** Booking lifecycle status */
export type BookingStatus =
  | "submitted"
  | "eligibility_passed"
  | "allocated"
  | "waitlisted"
  | "pending_approval"
  | "confirmed"
  | "checked_out"
  | "returned"
  | "cancelled"
  | "rejected"
  | "no_show";

/** Bundle lifecycle status */
export type BundleStatus = "pending" | "confirmed" | "cancelled";

/** Approval decision */
export type ApprovalDecision = "approved" | "rejected" | "pending";

/** Credit ledger reason */
export type CreditReason =
  | "monthly_grant"
  | "booking_charge"
  | "refund_early_cancel"
  | "refund_coordinator_cancel"
  | "forfeit_no_show"
  | "adjustment";

/** Issue report status */
export type IssueStatus = "open" | "investigating" | "resolved";

/** Issue report category */
export type IssueCategory = "damage" | "malfunction" | "missing" | "other";

/** Notification type */
export type NotificationType =
  | "booking_confirmed"
  | "booking_rejected"
  | "booking_cancelled"
  | "waitlist_promoted"
  | "approval_needed"
  | "checkout_reminder"
  | "overdue_warning"
  | "credit_granted"
  | "general";

/** Training request lifecycle status */
export type TrainingRequestStatus = "pending" | "scheduled" | "completed" | "declined";

/** AI decision source */
export type DecisionSource = "ai" | "fallback" | null;

/** Tiebreak method used */
export type TiebreakMethod =
  | "fewest_sessions_month"
  | "earliest_request"
  | "seeded_lottery";

/** Audit log action verbs */
export type AuditAction =
  | "booking_created"
  | "booking_status_changed"
  | "booking_cancelled"
  | "resource_created"
  | "resource_updated"
  | "policy_created"
  | "policy_deactivated"
  | "credit_applied"
  | "credit_reconciled"
  | "approval_decided"
  | "checkout"
  | "return"
  | "issue_reported"
  | "training_requested"
  | "training_request_status_changed"
  | "training_certified"
  | "training_revoked"
  | "availability_window_created"
  | "availability_window_updated"
  | "availability_window_deleted"
  | "maintenance_block_created"
  | "slot_locked"
  | "slot_released";

/** Weekday 0 (Sunday) – 6 (Saturday) */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
