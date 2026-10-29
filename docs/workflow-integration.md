# Utilix — Member B Core Workflow Integration

**Owner:** Full Stack B (Core Workflow)  
**Branch:** `fs-b/utilix-workflow`  
**Base Commit / Foundation:** Merged `origin/fs-a/data-model` (commit `fe2d0263675005b8221b67f1396b7972ba7eebfc`)  
**Tagline:** *Share. Use. Build.*

---

## 1. Overview & Architecture

Member B delivers the end-to-end resource sharing journey for Utilix students and coordinators, integrating directly with:
1. **Member A Foundation:** Firestore data model, typed converters, atomic slot locking (`slot_locks`), transactional credit ledger (`readCreditState` / `writeCredit`), active policy engine (`getActivePolicy`), and status transition enforcement (`assertTransition`).
2. **AI Service:** FastAPI allocation engine (`/allocate`, `/alternatives`, `/bundle`, `/health`), accessed via `lib/ai-client.ts` with transparent deterministic fallback.
3. **Frontend Application:** Next.js 16 App Router with Partial Prefetching (PPR / Cache Components), `<Suspense>` streaming, and responsive UI adhering to Utilix design identity (`#FFD60A`, `#FFF9E6`, `#000000`).

---

## 2. Implemented Endpoints & Contracts

All endpoints return canonical typed responses conforming to `ApiResponse<T>` (`lib/types/api.ts`).

| Method | Path | Description | Security / Transaction Rules |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/workflow/resources` | List campus equipment & spaces with type, department, and text search | Public browse; filters by `category`/`type`, `department`, `q`. |
| `GET` | `/api/workflow/resources/[id]/slots` | Retrieve UTC slots for resource on `YYYY-MM-DD` | Validates resource & date format; computes availability against active `slot_locks`. |
| `POST` | `/api/workflow/requests` | Create atomic booking with slot locks & credit deduction | Authenticates caller via `requireUser()`; reads active policy (`getActivePolicy()`); acquires slot locks via `acquireSlotLocks()`; deducts credits via `writeCredit()`; records audit log. |
| `GET` | `/api/workflow/requests` | List user's active and historical bookings | Filtered by authenticated caller (or all for coordinators/admins). |
| `GET` | `/api/workflow/requests/[id]` | Get detailed booking information | Enforces ownership or staff role authorization. |
| `POST` | `/api/workflow/requests/[id]/cancel` | Cancel booking request with policy refund | Validates status transition via `assertTransition()`; releases slot locks via `releaseSlotLocks()`; refunds credits within `cancel_refund_hours`. |

---

## 3. Mandatory Booking Invariants & Policy Enforcement

1. **Active Policy:** Active policy is obtained strictly via `getActivePolicy()` from `@/lib/db/policy` (never reading the policies collection directly).
2. **Policy Version Tracking:** The active `policy_version` (e.g., `v1`) is stamped on every booking created.
3. **Credit Balance Safeguard:** `users.credit_balance` is never modified directly. All balance alterations flow through `readCreditState()` (reads phase) followed by `writeCredit()` (write phase) within Firestore transactions with unique idempotency keys.
4. **Slot Locking:** All slots in `[slot_start, slot_end)` are locked atomically via `acquireSlotLocks(tx, bookingId, userId, slotIds)`.
5. **Contention Handling:** Catching `SlotTakenError` automatically maps to HTTP 409 and offers priority waitlisting (`WaitlistEntry`).
6. **State Machine Transitions:** Status mutations are validated using `canTransition(from, to)` and `assertTransition(from, to)` from `@/lib/types/status.ts`. Legal cancellation states are `allocated`, `waitlisted`, `pending_approval`, and `confirmed`.

---

## 4. Dual-Mode Workflow Adapter (`WorkflowDataAdapter`)

Member B implements `DynamicWorkflowAdapter` in `app/(workflow)/_lib/workflow-adapter.ts` to seamlessly switch between local offline development and production Firestore transactions:

- **Mock Mode (`USE_MOCK_DATA="true"`):**
  - Uses typed fixtures (`MOCK_RESOURCES`, `MOCK_BOOKINGS`) from `@/lib/mocks/data`.
  - In-memory slot availability and mock session booking repository.
  - UI displays prominent mock indicators informing users that data is ephemeral.
- **Production Mode (`USE_MOCK_DATA="false"` or unset):**
  - Runs full Firebase Admin SDK transactions against Firestore collections: `resources`, `bookings`, `slot_locks`, `credit_ledger`, `users`, `audit_log`, `policies`.
  - Rejects invalid transitions, enforces credit solvency, and checks required certifications.

---

## 5. AI Client Integration (`lib/ai-client.ts`)

- **Endpoints Integrated:**
  - `POST /allocate`: Fair ranking using multi-objective optimization (usage, waiting, project need, department diversity).
  - `POST /alternatives`: Recommends alternative open slots when requested slots are contested.
  - `POST /bundle`: Synchronous multi-resource scheduling for team projects.
  - `GET /health`: Health and model provider inspection.
- **Resilience & Fallback:**
  - Configurable timeout via `AI_SERVICE_TIMEOUT_MS` (default 5000ms).
  - Configurable secret authentication via `X-AI-Secret` and `Authorization: Bearer`.
  - If the AI service is unreachable, times out, or throws an error, the client transparently falls back to deterministic heuristic ranking with `explanationSource: "fallback"`.

---

## 6. Verification & Quality Gates

| Verification Gate | Command | Status | Details |
| :--- | :--- | :--- | :--- |
| **TypeScript Typecheck** | `npm run typecheck` | **PASS (0 errors)** | Strict mode, full alignment with `@/lib/types`. |
| **ESLint Check** | `npm run lint` | **PASS (0 errors, 0 warnings)** | Clean flat config with React 19 rules. |
| **Vitest Unit Test Suite** | `npm run test` | **PASS (30/30 passed)** | 14 pure tests + 16 core workflow integration tests. |
| **Next.js Production Build** | `npm run build` | **PASS (32/32 routes)** | Compiled, Partial Prefetched dynamic routes (`◐`). |
| **Database Emulator Tests** | `npm run test:db` | *Configured* | Requires local Firebase Firestore emulator. |

---

## 7. Next Steps for Collaborative Merge

1. Coordinator review of `app/(workflow)/**`, `app/api/workflow/**`, and `lib/ai-client.ts`.
2. Teammate testing with active FastAPI AI service on port 8000.
3. Verification against staged Firestore emulator before final merge into `main`.

