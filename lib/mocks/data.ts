// Utilix — typed mock data for UI development
// Owner: A
// Import from @/lib/mocks for dev/testing before seed data exists.

import type {
  User,
  Department,
  Resource,
  Booking,
  WaitlistEntry,
  Policy,
  Notification,
  CreditLedgerEntry,
} from "@/lib/types";

// ─── Departments ───

export const MOCK_DEPARTMENTS: Department[] = [
  { id: "dept_eng", name: "Engineering", code: "ENG" },
  { id: "dept_design", name: "Design", code: "DSN" },
  { id: "dept_science", name: "Science", code: "SCI" },
];

// ─── Users ───

export const MOCK_USERS: User[] = [
  {
    id: "user_alice",
    role: "student",
    name: "Alice Chen",
    email: "alice@university.edu",
    department_id: "dept_eng",
    year: 3,
    credit_balance: 8,
    free_sessions_used: 1,
    free_sessions_week: "2026-W44",
    active: true,
    created_at: "2026-08-15T09:00:00Z",
  },
  {
    id: "user_bob",
    role: "student",
    name: "Bob Patel",
    email: "bob@university.edu",
    department_id: "dept_design",
    year: 2,
    credit_balance: 10,
    free_sessions_used: 0,
    free_sessions_week: "2026-W44",
    active: true,
    created_at: "2026-09-01T10:00:00Z",
  },
  {
    id: "user_carol",
    role: "coordinator",
    name: "Carol Wu",
    email: "carol@university.edu",
    department_id: "dept_eng",
    year: 0,
    credit_balance: 0,
    free_sessions_used: 0,
    free_sessions_week: "2026-W44",
    active: true,
    created_at: "2026-01-10T08:00:00Z",
  },
  {
    id: "user_dan",
    role: "admin",
    name: "Dan Torres",
    email: "dan@university.edu",
    department_id: "dept_science",
    year: 0,
    credit_balance: 0,
    free_sessions_used: 0,
    free_sessions_week: "2026-W44",
    active: true,
    created_at: "2025-06-01T08:00:00Z",
  },
];

// ─── Resources ───

export const MOCK_RESOURCES: Resource[] = [
  {
    id: "res_printer1",
    name: "Prusa i3 MK4S #1",
    type: "printer_3d",
    department_id: "dept_eng",
    coordinator_id: "user_carol",
    location: "Fab Lab Room 101",
    photo_url: null,
    restricted: false,
    requires_training: "3d_printing_basic",
    credit_cost: 2,
    max_session_minutes: 120,
    status: "available",
    last_inspection_at: "2026-10-01T14:00:00Z",
  },
  {
    id: "res_studio_a",
    name: "Recording Studio A",
    type: "studio",
    department_id: "dept_design",
    coordinator_id: "user_carol",
    location: "Media Building B2",
    photo_url: null,
    restricted: true,
    requires_training: null,
    credit_cost: 1,
    max_session_minutes: 60,
    status: "available",
    last_inspection_at: "2026-10-15T10:00:00Z",
  },
  {
    id: "res_arduino_kit5",
    name: "Arduino Mega Kit #5",
    type: "arduino_kit",
    department_id: "dept_eng",
    coordinator_id: "user_carol",
    location: "Electronics Lab 203",
    photo_url: null,
    restricted: false,
    requires_training: null,
    credit_cost: 0,
    max_session_minutes: 180,
    status: "available",
    last_inspection_at: null,
  },
];

