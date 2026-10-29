import type {
  SeedDataset,
  SeedResource,
  SeedUser,
  SeedBooking,
  SeedTrainingCertification,
  SeedCreditTransaction,
  SeedAvailabilitySlot,
  SeedMaintenanceRecord,
  SeedNotification,
  SeedTrainingRequest,
  SeedAuditLog,
  SeedPolicyConfig,
} from "../types/seed";

const BASE_TS = new Date("2026-08-15T09:00:00.000Z");

function addHours(hours: number): string {
  return new Date(BASE_TS.getTime() + hours * 60 * 60 * 1000).toISOString();
}

function createStudents(): SeedUser[] {
  return Array.from({ length: 12 }).map((_, index) => {
    const num = index + 1;
    return {
      id: `student-${num.toString().padStart(2, "0")}`,
      email: `student${num.toString().padStart(2, "0")}@utilix.local`,
      displayName: `Student ${num.toString().padStart(2, "0")}`,
      role: "student",
      department: num % 2 === 0 ? "ECE" : "CSE",
      credits: 20 + (num % 5) * 5,
      trainingVerified: num % 4 !== 0,
      assignedResourceIds: [],
    };
  });
}

function createCoordinators(): SeedUser[] {
  return [
    {
      id: "coordinator-01",
      email: "coord-lab@utilix.local",
      displayName: "Lab Coordinator",
      role: "coordinator",
      department: "ECE",
      credits: 0,
      trainingVerified: true,
      assignedResourceIds: [
        "resource-arduino-kit-a",
        "resource-esp32-board-a",
        "resource-raspberry-pi-a",
        "resource-lab-equipment-a",
      ],
    },
    {
      id: "coordinator-02",
      email: "coord-media@utilix.local",
      displayName: "Media Coordinator",
      role: "coordinator",
      department: "Media",
      credits: 0,
      trainingVerified: true,
      assignedResourceIds: [
        "resource-dslr-camera-a",
        "resource-recording-rig-a",
        "resource-project-room-a",
      ],
    },
    {
      id: "coordinator-03",
      email: "coord-makerspace@utilix.local",
      displayName: "Makerspace Coordinator",
      role: "coordinator",
      department: "ME",
      credits: 0,
      trainingVerified: true,
      assignedResourceIds: ["resource-3d-printer-a"],
    },
  ];
}

function createAdmins(): SeedUser[] {
  return [
    {
      id: "admin-01",
      email: "admin-platform@utilix.local",
      displayName: "Platform Admin",
      role: "admin",
      department: "Operations",
      credits: 0,
      trainingVerified: true,
      assignedResourceIds: [],
    },
    {
      id: "admin-02",
      email: "admin-policy@utilix.local",
      displayName: "Policy Admin",
      role: "admin",
      department: "Governance",
      credits: 0,
      trainingVerified: true,
      assignedResourceIds: [],
    },
  ];
}

function createResources(): SeedResource[] {
  return [
    { id: "resource-arduino-kit-a", name: "Arduino Starter Kit A", category: "arduino", totalUnits: 4, coordinatorId: "coordinator-01", trainingRequired: false },
    { id: "resource-esp32-board-a", name: "ESP32 IoT Board A", category: "esp32", totalUnits: 5, coordinatorId: "coordinator-01", trainingRequired: false },
    { id: "resource-raspberry-pi-a", name: "Raspberry Pi 5 Bundle A", category: "raspberry-pi", totalUnits: 3, coordinatorId: "coordinator-01", trainingRequired: false },
    { id: "resource-dslr-camera-a", name: "DSLR Camera A", category: "dslr", totalUnits: 1, coordinatorId: "coordinator-02", trainingRequired: true },
    { id: "resource-3d-printer-a", name: "3D Printer A", category: "3d-printer", totalUnits: 1, coordinatorId: "coordinator-03", trainingRequired: true },
    { id: "resource-recording-rig-a", name: "Podcast Recording Rig A", category: "recording", totalUnits: 2, coordinatorId: "coordinator-02", trainingRequired: true },
    { id: "resource-project-room-a", name: "Project Room A-204", category: "project-room", totalUnits: 1, coordinatorId: "coordinator-02", trainingRequired: false },
    { id: "resource-lab-equipment-a", name: "Advanced Lab Equipment Pack A", category: "laboratory", totalUnits: 2, coordinatorId: "coordinator-01", trainingRequired: true },
  ];
}

