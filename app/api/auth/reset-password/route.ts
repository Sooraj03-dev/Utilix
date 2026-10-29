import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import {
  evaluateOtpAttempt,
  normalizeEmail,
  validatePasswordStrength,
} from "@/lib/auth/otp";
import {
  deletePendingOtp,
  getPendingOtp,
  incrementOtpAttempts,
} from "@/lib/db/otp-verifications";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp, newPassword, confirmPassword } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and 6-digit verification code are required." },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== "string") {
      return NextResponse.json(
        { error: "New password is required." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 }
      );
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return NextResponse.json(
        { error: strength.message },
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

    // Verified! Now update password in Firebase Auth
    if (adminAuth) {
      try {
        const user = await adminAuth.getUserByEmail(normalizedEmail);
        if (user) {
          await adminAuth.updateUser(user.uid, {
            password: newPassword,
          });
        }
      } catch (authErr) {
        console.error("[Utilix Password Update Error]:", authErr);
        return NextResponse.json(
          { error: "Could not update password. Please try again." },
          { status: 500 }
        );
      }
    }

    await deletePendingOtp(normalizedEmail);

    return NextResponse.json({
      ok: true,
      message: "Password has been successfully reset. Please sign in with your new password.",
    });
  } catch (error) {
    console.error("[Utilix Reset Password Error]:", error);
    return NextResponse.json(
      { error: "Internal server error during password reset." },
      { status: 500 }
    );
  }
}
