import { describe, expect, it } from "vitest";
import { buildSeedDataset } from "../../lib/mocks/seed-data";
import { runMockScenarios } from "../../lib/mocks/scenarios";
import { runSeed } from "../../scripts/seed";

describe("seed data", () => {
  it("creates required role counts", () => {
    const data = buildSeedDataset();
    const students = data.users.filter((user) => user.role === "student");
    const coordinators = data.users.filter((user) => user.role === "coordinator");
    const admins = data.users.filter((user) => user.role === "admin");

    expect(students).toHaveLength(12);
    expect(coordinators).toHaveLength(3);
    expect(admins).toHaveLength(2);
  });

  it("is deterministic and idempotent", () => {
    expect(buildSeedDataset()).toEqual(buildSeedDataset());
  });

  it("keeps references valid", () => {
    const data = buildSeedDataset();
    const userIds = new Set(data.users.map((user) => user.id));
    const resourceIds = new Set(data.resources.map((resource) => resource.id));

    for (const booking of data.bookings) {
      expect(userIds.has(booking.userId)).toBe(true);
      expect(resourceIds.has(booking.resourceId)).toBe(true);
    }
  });

  it("assigns coordinator ownership to resources", () => {
    const data = buildSeedDataset();
    const coordinatorIds = new Set(
      data.users.filter((user) => user.role === "coordinator").map((user) => user.id),
    );

    for (const resource of data.resources) {
      expect(coordinatorIds.has(resource.coordinatorId)).toBe(true);
    }
  });

  it("contains an overlapping booking conflict", () => {
    const data = buildSeedDataset();
    const dslrBookings = data.bookings.filter(
      (booking) => booking.resourceId === "resource-dslr-camera-a",
    );
    expect(dslrBookings.length).toBeGreaterThanOrEqual(2);
  });

  it("contains reserve/spend/refund credit flow", () => {
    const actions = new Set(buildSeedDataset().creditTransactions.map((tx) => tx.action));
    expect(actions.has("reserve")).toBe(true);
    expect(actions.has("spend")).toBe(true);
    expect(actions.has("refund")).toBe(true);
  });

  it("contains expected deterministic mock scenarios", () => {
    const results = runMockScenarios();
    expect(results.every((scenario) => scenario.passed)).toBe(true);
  });

  it("blocks live seeding when ALLOW_SEED is false", async () => {
    const oldAllowSeed = process.env.ALLOW_SEED;
    process.env.ALLOW_SEED = "false";
    await expect(runSeed("demo")).rejects.toThrow("Seeding is disabled");
    process.env.ALLOW_SEED = oldAllowSeed;
  });
});
