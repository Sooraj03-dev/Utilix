"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth/context";

export default function LoginPage() {
  const { login, loading, error, user } = useAuth();
  const [email, setEmail] = useState("student.demo@utilix.local");
  const [password, setPassword] = useState("demo-student");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  if (user) {
    return (
      <section>
        <h1>Login</h1>
        <p>You are already signed in as {user.displayName}.</p>
        <button onClick={() => router.push("/dashboard")}>Go to Dashboard</button>
      </section>
    );
  }

  return (
    <section>
      <h1>Login</h1>
      <p>Use Firebase credentials, or demo accounts when NEXT_PUBLIC_USE_MOCK_AUTH=true.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitError(null);
          void login(email, password)
            .then(() => router.push("/dashboard"))
            .catch((caught) => {
              setSubmitError(caught instanceof Error ? caught.message : "Login failed.");
            });
        }}
        style={{ display: "grid", gap: 10, maxWidth: 360 }}
      >
        <label>
          Email
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="email"
            required
          />
        </label>
        <label>
          Password
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      {submitError ? <p style={{ color: "crimson" }}>{submitError}</p> : null}
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
    </section>
  );
}
