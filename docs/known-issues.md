# Utilix — Known Issues & Resolutions Log

## 1. Resolved Issues

### Issue 1: Unfinished Workflow API Stubs
- **Symptom:** Endpoints `checkin`, `checkout`, `requests/[id]/approve`, `requests/[id]/reject`, `eligibility`, `issues`, `waitlist/join`, and `conflicts/[id]/resolve` were returning HTTP 501 or lacked implementation.
- **Resolution:** Full transactional Firestore implementations and database helpers (`lib/db/approvals.ts`, `lib/db/checkouts.ts`, `lib/db/issues.ts`) added with strict role-based access checks and audit logging.

### Issue 2: Authentication Fallback Bypass
- **Symptom:** `app/login/page.tsx` contained logic that caught Firebase auth errors and silently logged in as a mock student.
- **Resolution:** Removed simulated fallback. Real authentication failures are now presented clearly in the UI, keeping the form in place.

### Issue 3: Placeholder Frontend Pages
- **Symptom:** `/approvals`, `/returns`, and `/conflicts` displayed "Requires Firebase" warning cards without interactive functionality.
- **Resolution:** Implemented live interactive views connected directly to the workflow API routes with handover actions, condition inspections, and conflict resolution buttons.

### Issue 4: Python AI Service Authentication in Tests
- **Symptom:** `test_scenarios.py` failed with 401 when `AI_SERVICE_SECRET` was set in the environment.
- **Resolution:** Configured `X-AI-Secret` header on the test client, bringing test suite to 25/25 passing tests.

## 2. Operational Considerations
- **Firebase Email Provider:** When testing student accounts against live Firebase Auth, the Email/Password sign-in method must be toggled on in the Firebase Console for `utilix-d7843`.
- **Security Rules:** Firestore rules restrict direct client-side collection writes (`allow write: if false;`), ensuring all business mutations pass through the authorized Next.js Server routes with Firebase Admin SDK.
