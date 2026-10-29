// Utilix — shared data model types (barrel export)
// Owner: A
// Other team members: import from @/lib/types

// Enums / union types
export type {
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
} from "./enums";

// Entity interfaces
export type {
  User,
  Department,
  Resource,
  AvailabilityWindow,
  TrainingCertification,
  TrainingRequest,
  Booking,
  TiebreakInfo,
  Bundle,
  WaitlistEntry,
  Approval,
  Checkout,
  IssueReport,
  CreditLedgerEntry,
  Notification,
  PolicyWeights,
  PeakDefinition,
  Policy,
  AuditLogEntry,
  SlotLock,
  AuthUser,
} from "./entities";

// Status machine
export {
  STATUS_TRANSITIONS,
  canTransition,
  assertTransition,
  InvalidTransitionError,
} from "./status";

// Policy defaults
export {
  DEFAULT_POLICY,
  DEFAULT_WEIGHTS,
  DEFAULT_TIEBREAK_ORDER,
  DEFAULT_PEAK_DEFINITION,
} from "./policy";

// API shapes
export type {
  EligibilityPreviewRequest,
  EligibilityPreviewResponse,
  CreateBookingRequest,
  CreateBookingResponse,
  ScoreBreakdown,
  DecisionPayload,
  ApprovalActionRequest,
  ApprovalActionResponse,
  CancelBookingRequest,
  CancelBookingResponse,
  WaitlistStatusResponse,
  ApiError,
  ApiResponse,
} from "./api";

// AI service shapes
export type {
  AISlot,
  AIPolicy,
  AIRequestItem,
  AIScoreBreakdown,
  AIRankingItem,
  AIExcludedItem,
  AITieBreakInfo,
  AIAuditInfo,
  AIAllocateRequest,
  AIAllocateResponse,
  AIAlternativeOption,
  AIAlternativesRequest,
  AIAlternativesResponse,
  AIBundleRequest,
  AIBundleResponse,
  AIInsightsResponse,
} from "./ai";

// Auth types from fs-a/auth-roles
export * from "./auth";

// Seed types from fs-a/seed
export * from "./seed";

// ─── Firestore collection names (single source of truth) ───
export const COLLECTIONS = {
  users: "users",
  departments: "departments",
  resources: "resources",
  availability_windows: "availability_windows",
  training_certifications: "training_certifications",
  training_requests: "training_requests",
  bookings: "bookings",
  bundles: "bundles",
  waitlist: "waitlist",
  approvals: "approvals",
  checkouts: "checkouts",
  issue_reports: "issue_reports",
  credit_ledger: "credit_ledger",
  notifications: "notifications",
  policies: "policies",
  audit_log: "audit_log",
  slot_locks: "slot_locks",
} as const;
