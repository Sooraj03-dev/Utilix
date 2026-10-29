import { describe, it, expect, beforeAll } from "vitest";

// Ensure emulator env vars are set before importing admin SDK
process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
process.env.FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || "demo-utilix";

import { adminDb } from "@/lib/firebase/admin";
import { createUser } from "@/lib/db/users";
import {
  applyCredit,
  reconcileBalance,
} from "@/lib/db/ledger";
import { acquireSlotLocks, releaseSlotLocks } from "@/lib/db/slots";
import { InsufficientCreditsError, SlotTakenError } from "@/lib/db/errors";

describe("Firestore Emulator Database Tests", () => {
  const testUserId = `test_user_${Date.now()}`;

  beforeAll(async () => {
    // Create test user doc in Firestore emulator with initial balance 0, then grant 10
    await createUser(
      {
        id: testUserId,
        role: "student",
        name: "Test Student",
        email: "test.student@university.edu",
        department_id: "dept_eng",
        year: 2,
        credit_balance: 0,
        free_sessions_used: 0,
        free_sessions_week: "2026-W44",
        active: true,
      },
      testUserId
    );

    await applyCredit({
      userId: testUserId,
      delta: 10,
      reason: "monthly_grant",
      idempotencyKey: `init_grant_${testUserId}`,
    });
  });

  describe("Ledger Idempotency", () => {
    it("returns identical entry and applies delta exactly once when called with same idempotency key", async () => {
      const idempotencyKey = `idemp_test_${Date.now()}`;

      // First application: delta +5
      const res1 = await applyCredit({
        userId: testUserId,
        delta: 5,
        reason: "adjustment",
        idempotencyKey,
      });

      expect(res1.balance_after).toBe(15);
      expect(res1.idempotency_key).toBe(idempotencyKey);

      // Second application with the same key
      const res2 = await applyCredit({
        userId: testUserId,
        delta: 5,
        reason: "adjustment",
        idempotencyKey,
      });

      // Must be a no-op returning the original row
      expect(res2.idempotency_key).toBe(idempotencyKey);
      expect(res2.balance_after).toBe(15);

      // User balance must remain 15, not 20
      const rec = await reconcileBalance(testUserId);
      expect(rec.recordedBalance).toBe(15);
    });
  });

  describe("No Negative Balance", () => {
    it("rejects delta if balance would fall below 0 with InsufficientCreditsError", async () => {
      const recBefore = await reconcileBalance(testUserId);
      const currentBalance = recBefore.recordedBalance;

      // Attempt to debit more than current balance
      const excessiveDebit = -(currentBalance + 10);
      const key = `debit_fail_${Date.now()}`;

      await expect(
        applyCredit({
          userId: testUserId,
          delta: excessiveDebit,
          reason: "booking_charge",
          idempotencyKey: key,
        })
      ).rejects.toThrow(InsufficientCreditsError);

      // Verify balance is completely untouched
      const recAfter = await reconcileBalance(testUserId);
      expect(recAfter.recordedBalance).toBe(currentBalance);
    });
  });

  describe("Reconciliation after 20 operations", () => {
    it("matches calculated ledger sum with recorded users.credit_balance", async () => {
      const reconUserId = `recon_user_${Date.now()}`;
      await createUser(
        {
          id: reconUserId,
          role: "student",
          name: "Recon User",
          email: "recon@university.edu",
          department_id: "dept_eng",
          year: 1,
          credit_balance: 0,
          free_sessions_used: 0,
          free_sessions_week: "2026-W44",
          active: true,
        },
        reconUserId
      );

      // Initial ledger grant entry: 50 credits
      await applyCredit({
        userId: reconUserId,
        delta: 50,
        reason: "monthly_grant",
        idempotencyKey: `recon_init_${Date.now()}`,
      });

      // 20 random operations (safe credits/debits keeping balance positive)
      for (let i = 0; i < 20; i++) {
        // Deltas between -2 and +3
        const delta = i % 2 === 0 ? -1 : 2;
        await applyCredit({
          userId: reconUserId,
          delta,
          reason: delta < 0 ? "booking_charge" : "refund_early_cancel",
          idempotencyKey: `recon_op_${reconUserId}_${i}`,
        });
      }

      const rec = await reconcileBalance(reconUserId);
      expect(rec.matched).toBe(true);
      expect(rec.recordedBalance).toBe(rec.calculatedBalance);
      expect(rec.deltaCount).toBe(21); // initial + 20 ops
    });
  });

  describe("Slot Lock Contention", () => {
    it("ensures exactly one of two concurrent acquireSlotLocks succeeds", async () => {
      const slotId = `slot_contest_${Date.now()}`;

      const attempt1 = adminDb.runTransaction(async (tx) => {
        await acquireSlotLocks(tx, "bk_alpha", "user_1", [slotId]);
      });

      const attempt2 = adminDb.runTransaction(async (tx) => {
        await acquireSlotLocks(tx, "bk_beta", "user_2", [slotId]);
      });

      const results = await Promise.allSettled([attempt1, attempt2]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      const err = (rejected[0] as PromiseRejectedResult).reason;
      expect(err).toBeInstanceOf(SlotTakenError);
      expect((err as SlotTakenError).slotId).toBe(slotId);

      // Clean up lock
      await adminDb.runTransaction(async (tx) => {
        releaseSlotLocks(tx, [slotId]);
      });
    });
  });
});
