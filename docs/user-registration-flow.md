# Utilix — Google Authentication & User Registration Flow

This document details the first-time user registration, profile completion, and returning user authentication lifecycle for the Utilix campus resource-sharing platform.

---

## 1. Complete User Journey

```mermaid
graph TD
    A[User opens Utilix] --> B[Click 'Continue with Google']
    B --> C[Firebase Google OAuth Popup/Redirect]
    C --> D[Firebase Auth Success: Returns Google ID Token & UID]
    D --> E[POST /api/auth/session with idToken]
    E --> F[Server verifies token & checks Firestore users/{uid}]
    F --> G{Profile Exists & Complete?}
    G -- No: First Time or Incomplete --> H[Redirect to /complete-profile]
    G -- Yes: Complete & Active --> I[Redirect to Authorized Dashboard]
    H --> J[Auto-populate Google Name, Email, Photo]
    J --> K[User enters USN, Department, Year, Semester, Phone]
    K --> L[Validate inputs client & server-side]
    L --> M[POST /api/user/profile updates users/{uid}]
    M --> N[Mark profileCompleted: true & accountStatus: active]
    N --> O[Sync RoleContext & Redirect to Dashboard]
```

### 1.1 First-Time User
1. User clicks **"Continue with Google"** on `/login`.
2. Firebase Authentication triggers `signInWithPopup(auth, googleProvider)`.
3. Application obtains verified Firebase credentials (`uid`, `email`, `displayName`, `photoURL`).
4. Client sends ID token to `/api/auth/session`, setting the HTTP-only `utilix_session` cookie.
5. Server verifies token and invokes `ensureUserProfile(uid, { email, displayName, photoURL })`.
6. Since user document is new, a stub document is provisioned with:
   - `profile_completed: false`
   - `account_status: "active"`
   - `role: "student"`
   - `credit_balance: 10`
7. Response returns `{ profileCompleted: false }`.
8. Login handler immediately redirects to `/complete-profile`.
9. Form auto-populates Google name, Google email (locked/read-only), and Google avatar.
10. User fills in required institutional fields:
    - Student USN / Registration Number (e.g. `1MS21CS001`)
    - Department (`dept_eng`, `dept_design`, `dept_science`)
    - Academic Year (1st to 4th Year)
    - Semester (1 to 8)
    - Contact Phone Number (10 digits)
    - Campus Location (default: "Main Campus")
11. User submits form to `POST /api/user/profile`.
12. Server validates all fields, sets `profile_completed: true`, and updates `users/{uid}`.
13. `RoleContext` is refreshed via `refreshUser()`.
14. User is redirected to `/dashboard`.

### 1.2 Returning User
1. User clicks **"Continue with Google"** on `/login`.
2. Firebase authenticates user and server checks `users/{uid}`.
3. Server finds `profile_completed === true` and `account_status === "active"`.
4. Response returns `{ profileCompleted: true }`.
5. Login handler redirects directly to the authorized dashboard (`/dashboard` for student, `/dashboard/coordinator`, or `/dashboard/admin`).
6. The profile registration form is completely bypassed and never shown again.

### 1.3 Incomplete Profile
If a user document exists but `profile_completed === false` (or required fields like `student_id` are missing):
1. Server route guards (`requireSessionUser` and `requireRoleOrRedirect`) detect `profileCompleted === false`.
2. User is redirected to `/complete-profile`.
3. Existing fields already saved are pre-filled so the user does not need to retype them.
4. User completes the missing fields and submits to continue.

### 1.4 Pending Account Approval
If a user requests Coordinator privileges during registration:
1. `account_status` is saved as `"pending_approval"`.
2. User is redirected to the dashboard, which displays the **Account Pending Institutional Approval** notice.
3. Resource checkout and approval operations remain restricted until verified by an administrator.

---

## 2. Auto-Populated Google Data vs. User Inputs

| Field | Source | Modifiability | Notes |
|---|---|---|---|
| **Firebase UID** | Google OAuth | Immutable | Stable primary key |
| **Institutional Email** | Google OAuth | Immutable / Read-Only | Verified institutional domain |
| **Profile Photo** | Google OAuth | Auto-populated | Falls back to custom initials |
| **Full Name** | Google OAuth | Editable | User can format their preferred name |
| **Student USN / Reg No** | User Entered | Required | 3-25 alphanumeric characters |
| **Department** | User Selected | Required | Valid department ID |
| **Academic Year** | User Selected | Required | Year 1 to 4 |
| **Semester** | User Selected | Required | Semester 1 to 8 |
| **Phone Number** | User Entered | Required | At least 10 digits |
| **Campus** | User Entered | Optional | Default: "Main Campus" |

---

## 3. Server Route Protection & Navigation Flow

Utilix uses server-side guards in `lib/auth/guards.ts` and `lib/auth/pages.ts`:
- `requireSessionUser({ allowIncomplete: false })`:
  Checks session cookie. If missing, redirects to `/login`. If `profileCompleted === false`, redirects to `/complete-profile`.
- `requireRoleOrRedirect(roles, redirectPath, { allowIncomplete: false })`:
  Validates role access and profile completion status before rendering protected dashboard layouts.
- `/complete-profile`:
  Allows incomplete profiles to render the form. If an already-completed user visits, displays an informative card with a direct link back to `/dashboard` or `/profile`.
