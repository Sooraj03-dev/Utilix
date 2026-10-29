# Utilix — Database Helpers (`/lib/db`)

> Owner: **A** (Foundation, Data, Dashboards)

## Important Guidelines for Teammates (B, AI, C)

1. **Active Policy**: Always read policy configuration using `getActivePolicy()` from `@/lib/db`. Never hardcode policy numbers or query the `policies` collection directly.
2. **Policy Versioning**: Every booking must store the `policy_version` (e.g., `"v1"`) active at allocation time for auditability.
3. **Credit Balance Integrity**: `users.credit_balance` **MUST ONLY** change through `applyCredit` (or `grantMonthlyCredits`) in `@/lib/db/ledger.ts`. Never directly write or update `users.credit_balance` anywhere else.
4. **Server-Only**: All code in `/lib/db` runs server-side with Firebase Admin SDK (`server-only`). Client components must fetch through route handlers or server actions.

## Policy Management & History API

- `getActivePolicy()`: Returns the currently active policy document, defaulting to `DEFAULT_POLICY` if none is configured.
- `createPolicyVersion(updates, authorEmail)`: Atomically deactivates the current active policy and creates a new policy version `v{N+1}`. Never mutate existing policy documents in-place.
- `listPolicyVersions()`: Returns all historical policy versions ordered descending by version number.
- `getPolicyByVersion(version)`: Retrieves a specific historical policy version by integer version number.
- `diffPolicies(prev, next)`: Generates a plain-language summary of differences between two policy versions.
