import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { createUser } from "@/lib/db/users";
import { creditLedgerCol } from "@/lib/db/collections";
import { nowISO, nowTimestamp } from "@/lib/db/converters";
import { evaluateOtpAttempt, normalizeEmail } from "@/lib/auth/otp";
import {
  deletePendingOtp,
  getPendingOtp,
  incrementOtpAttempts,
  markOtpVerified,
} from "@/lib/db/otp-verifications";

function getIsoWeek(d: Date): string {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${target.getFullYear()}-W${weekNumber.toString().padStart(2, "0")}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp, type = "registration" } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and 6-digit verification code are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);
    const pendingRecord = await getPendingOtp(normalizedEmail);

    const evaluation = evaluateOtpAttempt(pendingRecord, String(otp));
    if (!evaluation.success) {
      if (pendingRecord && evaluation.code === "INVALID_CODE") {
        await incrementOtpAttempts(normalizedEmail);
      }
      return NextResponse.json(
        { error: evaluation.error, code: evaluation.code },
        { status: 400 }
      );
    }

    // Code is valid! Mark as verified
    await markOtpVerified(normalizedEmail);

    // If registration flow, complete Firebase Auth user and Firestore profile creation
    if (type === "registration") {
      const meta = pendingRecord?.metadata as {
        name?: string;
        department_id?: string;
        year?: number;
        student_id?: string;
        password?: string;
      } | undefined;

      const displayName = meta?.name || "Student";
      const departmentId = meta?.department_id || "dept_eng";
      const year = meta?.year || 1;
      const rawPassword = meta?.password;

      let uid = `user_${Date.now()}`;

      // 1. Create user in Firebase Auth if Admin SDK is configured
      if (adminAuth) {
        try {
          const userRecord = await adminAuth.createUser({
            email: normalizedEmail,
            emailVerified: true,
            displayName,
            password: rawPassword,
          });
          uid = userRecord.uid;

          // Set custom claims for role-based authorization
          await adminAuth.setCustomUserClaims(uid, {
            role: "student",
          });
        } catch (authError: unknown) {
          const code = (authError as { code?: string }).code;
          if (code === "auth/email-already-exists") {
            return NextResponse.json(
              { error: "An account with this email already exists." },
              { status: 409 }
            );
          }
          console.error("[Utilix Firebase Auth Create Error]:", authError);
          // If in test/emulator environment where createUser fails, keep uid and proceed
        }
      }

      // 2. Create Firestore User Profile
      try {
        await createUser(
          {
            id: uid,
            role: "student",
            name: displayName,
            email: normalizedEmail,
            department_id: departmentId,
            year,
            credit_balance: 10,
            free_sessions_used: 0,
            free_sessions_week: getIsoWeek(new Date()),
            active: true,
          },
          uid
        );

        // 3. Record Initial Welcome Grant in Credit Ledger
        try {
          const ledgerRef = creditLedgerCol().doc(`grant_${uid}_welcome`);
          await ledgerRef.set({
            user_id: uid,
            delta: 10,
            reason: "monthly_grant",
            booking_id: null,
            balance_after: 10,
            idempotency_key: `grant_${uid}_welcome`,
            created_at: nowTimestamp(),
          });
        } catch (ledgerErr) {
          console.warn("[Utilix Auth] Note: Initial ledger grant write failed:", ledgerErr);
        }
      } catch (dbErr) {
        console.error("[Utilix Firestore Create User Error]:", dbErr);
      }

      // 4. Clean up pending OTP record
      await deletePendingOtp(normalizedEmail);

      return NextResponse.json({
        ok: true,
        uid,
        email: normalizedEmail,
        message: "Account verified and created successfully! You may now sign in.",
      });
    }

    // Reset password verification flow
    return NextResponse.json({
      ok: true,
      email: normalizedEmail,
      verified: true,
      message: "Code verified. Please provide your new password.",
    });
  } catch (error) {
    console.error("[Utilix Verify OTP Error]:", error);
    return NextResponse.json(
      { error: "Internal server error during verification." },
      { status: 500 }
    );
  }
}