function createBookings(): SeedBooking[] {
  return [
    {
      id: "booking-approved-arduino",
      resourceId: "resource-arduino-kit-a",
      userId: "student-01",
      coordinatorId: "coordinator-01",
      status: "approved",
      startAt: addHours(2),
      endAt: addHours(5),
    },
    {
      id: "booking-pending-esp32",
      resourceId: "resource-esp32-board-a",
      userId: "student-02",
      status: "pending",
      startAt: addHours(4),
      endAt: addHours(8),
    },
    {
      id: "booking-rejected-eligibility",
      resourceId: "resource-3d-printer-a",
      userId: "student-04",
      coordinatorId: "coordinator-03",
      status: "rejected",
      startAt: addHours(6),
      endAt: addHours(10),
      reason: "TRAINING_MISSING",
    },
    {
      id: "booking-cancelled-room",
      resourceId: "resource-project-room-a",
      userId: "student-05",
      coordinatorId: "coordinator-02",
      status: "cancelled",
      startAt: addHours(24),
      endAt: addHours(27),
      reason: "USER_CANCELLED",
    },
    {
      id: "booking-dslr-approved",
      resourceId: "resource-dslr-camera-a",
      userId: "student-03",
      coordinatorId: "coordinator-02",
      status: "approved",
      startAt: addHours(12),
      endAt: addHours(16),
    },
    {
      id: "booking-dslr-waitlisted",
      resourceId: "resource-dslr-camera-a",
      userId: "student-06",
      status: "waitlisted",
      startAt: addHours(12),
      endAt: addHours(16),
      waitlistRank: 1,
      reason: "RESOURCE_FULL",
    },
    {
      id: "booking-overlap-pending",
      resourceId: "resource-dslr-camera-a",
      userId: "student-07",
      status: "pending",
      startAt: addHours(13),
      endAt: addHours(17),
      reason: "COMPETING_REQUEST",
    },
    {
      id: "booking-maintenance-blocked",
      resourceId: "resource-lab-equipment-a",
      userId: "student-08",
      status: "rejected",
      startAt: addHours(30),
      endAt: addHours(33),
      reason: "MAINTENANCE_WINDOW",
    },
  ];
}

function createCertifications(): SeedTrainingCertification[] {
  return [
    { id: "cert-student-03-dslr", userId: "student-03", resourceCategory: "dslr", certifiedAt: addHours(-120), expiresAt: addHours(24 * 180) },
    { id: "cert-student-06-dslr", userId: "student-06", resourceCategory: "dslr", certifiedAt: addHours(-80), expiresAt: addHours(24 * 120) },
    { id: "cert-student-09-3d", userId: "student-09", resourceCategory: "3d-printer", certifiedAt: addHours(-60), expiresAt: addHours(24 * 100) },
  ];
}

function createCreditTransactions(): SeedCreditTransaction[] {
  return [
    {
      id: "credit-reserve-booking-approved-arduino",
      userId: "student-01",
      bookingId: "booking-approved-arduino",
      action: "reserve",
      delta: -2,
      balanceAfter: 23,
      timestamp: addHours(1),
    },
    {
      id: "credit-spend-booking-approved-arduino",
      userId: "student-01",
      bookingId: "booking-approved-arduino",
      action: "spend",
      delta: -2,
      balanceAfter: 21,
      timestamp: addHours(5),
    },
    {
      id: "credit-refund-booking-cancelled-room",
      userId: "student-05",
      bookingId: "booking-cancelled-room",
      action: "refund",
      delta: 3,
      balanceAfter: 28,
      timestamp: addHours(20),
    },
  ];
}

