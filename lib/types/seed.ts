export type Role = "student" | "coordinator" | "admin";
export type BookingStatus = "approved" | "pending" | "rejected" | "cancelled" | "waitlisted";

export interface SeedUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  department: string;
  credits: number;
  trainingVerified: boolean;
  assignedResourceIds: string[];
}

export interface SeedResource {
  id: string;
  name: string;
  category:
    | "arduino"
    | "esp32"
    | "raspberry-pi"
    | "dslr"
    | "3d-printer"
    | "recording"
    | "project-room"
    | "laboratory";
  totalUnits: number;
  coordinatorId: string;
  trainingRequired: boolean;
}

export interface SeedBooking {
  id: string;
  resourceId: string;
  userId: string;
  coordinatorId?: string;
  status: BookingStatus;
  startAt: string;
  endAt: string;
  reason?: string;
  waitlistRank?: number;
}

export interface SeedTrainingCertification {
  id: string;
  userId: string;
  resourceCategory: SeedResource["category"];
  certifiedAt: string;
  expiresAt: string;
}

export interface SeedCreditTransaction {
  id: string;
  userId: string;
  bookingId: string;
  action: "reserve" | "spend" | "refund";
  delta: number;
  balanceAfter: number;
  timestamp: string;
}

export interface SeedAvailabilitySlot {
  id: string;
  resourceId: string;
  startAt: string;
  endAt: string;
  capacity: number;
  status: "open" | "reserved" | "maintenance";
}

export interface SeedMaintenanceRecord {
  id: string;
  resourceId: string;
  coordinatorId: string;
  startAt: string;
  endAt: string;
  status: "scheduled" | "in-progress" | "completed";
  note: string;
}

export interface SeedTrainingRequest {
  id: string;
  user_id: string;
  training_type: string;
  status: "pending";
  created_at: string;
}

export interface SeedNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface SeedAuditLog {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  metadata: Record<string, string | number | boolean>;
}

export interface SeedPolicyConfig {
  id: string;
  waitlistEnabled: boolean;
  maxConcurrentBookings: number;
  trainingEnforcedCategories: SeedResource["category"][];
  creditCostByCategory: Record<SeedResource["category"], number>;
}

export interface SeedDataset {
  generatedAt: string;
  users: SeedUser[];
  resources: SeedResource[];
  bookings: SeedBooking[];
  certifications: SeedTrainingCertification[];
  creditTransactions: SeedCreditTransaction[];
  availabilitySlots: SeedAvailabilitySlot[];
  maintenanceRecords: SeedMaintenanceRecord[];
  notifications: SeedNotification[];
  trainingRequests: SeedTrainingRequest[];
  auditLogs: SeedAuditLog[];
  policies: SeedPolicyConfig[];
}