// ─── Bookings ───

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: "bk_001",
    resource_id: "res_printer1",
    user_id: "user_alice",
    member_ids: ["user_alice"],
    team_department_ids: ["dept_eng"],
    bundle_id: null,
    slot_start: "2026-10-30T09:00:00Z",
    slot_end: "2026-10-30T11:00:00Z",
    slot_ids: [
      "res_printer1_20261030T0900",
      "res_printer1_20261030T1000",
    ],
    purpose: "Print enclosure for capstone sensor array",
    declared_deadline: "2026-11-10T00:00:00Z",
    status: "confirmed",
    slot_type: "credit",
    cost_credits: 2,
    allocation_score: 0.82,
    decision_reason: "Highest fairness score; no contention on slot.",
    decision_source: "ai",
    tiebreak: null,
    policy_version: "v1",
    created_at: "2026-10-28T14:30:00Z",
    updated_at: "2026-10-28T15:00:00Z",
  },
  {
    id: "bk_002",
    resource_id: "res_studio_a",
    user_id: "user_bob",
    member_ids: ["user_bob"],
    team_department_ids: ["dept_design"],
    bundle_id: null,
    slot_start: "2026-10-31T14:00:00Z",
    slot_end: "2026-10-31T15:00:00Z",
    slot_ids: ["res_studio_a_20261031T1400"],
    purpose: "Record podcast episode for media course",
    declared_deadline: null,
    status: "pending_approval",
    slot_type: "free",
    cost_credits: 0,
    allocation_score: 0.65,
    decision_reason: "Allocated; studio is restricted, awaiting coordinator approval.",
    decision_source: "ai",
    tiebreak: null,
    policy_version: "v1",
    created_at: "2026-10-29T08:00:00Z",
    updated_at: "2026-10-29T08:15:00Z",
  },
  {
    id: "bk_003",
    resource_id: "res_printer1",
    user_id: "user_bob",
    member_ids: ["user_bob", "user_alice"],
    team_department_ids: ["dept_design", "dept_eng"],
    bundle_id: null,
    slot_start: "2026-10-30T09:00:00Z",
    slot_end: "2026-10-30T10:00:00Z",
    slot_ids: ["res_printer1_20261030T0900"],
    purpose: "Print prototype housing for interdisciplinary project",
    declared_deadline: "2026-11-05T00:00:00Z",
    status: "waitlisted",
    slot_type: "credit",
    cost_credits: 2,
    allocation_score: 0.58,
    decision_reason: "Slot contention with bk_001; lower fairness score.",
    decision_source: "ai",
    tiebreak: { used: true, seed: "utilix-2026-10-30", method: "fewest_sessions_month" },
    policy_version: "v1",
    created_at: "2026-10-28T16:00:00Z",
    updated_at: "2026-10-28T16:10:00Z",
  },
];

// ─── Waitlist entry for bk_003 ───

export const MOCK_WAITLIST: WaitlistEntry[] = [
  {
    id: "wl_001",
    resource_id: "res_printer1",
    slot_id: "res_printer1_20261030T0900",
    booking_id: "bk_003",
    user_id: "user_bob",
    position: 1,
    score: 0.58,
    created_at: "2026-10-28T16:10:00Z",
  },
];

// ─── Policy ───

export const MOCK_POLICY: Policy = {
  id: "v1",
  version: 1,
  is_active: true,
  monthly_credits: 10,
  free_sessions_per_week: 2,
  max_active_bookings: 3,
  slot_minutes: 60,
  cancel_refund_hours: 24,
  weights: {
    usage_fairness: 0.35,
    waiting_time: 0.25,
    declared_need: 0.20,
    interdisciplinary_bonus: 0.20,
  },
  tiebreak_order: ["fewest_sessions_month", "earliest_request", "seeded_lottery"],
  peak_definition: [
    { weekday: 1, start: "10:00", end: "14:00" },
    { weekday: 3, start: "10:00", end: "14:00" },
  ],
  deadline_window_days: 7,
  created_by: "user_dan",
  created_at: "2026-10-01T08:00:00Z",
};

// ─── Notifications ───

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "notif_001",
    user_id: "user_alice",
    type: "booking_confirmed",
    title: "Booking Confirmed",
    body: "Your 3D printer booking on Oct 30 at 09:00 is confirmed.",
    link: "/requests/bk_001",
    read: false,
    created_at: "2026-10-28T15:00:00Z",
  },
  {
    id: "notif_002",
    user_id: "user_bob",
    type: "approval_needed",
    title: "Approval Pending",
    body: "Your studio booking on Oct 31 is awaiting coordinator approval.",
    link: "/requests/bk_002",
    read: true,
    created_at: "2026-10-29T08:15:00Z",
  },
];

// ─── Credit Ledger ───

export const MOCK_CREDIT_LEDGER: CreditLedgerEntry[] = [
  {
    id: "grant_user_alice_2026-10",
    user_id: "user_alice",
    delta: 10,
    reason: "monthly_grant",
    booking_id: null,
    balance_after: 10,
    idempotency_key: "grant_user_alice_2026-10",
    created_at: "2026-10-01T00:00:00Z",
  },
  {
    id: "charge_bk_001",
    user_id: "user_alice",
    delta: -2,
    reason: "booking_charge",
    booking_id: "bk_001",
    balance_after: 8,
    idempotency_key: "charge_bk_001",
    created_at: "2026-10-28T15:00:00Z",
  },
];

