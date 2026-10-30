import { NextResponse } from "next/server";
import type { Role } from "@/components/types";

// Server-only mapping of the existing Firebase demo accounts (Requirements 3 & 9)
const DEMO_ACCOUNTS: Record<Role, { email: string }> = {
  student: { email: "student01@utilix.local" },
  coordinator: { email: "coord-lab@utilix.local" },
  admin: { email: "admin-platform@utilix.local" },
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { role?: Role };
    const role = body.role;

    if (!role || !(role in DEMO_ACCOUNTS)) {
      return NextResponse.json(
        { error: "Invalid demo role requested. Allowed: student, coordinator, admin." },
        { status: 400 },
      );
    }

    const account = DEMO_ACCOUNTS[role];
    const password = process.env.DEFAULT_SEED_PASSWORD || "UtilixPassword2026!";

    return NextResponse.json({
      role,
      email: account.email,
      password,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to retrieve demo credentials." },
      { status: 500 },
    );
  }
}

