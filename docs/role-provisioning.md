# Utilix — Role Provisioning & Access Authorization

This document describes how roles are authorized, assigned, and synchronized across Firebase Authentication custom claims and Cloud Firestore in Utilix.

---

## 1. Supported Roles

1. **Student (`student`)**:
   - Default public role for all newly registered campus members.
   - Entitled to monthly credit quotas (10 credits default) and weekly free reservation sessions.
   - Permissions: browse resources, check availability, request bookings, join waitlists, view own history.

2. **Coordinator (`coordinator`)**:
   - Laboratory managers, teaching assistants, or equipment supervisors.
   - Associated with specific assigned resources via `assignedResourceIds`.
   - Permissions: approve/reject restricted booking requests, perform checkouts, inspect returns, log equipment issues, certify students on specialized machinery.

3. **Administrator (`admin`)**:
   - Campus facilities director or IT platform administrator.
   - Permissions: configure system policies and weights, view campus-wide KPI telemetry (Gini fairness index), audit trail logs, export dataset snapshots, provision roles.

---

## 2. Server-Side Role Enforcement

```text
Incoming Request
    │
    ▼
Extract Bearer Token / Session Cookie (utilix_session)
    │
    ▼
Firebase Admin SDK verifyIdToken()
    │
    ▼
Query users/{uid} from Firestore
    │
    ▼
Resolve Authoritative Role:
    - Default: "student"
    - If Firestore contains trusted role: use verified role
    │
    ▼
Enforce Guards (requireRoleOrThrow / requireRoleOrRedirect)
    - Student attempting /dashboard/coordinator -> 403 Forbidden
    - Student attempting /dashboard/admin -> 403 Forbidden
```

---

## 3. Registration & Elevation Prevention

### Public Registration Policy
- The profile completion form (`/complete-profile`) only provisions the **Student** role.
- If a user attempts to send `{ role: "admin" }` or `{ role: "coordinator" }` to `POST /api/user/profile`, the payload is filtered and discarded.

### Coordinator Application & Approval Flow
1. During onboarding, a user can check:
   *"Applying for Lab Coordinator / Teaching Assistant permissions (Requires Admin Approval)"*.
2. When checked:
   - `roleRequest` is set to `"coordinator"`.
   - The user's role remains `"student"`.
   - `account_status` is marked as `"pending_approval"`.
3. The user sees a pending approval notice on their dashboard.
4. An authorized Administrator reviews the application and invokes:
   ```ts
   await setUserRoleAndClaim(targetUid, "coordinator");
   ```
5. `setUserRoleAndClaim` updates `users/{uid}` in Firestore (`role: "coordinator"`, `account_status: "active"`) and sets `{ role: "coordinator" }` in Firebase Auth custom claims.
6. The user immediately gains coordinator access upon token refresh.

### Administrator Provisioning Policy
- Administrator accounts can **never** be requested through any client-facing registration form.
- Administrators must be provisioned either through:
  - Database seeding scripts (`scripts/seed.ts` via `SEED_TARGET="demo" | "emulator"`).
  - Firebase Admin SDK CLI or backend console.
  - Institutional domain mapping in a secure, server-only environment.
