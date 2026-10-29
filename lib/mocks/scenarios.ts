import { buildSeedDataset } from "./seed-data";

export interface ScenarioResult {
  scenario: string;
  passed: boolean;
  detail: string;
}

export function runMockScenarios(): ScenarioResult[] {
  const data = buildSeedDataset();

  const hasArduinoRequest = data.bookings.some(
    (booking) =>
      booking.resourceId === "resource-arduino-kit-a" &&
      booking.userId === "student-01" &&
      booking.status === "approved",
  );

  const competingDslrCount = data.bookings.filter(
    (booking) => booking.resourceId === "resource-dslr-camera-a",
  ).length;

  const trainingFailureExists = data.bookings.some(
    (booking) =>
      booking.userId === "student-04" &&
      booking.status === "rejected" &&
      booking.reason === "TRAINING_MISSING",
  );

  const coordinatorApprovalExists = data.auditLogs.some(
    (log) =>
      log.actorId === "coordinator-02" &&
      log.action === "booking.approved" &&
      log.entityId === "booking-dslr-approved",
  );

  const maintenanceBlockExists = data.maintenanceRecords.some(
    (record) => record.resourceId === "resource-lab-equipment-a",
  );

  const waitlistPromotionExists = data.notifications.some(
    (notification) => notification.id === "notification-waitlist-promotion-student-06",
  );

  const hasReserveSpendRefund =
    data.creditTransactions.some((tx) => tx.action === "reserve") &&
    data.creditTransactions.some((tx) => tx.action === "spend") &&
    data.creditTransactions.some((tx) => tx.action === "refund");

  const adminStatsView = data.auditLogs.some(
    (log) => log.actorId === "admin-01" && log.action === "analytics.viewed",
  );

  return [
    {
      scenario: "student requests an Arduino kit",
      passed: hasArduinoRequest,
      detail: "booking-approved-arduino",
    },
    {
      scenario: "two students compete for one DSLR camera",
      passed: competingDslrCount >= 2,
      detail: `dslrBookings=${competingDslrCount}`,
    },
    {
      scenario: "student fails training eligibility",
      passed: trainingFailureExists,
      detail: "booking-rejected-eligibility",
    },
    {
      scenario: "coordinator approves a booking",
      passed: coordinatorApprovalExists,
      detail: "audit-coordinator-approve-1",
    },
    {
      scenario: "resource becomes unavailable due to maintenance",
      passed: maintenanceBlockExists,
      detail: "maintenance-lab-equipment-a",
    },
    {
      scenario: "waitlisted student receives a slot",
      passed: waitlistPromotionExists,
      detail: "notification-waitlist-promotion-student-06",
    },
    {
      scenario: "credits are reserved, spent, and refunded",
      passed: hasReserveSpendRefund,
      detail: "credit-reserve/spend/refund",
    },
    {
      scenario: "administrator views platform statistics",
      passed: adminStatsView,
      detail: "audit-admin-view-stats",
    },
  ];
}

