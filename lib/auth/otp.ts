import crypto from "node:crypto";

export const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
export const OTP_COOLDOWN_MS = 60 * 1000; // 60 seconds
export const MAX_OTP_ATTEMPTS = 5;

const OTP_SECRET = process.env.OTP_SECRET || "utilix-auth-otp-secure-salt-2026";

/**
 * Generates a cryptographically secure 6-digit numeric string (100000 - 999999).
 */
export function generateOtp(): string {
  const number = crypto.randomInt(100000, 1000000);
  return number.toString();
}

/**
 * Creates a secure HMAC-SHA256 hash of the OTP bound to the normalized email address.
 * Plaintext OTP is never stored or returned to clients in production.
 */
export function hashOtp(email: string, otp: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  return crypto
    .createHmac("sha256", OTP_SECRET)
    .update(`${normalizedEmail}:${otp.trim()}`)
    .digest("hex");
}

/**
 * Verifies if a provided candidate OTP matches the stored hash for this email.
 */
export function verifyOtpHash(email: string, candidateOtp: string, expectedHash: string): boolean {
  const candidateHash = hashOtp(email, candidateOtp);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(candidateHash, "hex"),
      Buffer.from(expectedHash, "hex")
    );
  } catch {
    return false;
  }
}

export interface StoredOtpRecord {
  email: string;
  hashedOtp: string;
  type: "registration" | "reset_password";
  createdAt: number;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
  verified: boolean;
  metadata?: Record<string, unknown>;
}

export type OtpVerificationResult =
  | { success: true; record: StoredOtpRecord }
  | { success: false; error: string; code: "EXPIRED" | "MAX_ATTEMPTS" | "INVALID_CODE" | "ALREADY_VERIFIED" | "NOT_FOUND" };

/**
 * Validates verification attempt against stored record rules.
 */
export function evaluateOtpAttempt(
  record: StoredOtpRecord | null | undefined,
  candidateOtp: string,
  now: number = Date.now()
): OtpVerificationResult {
  if (!record) {
    return { success: false, error: "No pending verification code found. Please request a new code.", code: "NOT_FOUND" };
  }

  if (record.verified) {
    return { success: false, error: "This verification code has already been used.", code: "ALREADY_VERIFIED" };
  }

  if (now > record.expiresAt) {
    return { success: false, error: "Verification code has expired. Please request a new code.", code: "EXPIRED" };
  }

  if (record.attempts >= record.maxAttempts) {
    return {
      success: false,
      error: "Too many failed attempts. For security, this code is now invalidated. Please request a new code.",
      code: "MAX_ATTEMPTS",
    };
  }

  const isValid = verifyOtpHash(record.email, candidateOtp, record.hashedOtp);
  if (!isValid) {
    const remaining = record.maxAttempts - (record.attempts + 1);
    const errorMsg = remaining > 0
      ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
      : "Too many failed attempts. This code is now invalidated.";

    return {
      success: false,
      error: errorMsg,
      code: remaining > 0 ? "INVALID_CODE" : "MAX_ATTEMPTS",
    };
  }

  return { success: true, record };
}

/**
 * Password validation rule: at least 8 chars, at least one letter, at least one number.
 */
export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long." };
  }
  if (!/[A-Za-z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one number." };
  }
  return { valid: true };
}

/**
 * Email validation and normalization.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}
