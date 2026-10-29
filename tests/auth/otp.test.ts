import { describe, it, expect } from "vitest";
import {
  generateOtp,
  hashOtp,
  verifyOtpHash,
  evaluateOtpAttempt,
  validatePasswordStrength,
  isValidEmail,
  normalizeEmail,
  OTP_EXPIRY_MS,
  MAX_OTP_ATTEMPTS,
  type StoredOtpRecord,
} from "../../lib/auth/otp";

describe("OTP Cryptographic Engine", () => {
  it("generates a uniform 6-digit numeric string", () => {
    for (let i = 0; i < 50; i++) {
      const otp = generateOtp();
      expect(otp).toMatch(/^\d{6}$/);
      const num = parseInt(otp, 10);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThan(1000000);
    }
  });

  it("produces deterministic HMAC-SHA256 hash bound to normalized email", () => {
    const email1 = "Student@University.EDU ";
    const email2 = "student@university.edu";
    const otp = "849201";

    const hash1 = hashOtp(email1, otp);
    const hash2 = hashOtp(email2, otp);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("verifies matching OTP and rejects mismatched candidate", () => {
    const email = "alice@university.edu";
    const otp = "519382";
    const storedHash = hashOtp(email, otp);

    expect(verifyOtpHash(email, "519382", storedHash)).toBe(true);
    expect(verifyOtpHash(email, "519383", storedHash)).toBe(false);
    expect(verifyOtpHash("other@university.edu", "519382", storedHash)).toBe(false);
  });

  it("evaluates valid OTP attempt successfully", () => {
    const email = "bob@university.edu";
    const otp = "654321";
    const now = 1700000000000;

    const record: StoredOtpRecord = {
      email,
      hashedOtp: hashOtp(email, otp),
      type: "registration",
      createdAt: now,
      expiresAt: now + OTP_EXPIRY_MS,
      attempts: 0,
      maxAttempts: MAX_OTP_ATTEMPTS,
      verified: false,
    };

    const result = evaluateOtpAttempt(record, otp, now + 1000);
    expect(result.success).toBe(true);
  });

  it("rejects attempt when code is expired (> 5 minutes)", () => {
    const email = "bob@university.edu";
    const otp = "654321";
    const now = 1700000000000;

    const record: StoredOtpRecord = {
      email,
      hashedOtp: hashOtp(email, otp),
      type: "registration",
      createdAt: now,
      expiresAt: now + OTP_EXPIRY_MS,
      attempts: 0,
      maxAttempts: MAX_OTP_ATTEMPTS,
      verified: false,
    };

    const result = evaluateOtpAttempt(record, otp, now + OTP_EXPIRY_MS + 1000);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("EXPIRED");
    }
  });

  it("tracks remaining attempts and invalidates on reaching max attempts", () => {
    const email = "carol@university.edu";
    const otp = "112233";
    const now = 1700000000000;

    const record: StoredOtpRecord = {
      email,
      hashedOtp: hashOtp(email, otp),
      type: "registration",
      createdAt: now,
      expiresAt: now + OTP_EXPIRY_MS,
      attempts: 4, // 4 already failed
      maxAttempts: 5,
      verified: false,
    };

    // 5th failed attempt
    const result = evaluateOtpAttempt(record, "999999", now);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("MAX_ATTEMPTS");
    }
  });

  it("prevents reuse of already verified codes", () => {
    const email = "david@university.edu";
    const otp = "334455";
    const now = 1700000000000;

    const record: StoredOtpRecord = {
      email,
      hashedOtp: hashOtp(email, otp),
      type: "registration",
      createdAt: now,
      expiresAt: now + OTP_EXPIRY_MS,
      attempts: 0,
      maxAttempts: 5,
      verified: true, // already used
    };

    const result = evaluateOtpAttempt(record, otp, now);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("ALREADY_VERIFIED");
    }
  });
});

describe("Password Strength and Email Validation", () => {
  it("enforces minimum length and character composition", () => {
    expect(validatePasswordStrength("short").valid).toBe(false);
    expect(validatePasswordStrength("onlyletters").valid).toBe(false);
    expect(validatePasswordStrength("12345678").valid).toBe(false);
    expect(validatePasswordStrength("Password123!").valid).toBe(true);
    expect(validatePasswordStrength("securepass1").valid).toBe(true);
  });

  it("validates and normalizes campus email addresses", () => {
    expect(isValidEmail("student@campus.edu")).toBe(true);
    expect(isValidEmail("invalid-email")).toBe(false);
    expect(isValidEmail("@campus.edu")).toBe(false);

    expect(normalizeEmail("  Aarav.Sharma@Campus.EDU ")).toBe("aarav.sharma@campus.edu");
  });
});
