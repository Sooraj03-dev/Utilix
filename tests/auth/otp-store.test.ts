import { describe, it, expect } from "vitest";
import {
  savePendingOtp,
  getPendingOtp,
  incrementOtpAttempts,
  markOtpVerified,
  deletePendingOtp,
} from "../../lib/db/otp-verifications";

describe("Pending OTP Persistence Store", () => {
  it("saves, retrieves, and updates pending OTP records", async () => {
    const email = "persisted.student@campus.edu";
    const now = 1710000000000;

    const saveResult = await savePendingOtp(
      {
        email,
        hashedOtp: "dummy-hash-123",
        type: "registration",
        metadata: { name: "Persisted Student" },
      },
      now
    );

    expect(saveResult.success).toBe(true);

    const record = await getPendingOtp(email);
    expect(record).not.toBeNull();
    expect(record?.email).toBe(email);
    expect(record?.attempts).toBe(0);

    // Increment attempts
    const newAttempts = await incrementOtpAttempts(email);
    expect(newAttempts).toBe(1);

    const updated = await getPendingOtp(email);
    expect(updated?.attempts).toBe(1);

    // Mark verified
    await markOtpVerified(email);
    const verifiedRecord = await getPendingOtp(email);
    expect(verifiedRecord?.verified).toBe(true);

    // Delete
    await deletePendingOtp(email);
    const deletedRecord = await getPendingOtp(email);
    expect(deletedRecord).toBeNull();
  });

  it("enforces 60-second cooldown between code requests", async () => {
    const email = "cooldown.student@campus.edu";
    await deletePendingOtp(email);
    const now = 1710000000000;

    const first = await savePendingOtp(
      {
        email,
        hashedOtp: "hash-one",
        type: "registration",
      },
      now
    );
    expect(first.success).toBe(true);

    // Request within 30 seconds should be blocked
    const second = await savePendingOtp(
      {
        email,
        hashedOtp: "hash-two",
        type: "registration",
      },
      now + 30000
    );
    expect(second.success).toBe(false);
    expect(second.cooldownRemainingMs).toBe(30000);

    // Request after 61 seconds succeeds and invalidates prior
    const third = await savePendingOtp(
      {
        email,
        hashedOtp: "hash-three",
        type: "registration",
      },
      now + 61000
    );
    expect(third.success).toBe(true);

    const current = await getPendingOtp(email);
    expect(current?.hashedOtp).toBe("hash-three");
  });
});
