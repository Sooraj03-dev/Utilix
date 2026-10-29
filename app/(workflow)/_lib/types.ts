/* ═══════════════════════════════════════════════════════════════════════════
 * Workflow Types — Owner B
 *
 * These types live in owner B's domain and define the booking-workflow
 * contract. They do NOT duplicate lib/types/index.ts (Owner A) — they will
 * import shared types from there once Owner A publishes them.
 * ═══════════════════════════════════════════════════════════════════════════ */

// ─── Resource / Equipment / Space ─────────────────────────────────────────

export type ResourceCategory = "equipment" | "space";

export type ResourceStatus = "available" | "in-use" | "maintenance" | "retired";

export interface Resource {
  id: string;
  name: string;
  category: ResourceCategory;
  department: string;
  description: string;
  location: string;
  capacity: number;
  imageUrl?: string;
  status: ResourceStatus;
  /** Tags for filtering, e.g. ["3D printer", "laser cutter"] */
  tags: string[];
  /** Whether training verification is needed before booking */
  requiresTraining: boolean;
  /** Minimum booking duration in minutes */
  minDurationMinutes: number;
  /** Maximum booking duration in minutes */
  maxDurationMinutes: number;
}

// ─── Time Slots ───────────────────────────────────────────────────────────

export interface TimeSlot {
  id: string;
  resourceId: string;
  date: string; // ISO date, e.g. "2026-11-01"
  startTime: string; // "HH:mm" 24h format
  endTime: string; // "HH:mm" 24h format
  isAvailable: boolean;
}

// ─── Booking Request ──────────────────────────────────────────────────────

export type RequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "waitlisted"
  | "checked-out"
  | "returned";

export interface BookingFormData {
  resourceId: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  /** Additional details/requirements from the user */
  notes: string;
  /** Number of people (for spaces) */
  headcount?: number;
}

export interface BookingRequest {
  id: string;
  resourceId: string;
  resourceName: string;
  userId: string;
  userName: string;
  department: string;
  status: RequestStatus;
  purpose: string;
  notes: string;
  date: string;
  startTime: string;
  endTime: string;
  headcount?: number;
  createdAt: string; // ISO datetime
  updatedAt: string;
  /** Reason if rejected */
  rejectionReason?: string;
  /** Rank position from AI allocation (if processed) */
  rank?: number;
  /** AI explanation shown to the student */
  studentExplanation?: string;
  /** Alternative resources suggested by AI */
  alternatives?: AlternativeResource[];
}

// ─── AI Allocation Response (mirrors ai-service schemas) ──────────────────

export interface ScoreBreakdown {
  usage: number;
  waiting: number;
  need: number;
  diversity: number;
}

export interface RankedRequest {
  requestId: string;
  userId: string;
  rank: number;
  totalScore: number;
  scoreBreakdown: ScoreBreakdown;
  studentReason: string;
  coordinatorSummary: string;
  decidedBy?: string;
  tiedWith: string[];
  explanationSource?: string;
}

export interface ExcludedRequest {
  requestId: string;
  userId: string;
  reason: string;
  code: string;
}

export interface AllocationResult {
  allocated: RankedRequest[];
  waitlist: RankedRequest[];
  excluded: ExcludedRequest[];
}

export interface AlternativeResource {
  slotId: string;
  resourceId: string;
  resourceName: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}

// ─── AI Client Contract ──────────────────────────────────────────────────

export interface AIAllocationRequest {
  resourceId: string;
  slotId: string;
  requests: {
    id: string;
    userId: string;
    userName: string;
    department: string;
    sessionsThisMonth: number;
    waitingHours: number;
    projectNeedScore: number;
  }[];
}

export interface AIAlternativesRequest {
  resourceId: string;
  slotId: string;
  userId: string;
  department: string;
}

export interface AIInsightsRequest {
  resourceIds: string[];
  dateRange: { start: string; end: string };
}

export interface AIInsightsResponse {
  equipmentUtilization: Record<string, number>;
  contentionRate: Record<string, number>;
  giniCoefficient: number;
  jainFairnessIndex: number;
  recommendations: { title: string; description: string }[];
  narrative: string[];
}

// ─── API Response Wrappers ────────────────────────────────────────────────

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  /** Present when mock adapter is used */
  _mock?: boolean;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ─── Form Validation ──────────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

