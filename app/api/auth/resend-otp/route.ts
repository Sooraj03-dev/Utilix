import { NextRequest, NextResponse } from "next/server";
import { generateOtp, hashOtp, isValidEmail, normalizeEmail } from "@/lib/auth/otp";
import { getPendingOtp, savePendingOtp } from "@/lib/db/otp-verifications";
import { getEmailProvider } from "@/lib/auth/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, type = "registration" } = body;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "A valid university email address is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await getPendingOtp(normalizedEmail);

    if (!existing) {
      return NextResponse.json(
        { error: "No pending verification found for this email. Please submit the form again." },
        { status: 404 }
      );
    }

    const newOtp = generateOtp();
    const newHash = hashOtp(normalizedEmail, newOtp);

    const saveResult = await savePendingOtp({
      email: normalizedEmail,
      hashedOtp: newHash,
      type: (type as "registration" | "reset_password") || existing.type,
      metadata: existing.metadata,
    });

    if (!saveResult.success) {
      const waitSec = Math.ceil((saveResult.cooldownRemainingMs ?? 60000) / 1000);
      return NextResponse.json(
        { error: `Please wait ${waitSec} seconds before requesting a new code.` },
        { status: 429 }
      );
    }

    const emailProvider = getEmailProvider();
    const sendResult = await emailProvider.sendOtp({
      to: normalizedEmail,
      otp: newOtp,
      type: existing.type,
      userName: (existing.metadata?.name as string) || "Student",
    });

    if (!sendResult.success) {
      return NextResponse.json(
        { error: sendResult.error || "Failed to deliver email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "New verification code sent. Please check your inbox.",
    });
  } catch (error) {
    console.error("[Utilix Resend OTP Error]:", error);
    return NextResponse.json(
      { error: "Internal error processing resend request." },
      { status: 500 }
    );
  }
}
