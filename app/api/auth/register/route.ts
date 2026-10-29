import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { listUsers } from "@/lib/db/users";
import {
  generateOtp,
  hashOtp,
  isValidEmail,
  normalizeEmail,
  validatePasswordStrength,
} from "@/lib/auth/otp";
import { savePendingOtp } from "@/lib/db/otp-verifications";
import { getEmailProvider } from "@/lib/auth/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      password,
      confirmPassword,
      department_id,
      year,
      student_id,
      termsAccepted,
    } = body;

    // 1. Validate required fields
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Full name is required (minimum 2 characters)." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "A valid university email address is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required." },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 }
      );
    }

    const passwordStrength = validatePasswordStrength(password);
    if (!passwordStrength.valid) {
      return NextResponse.json(
        { error: passwordStrength.message },
        { status: 400 }
      );
    }

    if (!department_id || typeof department_id !== "string") {
      return NextResponse.json(
        { error: "Department selection is required." },
        { status: 400 }
      );
    }

    if (!termsAccepted) {
      return NextResponse.json(
        { error: "You must accept the Utilix Fair Share and Terms of Service." },
        { status: 400 }
      );
    }

    // 2. Check if user already exists in Firebase Auth
    if (adminAuth) {
      try {
        const existingAuthUser = await adminAuth.getUserByEmail(normalizedEmail);
        if (existingAuthUser) {
          return NextResponse.json(
            { error: "An account with this email address already exists. Please sign in." },
            { status: 409 }
          );
        }
      } catch (authError: unknown) {
        // Firebase Auth throws auth/user-not-found when user doesn't exist, which is expected
        const code = (authError as { code?: string }).code;
        if (code && code !== "auth/user-not-found") {
          console.warn("[Utilix Auth] Error checking existing user:", authError);
        }
      }
    }

    // Also check Firestore user list
    try {
      const existingDbUsers = await listUsers();
      if (existingDbUsers.some((u) => u.email.toLowerCase() === normalizedEmail)) {
        return NextResponse.json(
          { error: "An account with this email address already exists. Please sign in." },
          { status: 409 }
        );
      }
    } catch {
      // ignore
    }

    // 3. Generate 6-digit OTP and secure HMAC-SHA256 hash
    const otp = generateOtp();
    const hashedOtp = hashOtp(normalizedEmail, otp);

    // 4. Save pending verification with cooldown check
    const saveResult = await savePendingOtp({
      email: normalizedEmail,
      hashedOtp,
      type: "registration",
      metadata: {
        name: name.trim(),
        department_id: department_id.trim(),
        year: Number(year) || 1,
        student_id: student_id ? String(student_id).trim() : null,
        password, // stored ephemerally during the 5-min OTP verification window
      },
    });

    if (!saveResult.success) {
      const waitSec = Math.ceil((saveResult.cooldownRemainingMs ?? 60000) / 1000);
      return NextResponse.json(
        { error: `Please wait ${waitSec} seconds before requesting another code.` },
        { status: 429 }
      );
    }

    // 5. Send OTP via configured email provider
    const emailProvider = getEmailProvider();
    const sendResult = await emailProvider.sendOtp({
      to: normalizedEmail,
      otp,
      type: "registration",
      userName: name.trim(),
    });

    if (!sendResult.success) {
      return NextResponse.json(
        { error: sendResult.error || "Failed to send verification email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      email: normalizedEmail,
      message: "Verification code sent to your email. Valid for 5 minutes.",
    });
  } catch (error) {
    console.error("[Utilix Registration Error]:", error);
    return NextResponse.json(
      { error: "Internal server error during registration." },
      { status: 500 }
    );
  }
}
