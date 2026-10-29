import { getFirebaseAdminAuth } from "../../../../lib/firebase/admin";
import { getCurrentUser, authErrorToResponse, AuthError } from "../../../../lib/auth/server";
import { SESSION_COOKIE_NAME } from "../../../../lib/auth/config";
import { ensureUserProfile } from "../../../../lib/db/users";

interface SessionBody {
  idToken?: string;
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return Response.json({ error: "No active session." }, { status: 401 });
    }
    return Response.json({ user });
  } catch (error) {
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

    const decoded = await auth.verifyIdToken(body.idToken);

    // Ensure user profile in Firestore
    const profile = await ensureUserProfile(decoded.uid, {
      email: decoded.email,
      displayName: decoded.name,
    }).catch((err) => {
      console.warn("Could not provision/ensure Firestore profile:", err);
      return null;
    });

    const response = Response.json({ ok: true, user: profile });
    response.headers.append(
      "Set-Cookie",
      `${SESSION_COOKIE_NAME}=${body.idToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`,
    );
    return response;
  } catch (error) {
    return authErrorToResponse(error);
  }
}

