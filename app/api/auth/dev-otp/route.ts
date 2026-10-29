import { NextRequest, NextResponse } from "next/server";
import { getDevLatestOtp } from "@/lib/auth/email";

export async function GET(req: NextRequest) {
  // STRICT GUARD: Disabled in production to prevent token leakage
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Endpoint not available in production." }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email query param required." }, { status: 400 });
  }

  const otp = getDevLatestOtp(email);
  if (!otp) {
    return NextResponse.json(
      { error: "No dev OTP found for this email. Please request an OTP first." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    email,
    otp,
    note: "LOCAL DEVELOPMENT ONLY. Never exposed in production.",
  });
}
