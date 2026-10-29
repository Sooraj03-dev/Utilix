// Utilix — server-side env validation helper
// Owner: A

/** Reads an env var or throws a clear error. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[Utilix] Missing required environment variable: ${name}. ` +
        `Check .env.local (see .env.example for the template).`
    );
  }
  return value;
}

/** Reads an env var, returns undefined if missing. */
export function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}
