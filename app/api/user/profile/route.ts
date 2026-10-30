import { NextRequest, NextResponse } from "next/server";
import { requireUser, authErrorToResponse, extractBearerToken } from "@/lib/auth/server";
import { completeUserProfile, getUserProfileByUid, updateUserProfile } from "@/lib/db/users";
import { isMockAuthEnabled, SESSION_COOKIE_NAME } from "@/lib/auth/config";

export const dynamic = "force-dynamic";

const VALID_DEPARTMENT_IDS = new Set(["dept_eng", "dept_design", "dept_science"]);

// USN / Student Registration Number format: e.g. 1MS21CS001, 24BCE1001, CS2021001
const STUDENT_ID_REGEX = /^[A-Za-z0-9\-_]{3,25}$/;

// Phone number: optional country code, 10-18 digits/spaces/dashes
const PHONE_REGEX = /^[+]?[\d\s\-()]{10,18}$/;

export async function GET(request: NextRequest | Request) {
  try {
    const user = await requireUser(request);
    const profile = await getUserProfileByUid(user.uid);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }
    return NextResponse.json({ user: profile });
  } catch (error) {
    return authErrorToResponse(error);
  }
}

export async function POST(request: NextRequest | Request) {
  try {
    const user = await requireUser(request);
    const body = await request.json().catch(() => ({}));

    // Server-side validation
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    if (displayName.length < 2 || displayName.length > 100) {
      return NextResponse.json(
        { error: "Full name must be between 2 and 100 characters." },
        { status: 400 },
      );
    }

    const studentId = typeof body.studentId === "string" ? body.studentId.trim().toUpperCase() : "";
    if (!studentId || !STUDENT_ID_REGEX.test(studentId)) {
      return NextResponse.json(
        { error: "Valid Student USN / Registration Number is required (3-25 alphanumeric characters)." },
        { status: 400 },
      );
    }

    const departmentId = typeof body.departmentId === "string" ? body.departmentId.trim() : "";
    if (!departmentId || !VALID_DEPARTMENT_IDS.has(departmentId)) {
      return NextResponse.json(
        { error: "Valid academic department selection is required." },
        { status: 400 },
      );
    }

    const year = Number(body.year);
    if (isNaN(year) || year < 1 || year > 6) {
      return NextResponse.json(
        { error: "Academic year must be between 1 and 6." },
        { status: 400 },
      );
    }

    const semester = Number(body.semester);
    if (isNaN(semester) || semester < 1 || semester > 12) {
      return NextResponse.json(
        { error: "Academic semester must be between 1 and 12." },
        { status: 400 },
      );
    }

    const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
    if (!phoneNumber || !PHONE_REGEX.test(phoneNumber)) {
      return NextResponse.json(
        { error: "Please enter a valid phone number (at least 10 digits)." },
        { status: 400 },
      );
    }

    const campus = typeof body.campus === "string" && body.campus.trim().length > 0
      ? body.campus.trim()
      : "Main Campus";

    const photoURL = typeof body.photoURL === "string" && body.photoURL.startsWith("http")
      ? body.photoURL
      : user.photoURL;

    // Role safety: Users can only request student or coordinator. Administrator is NEVER accepted.
    const requestedRole = body.roleRequest === "coordinator" ? "coordinator" : "student";

    if (isMockAuthEnabled()) {
      // In mock mode, acknowledge update
      return NextResponse.json({
        ok: true,
        user: {
          ...user,
          displayName,
          studentId,
          departmentId,
          academicYear: year,
          semester,
          phoneNumber,
          campus,
          photoURL,
          profileCompleted: true,
          accountStatus: requestedRole === "coordinator" && user.role === "student" ? "pending_approval" : "active",
        },
      });
    }

    const savedProfile = await completeUserProfile(user.uid, {
      displayName,
      studentId,
      departmentId,
      year,
      semester,
      phoneNumber,
      campus,
      photoURL,
      roleRequest: requestedRole,
    });

    const bearer = extractBearerToken(request.headers.get("authorization"));
    const response = NextResponse.json({
      ok: true,
      user: savedProfile,
      profileCompleted: true,
      message: savedProfile.accountStatus === "pending_approval"
        ? "Profile saved. Coordinator access is pending departmental administrator approval."
        : "Profile completed successfully.",
    });

    if (bearer) {
      const isProd = process.env.NODE_ENV === "production";
      response.headers.append(
        "Set-Cookie",
        `${SESSION_COOKIE_NAME}=${bearer}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600${isProd ? "; Secure" : ""}`,
      );
    }

    return response;
  } catch (error) {
    return authErrorToResponse(error);
  }
}

export async function PUT(request: NextRequest | Request) {
  try {
    const user = await requireUser(request);
    const body = await request.json().catch(() => ({}));

    const updates: Record<string, any> = {};

    if (typeof body.displayName === "string") {
      const name = body.displayName.trim();
      if (name.length < 2 || name.length > 100) {
        return NextResponse.json(
          { error: "Full name must be between 2 and 100 characters." },
          { status: 400 },
        );
      }
      updates.displayName = name;
    }

    if (typeof body.studentId === "string") {
      const sId = body.studentId.trim().toUpperCase();
      if (!STUDENT_ID_REGEX.test(sId)) {
        return NextResponse.json(
          { error: "Valid Student USN / Registration Number is required." },
          { status: 400 },
        );
      }
      updates.studentId = sId;
    }

    if (typeof body.departmentId === "string") {
      if (!VALID_DEPARTMENT_IDS.has(body.departmentId)) {
        return NextResponse.json(
          { error: "Invalid academic department selection." },
          { status: 400 },
        );
      }
      updates.departmentId = body.departmentId;
    }

    if (body.year !== undefined) {
      const year = Number(body.year);
      if (isNaN(year) || year < 1 || year > 6) {
        return NextResponse.json({ error: "Academic year must be between 1 and 6." }, { status: 400 });
      }
      updates.year = year;
    }

    if (body.semester !== undefined) {
      const sem = Number(body.semester);
      if (isNaN(sem) || sem < 1 || sem > 12) {
        return NextResponse.json({ error: "Semester must be between 1 and 12." }, { status: 400 });
      }
      updates.semester = sem;
    }

    if (typeof body.phoneNumber === "string") {
      const phone = body.phoneNumber.trim();
      if (!PHONE_REGEX.test(phone)) {
        return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });
      }
      updates.phoneNumber = phone;
    }

    if (typeof body.campus === "string" && body.campus.trim().length > 0) {
      updates.campus = body.campus.trim();
    }

    if (typeof body.photoURL === "string" && body.photoURL.startsWith("http")) {
      updates.photoURL = body.photoURL;
    }

    if (isMockAuthEnabled()) {
      return NextResponse.json({
        ok: true,
        user: { ...user, ...updates },
        message: "Profile updated successfully.",
      });
    }

    const updatedProfile = await updateUserProfile(user.uid, updates);

    return NextResponse.json({
      ok: true,
      user: updatedProfile,
      message: "Profile updated successfully.",
    });
  } catch (error) {
    return authErrorToResponse(error);
  }
}
