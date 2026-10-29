# Utilix — Database Helpers (`/lib/db`)

> Owner: **A** (Foundation, Data, Dashboards)

## Important Guidelines for Teammates (B, AI, C)

1. **Active Policy**: Always read policy configuration using `getActivePolicy()` from `@/lib/db`. Never hardcode policy numbers or query the `policies` collection directly.
2. **Policy Versioning**: Every booking must store the `policy_version` (e.g., `"v1"`) active at allocation time for auditability.
3. **Credit Balance Integrity**: `users.credit_balance` **MUST ONLY** change through `applyCredit` (or `grantMonthlyCredits`) in `@/lib/db/ledger.ts`. Never directly write or update `users.credit_balance` anywhere else.
4. **Server-Only**: All code in `/lib/db` runs server-side with Firebase Admin SDK (`server-only`). Client components must fetch through route handlers or server actions.