function createAvailabilitySlots(): SeedAvailabilitySlot[] {
  return [
    { id: "slot-arduino-01", resourceId: "resource-arduino-kit-a", startAt: addHours(2), endAt: addHours(5), capacity: 4, status: "reserved" },
    { id: "slot-dslr-01", resourceId: "resource-dslr-camera-a", startAt: addHours(12), endAt: addHours(16), capacity: 1, status: "reserved" },
    { id: "slot-lab-maintenance", resourceId: "resource-lab-equipment-a", startAt: addHours(30), endAt: addHours(33), capacity: 0, status: "maintenance" },
    { id: "slot-room-01", resourceId: "resource-project-room-a", startAt: addHours(24), endAt: addHours(27), capacity: 1, status: "open" },
  ];
}

function createMaintenance(): SeedMaintenanceRecord[] {
  return [
    {
      id: "maintenance-lab-equipment-a",
      resourceId: "resource-lab-equipment-a",
      coordinatorId: "coordinator-01",
      startAt: addHours(30),
      endAt: addHours(33),
      status: "scheduled",
      note: "Sensor recalibration and safety checks.",
    },
  ];
}

function createTrainingRequests(): SeedTrainingRequest[] {
  return [
    {
      id: "training-request-student-02-3d-printer",
      user_id: "student-02",
      training_type: "3d-printer",
      status: "pending",
      created_at: addHours(-26),
    },
    {
      id: "training-request-student-05-recording",
      user_id: "student-05",
      training_type: "recording",
      status: "pending",
      created_at: addHours(-12),
    },
    {
      id: "training-request-student-07-dslr",
      user_id: "student-07",
      training_type: "dslr",
      status: "pending",
      created_at: addHours(-5),
    },
  ];
}

function createNotifications(): SeedNotification[] {
  return [
    {
      id: "notification-waitlist-promotion-student-06",
      userId: "student-06",
      title: "Waitlist promoted",
      message: "A DSLR slot is now available for your request.",
      createdAt: addHours(18),
      read: false,
    },
    {
      id: "notification-training-failed-student-04",
      userId: "student-04",
      title: "Training required",
      message: "Complete 3D printer training before booking.",
      createdAt: addHours(7),
      read: false,
    },
  ];
}

function createAuditLogs(): SeedAuditLog[] {
  return [
    {
      id: "audit-coordinator-approve-1",
      actorId: "coordinator-02",
      action: "booking.approved",
      entityType: "booking",
      entityId: "booking-dslr-approved",
      createdAt: addHours(11),
      metadata: { scenario: "competing-dslr-requests", winner: "student-03" },
    },
    {
      id: "audit-admin-view-stats",
      actorId: "admin-01",
      action: "analytics.viewed",
      entityType: "dashboard",
      entityId: "platform-insights",
      createdAt: addHours(40),
      metadata: { periodDays: 30 },
    },
  ];
}

function createPolicies(): SeedPolicyConfig[] {
  return [
    {
      id: "policy-default",
      waitlistEnabled: true,
      maxConcurrentBookings: 3,
      trainingEnforcedCategories: ["dslr", "3d-printer", "recording", "laboratory"],
      creditCostByCategory: {
        arduino: 2,
        esp32: 2,
        "raspberry-pi": 3,
        dslr: 4,
        "3d-printer": 5,
        recording: 3,
        "project-room": 3,
        laboratory: 4,
      },
    },
  ];
}

export function buildSeedDataset(): SeedDataset {
  return {
    generatedAt: BASE_TS.toISOString(),
    users: [...createStudents(), ...createCoordinators(), ...createAdmins()],
    resources: createResources(),
    bookings: createBookings(),
    certifications: createCertifications(),
    creditTransactions: createCreditTransactions(),
    availabilitySlots: createAvailabilitySlots(),
    maintenanceRecords: createMaintenance(),
    notifications: createNotifications(),
    trainingRequests: createTrainingRequests(),
    auditLogs: createAuditLogs(),
    policies: createPolicies(),
  };
}

