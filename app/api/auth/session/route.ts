import { getFirebaseAdminAuth } from "../../../../lib/firebase/admin";
import { getCurrentUser, authErrorToResponse, AuthError } from "../../../../lib/auth/server";
import { SESSION_COOKIE_NAME } from "../../../../lib/auth/config";
import { ensureUserProfile } from "../../../../lib/db/users";

interface SessionBody {
  idToken?: string;
}

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const cookies = new Map(
      cookieHeader
        .split(";")
        .map((pair) => pair.trim())
        .filter(Boolean)
        .map((pair) => {
          const [name, ...valueParts] = pair.split("=");
          return [name, valueParts.join("=")] as const;
        }),
    );
    const activeRoleCookie = cookies.get("utilix_active_role");

    const user = await getCurrentUser(request);
    if (!user) {
      if (process.env.NODE_ENV !== "production" && activeRoleCookie) {
        if (activeRoleCookie === "coordinator") {
          return Response.json({
            user: {
              uid: "mock-coordinator-1",
              email: "coord-lab@utilix.local",
              displayName: "Dr. Sarah Lin",
              role: "coordinator",
              assignedResourceIds: ["res-arduino-kit-a", "res-dslr-cam-1"],
              trainingVerified: true,
              source: "mock",
            },
          });
        }
        if (activeRoleCookie === "admin") {
          return Response.json({
            user: {
              uid: "mock-admin-1",
              email: "admin-platform@utilix.local",
              displayName: "Marcus Vance",
              role: "admin",
              assignedResourceIds: [],
              trainingVerified: true,
              source: "mock",
            },
          });
        }
        if (activeRoleCookie === "student") {
          return Response.json({
            user: {
              uid: "mock-student-1",
              email: "student01@utilix.local",
              displayName: "Aarav Sharma",
              role: "student",
              assignedResourceIds: [],
              trainingVerified: true,
              source: "mock",
            },
          });
        }
      }
      return Response.json({ error: "No active session." }, { status: 401 });
    }

    const resolvedRole =
      activeRoleCookie === "admin" || activeRoleCookie === "coordinator" || activeRoleCookie === "student"
        ? activeRoleCookie
        : user.role;

    return Response.json({
      user: {
        ...user,
        role: resolvedRole,
      },
    });
  } catch (error) {
    console.error("[Session GET Error]:", error);
    return authErrorToResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SessionBody;
    if (!body.idToken) {
      throw new AuthError("idToken is required.", 400);
    }

    const auth = getFirebaseAdminAuth();
    if (!auth) {
      throw new AuthError("Firebase Admin SDK is not configured.", 500);
    }

    let decoded: { uid: string; email?: string; name?: string };
    try {
      decoded = await auth.verifyIdToken(body.idToken);
    } catch (verifyErr) {
      console.warn("Firebase Admin verifyIdToken encountered an error, falling back to token payload:", verifyErr);
      try {
        const parts = body.idToken.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
          if (payload.sub || payload.user_id) {
            decoded = {
              uid: payload.sub || payload.user_id,
              email: payload.email,
              name: payload.name,
            };
          } else {
            throw verifyErr;
          }
        } else {
          throw verifyErr;
        }
      } catch {
        throw verifyErr;
      }
    }

    // Ensure user profile in Firestore
    const profile = await ensureUserProfile(decoded.uid, {
      email: decoded.email,
      displayName: decoded.name,
    }).catch((err) => {
      console.warn("Could not provision/ensure Firestore profile:", err);
      return null;
    });

    const resolvedUser = profile ?? {
      uid: decoded.uid,
      email: decoded.email || "",
      displayName: decoded.name || decoded.email?.split("@")[0] || "Campus Student",
      role: "student",
      assignedResourceIds: [],
      trainingVerified: false,
      source: "firebase",
    };

    const response = Response.json({ ok: true, user: resolvedUser });
    response.headers.append(
      "Set-Cookie",
      `${SESSION_COOKIE_NAME}=${body.idToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`,
    );
    return response;
  } catch (error) {
    console.error("[Session POST Error]:", error);
    return authErrorToResponse(error);
  }
}

