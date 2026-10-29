import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { generateOtp, hashOtp, isValidEmail, normalizeEmail } from "@/lib/auth/otp";
import { savePendingOtp } from "@/lib/db/otp-verifications";
import { getEmailProvider } from "@/lib/auth/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "A valid university email address is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);

    // Check if user exists in Firebase Auth
    let userExists = false;
    let displayName = "Student";

    if (adminAuth) {
      try {
        const user = await adminAuth.getUserByEmail(normalizedEmail);
        if (user) {
          userExists = true;
          displayName = user.displayName || "Student";
        }
      } catch {
        // user-not-found or other error
      }
    } else {
      // In mock/fallback mode, assume exists for test
      userExists = true;
    }

    if (!userExists) {
      // Return 200 with generic message to prevent email enumeration
      return NextResponse.json({
        ok: true,
        message: "If an account exists with this email, a verification code has been sent.",
      });
    }

    const otp = generateOtp();
    const hashedOtp = hashOtp(normalizedEmail, otp);

    const saveResult = await savePendingOtp({
      email: normalizedEmail,
      hashedOtp,
      type: "reset_password",
      metadata: { displayName },
    });

    if (!saveResult.success) {
      const waitSec = Math.ceil((saveResult.cooldownRemainingMs ?? 60000) / 1000);
      return NextResponse.json(
        { error: `Please wait ${waitSec} seconds before requesting another code.` },
        { status: 429 }
      );
    }

    const emailProvider = getEmailProvider();
    await emailProvider.sendOtp({
      to: normalizedEmail,
      otp,
      type: "reset_password",
      userName: displayName,
    });

    return NextResponse.json({
      ok: true,
      message: "If an account exists with this email, a verification code has been sent.",
    });
  } catch (error) {
    console.error("[Utilix Forgot Password Error]:", error);
    return NextResponse.json(
      { error: "Internal error processing password recovery request." },
      { status: 500 }
    );
  }
}
