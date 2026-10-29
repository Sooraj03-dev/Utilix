// Utilix — OTP Verification Persistence (server-only)
import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import {
  OTP_COOLDOWN_MS,
  OTP_EXPIRY_MS,
  MAX_OTP_ATTEMPTS,
  type StoredOtpRecord,
} from "@/lib/auth/otp";

const OTP_COLLECTION = "otp_verifications";

// In-memory fallback for local environments without Firestore emulator/connection
const memoryOtpStore = new Map<string, StoredOtpRecord>();

export interface SaveOtpInput {
  email: string;
  hashedOtp: string;
  type: "registration" | "reset_password";
  metadata?: Record<string, unknown>;
}

/**
 * Creates or replaces a pending OTP verification record.
 * Automatically invalidates previous OTP codes for this email.
 * Enforces a 60-second cooldown between new code requests.
 */
export async function savePendingOtp(
  input: SaveOtpInput,
  now: number = Date.now()
): Promise<{ success: boolean; cooldownRemainingMs?: number }> {
  const normalizedEmail = input.email.trim().toLowerCase();

  // Check cooldown from previous request
  const existing = await getPendingOtp(normalizedEmail);
  if (existing && !existing.verified) {
    const elapsed = now - existing.createdAt;
    if (elapsed >= 0 && elapsed < OTP_COOLDOWN_MS) {
      return {
        success: false,
        cooldownRemainingMs: OTP_COOLDOWN_MS - elapsed,
      };
    }
  }

  const record: StoredOtpRecord = {
    email: normalizedEmail,
    hashedOtp: input.hashedOtp,
    type: input.type,
    createdAt: now,
    expiresAt: now + OTP_EXPIRY_MS,
    attempts: 0,
    maxAttempts: MAX_OTP_ATTEMPTS,
    verified: false,
    ...(input.metadata ? { metadata: input.metadata } : {}),
  };

  // Always keep in memory store
  memoryOtpStore.set(normalizedEmail, record);

  // Persist to Firestore if available
  try {
    if (adminDb) {
      await adminDb.collection(OTP_COLLECTION).doc(normalizedEmail).set(record);
    }
  } catch (err) {
    console.warn("[Utilix Auth] Note: Firestore OTP write fallback to memory store:", err);
  }

  return { success: true };
}

/**
 * Retrieves the pending OTP verification record for an email.
 */
export async function getPendingOtp(email: string): Promise<StoredOtpRecord | null> {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    if (adminDb) {
      const doc = await adminDb.collection(OTP_COLLECTION).doc(normalizedEmail).get();
      if (doc.exists) {
        return doc.data() as StoredOtpRecord;
      }
    }
  } catch {
    // fallback to memory
  }

  return memoryOtpStore.get(normalizedEmail) || null;
}

/**
 * Increments the failed attempt count.
 */
export async function incrementOtpAttempts(email: string): Promise<number> {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await getPendingOtp(normalizedEmail);
  const newAttempts = (existing?.attempts ?? 0) + 1;

  if (existing) {
    existing.attempts = newAttempts;
    memoryOtpStore.set(normalizedEmail, existing);
  }

  try {
    if (adminDb) {
      await adminDb.collection(OTP_COLLECTION).doc(normalizedEmail).update({
        attempts: newAttempts,
      });
    }
  } catch {
    // ignore
  }

  return newAttempts;
}

/**
 * Marks an OTP as verified and consumed.
 */
export async function markOtpVerified(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await getPendingOtp(normalizedEmail);
  if (existing) {
    existing.verified = true;
    memoryOtpStore.set(normalizedEmail, existing);
  }

  try {
    if (adminDb) {
      await adminDb.collection(OTP_COLLECTION).doc(normalizedEmail).update({
        verified: true,
      });
    }
  } catch {
    // ignore
  }
}

/**
 * Completely removes an OTP verification record once lifecycle completes.
 */
export async function deletePendingOtp(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  memoryOtpStore.delete(normalizedEmail);

  try {
    if (adminDb) {
      await adminDb.collection(OTP_COLLECTION).doc(normalizedEmail).delete();
    }
  } catch {
    // ignore
  }
}
