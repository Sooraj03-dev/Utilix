# Role Split Progress Log

## Step 0 — Baseline Verification
- **Date**: 2026-10-30
- **Branch**: `integration/role-split`
- **Node.js**: v22.x
- **Python**: 3.11.9
- **Java**: 1.8.0_501 (Java 8 detected)
- **Baseline Commands**:
  - `npm install`: Verified (`node_modules` up to date).
  - `npm run typecheck`: **PASS** (`tsc --noEmit` exited with code 0).
  - `npm run test`: **PASS** (106 / 106 unit tests passed).
  - `npm run test:ai`: **PASS** (25 / 25 pytest tests passed).
  - Vitest test suite (`tests/unit`, `tests/auth`, `tests/seed`): **PASS** (130 / 130 tests passed).
  - `npm run build`: **PASS** (Next.js 16.4.3 Turbopack compiled 33 static & dynamic routes cleanly).
  - `npm run seed (mock)`: **PASS** (`scripts/generated/mock-seed-data.json` successfully generated).
  - Emulators (`npm run emulators` / `firebase-tools`):
    - Java 8 detected.
    - Note: Local `firebase-tools` CLI binary requires Node wrapper compatibility on Windows; Firestore emulator tests (`tests/emulator/db.test.ts`) require an active emulator instance at `127.0.0.1:8080`.
- **Pre-existing Observations & Baseline Quirks**:
  - `tests/unit/workflow.test.ts` logged AIClient deterministic fallback warning due to `X-AI-Secret` expectation during unit mock test (handled gracefully by deterministic fallback).
  - Soft neo-brutalism design system active across all existing screens.

---

## Phase 1 — One Identity, Secure Guards, Working Workflow Auth
- **Status**: COMPLETED
- **Branch**: `integration/role-split`
- **What now works**:
  - **Canonical Demo Accounts (`lib/auth/demo-accounts.ts`)**: Single source of truth for `student01@utilix.local`, `coord-lab@utilix.local`, and `admin-platform@utilix.local` (`UtilixPassword2026!`). Coordinator assigned resources match real seeded resource IDs (`resource-arduino-kit-a`, etc.). Login page, seed script, `README.md`, and mock auth delegate to this canonical list.
  - **Workflow Auth Unification (`app/(workflow)/_lib/auth.ts`)**: `getWorkflowCaller` now delegates cleanly to `lib/auth/server` using standard session cookies or `Bearer` tokens, returns `name: user.displayName`, and synchronizes mock vs cloud adapter mode with `isMockAuthEnabled()`. Deleted `lib/auth/require-user.ts` and legacy `x-mock-*` header dependencies.
  - **Custom Claims & Session Sync**: `ensureUserProfile` in `lib/db/users.ts` and `scripts/seed.ts` invoke `setCustomUserClaims(uid, { role })`. Exported `setUserRoleAndClaim`. Auth context switched from `onAuthStateChanged` to `onIdTokenChanged` for auto-refreshing cookie sync on token refresh. Production cookies enforce `; Secure`.
  - **Server Guards (`lib/auth/guards.ts`)**: Built `requireRoleOrRedirect` for Server Component layouts/pages and `requireRoleOrThrow` for actions and API routes. Applied to coordinator and admin layouts, all coordinator/admin pages, the CSV export route (`/dashboard/admin/export`), and coordinator resource scope checks. Removed all insecure `!sessionUser` allow fallbacks.
  - **Profile Telemetry API (`GET /api/me`)**: Returns comprehensive session profile, department, year, credit balance, policy monthly credits, free sessions used/left, active booking count, reliability score (% on-time returns / completed), coordinator assigned resources, and unread notification count.
  - **Test Suite**:
    - `tests/auth/guards-and-me.test.ts`: 11 / 11 PASS.
    - `tests/auth/role-guards.test.ts`: 7 / 7 PASS.
    - `tests/unit/workflow.test.ts`: 20 / 20 PASS.
    - `app/(workflow)/_lib/workflow.test.ts`: 5 / 5 PASS.
    - Total Vitest tests: 138 / 138 PASS.
    - Python Pytest tests: 25 / 25 PASS.
    - TypeScript Typecheck (`tsc --noEmit`): PASS.
    - Next.js Production Build (`next build`): PASS (33 routes compiled).
