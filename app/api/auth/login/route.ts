import { findMockAccountByCredentials, serializeMockSession, toAuthUser, assertMockAuthAllowed } from "../../../../lib/auth/mock";
import { MOCK_SESSION_COOKIE_NAME } from "../../../../lib/auth/config";

interface LoginBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    assertMockAuthAllowed();
    const body = (await request.json()) as LoginBody;

    if (!body.email || !body.password) {
      return Response.json({ error: "Email and password are required." }, { status: 400 });
    }

    const account = findMockAccountByCredentials(body.email, body.password);
    if (!account) {
      return Response.json({ error: "Invalid mock credentials." }, { status: 401 });
    }

    const session = serializeMockSession(account.uid);
    const response = Response.json({ user: toAuthUser(account) });
    response.headers.append(
      "Set-Cookie",
      `${MOCK_SESSION_COOKIE_NAME}=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`,
    );
    return response;
  } catch (error) {
    if (typeof error === "object" && error !== null && "status" in error && "message" in error) {
      const authError = error as { status: number; message: string };
      return Response.json({ error: authError.message }, { status: authError.status });
    }
    return Response.json({ error: "Login failed." }, { status: 500 });
  }
}

