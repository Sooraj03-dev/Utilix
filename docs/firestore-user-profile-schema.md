# Firestore User Profile Schema (`users/{uid}`)

The authoritative user profile document lives in the `users` collection in Cloud Firestore, with the document ID matching the authenticated user's Firebase UID.

---

## 1. Document Path & Identity

```text
users/{firebaseUid}
```

- **Document ID**: Firebase Authentication `uid` (string).
- **One User, One Document**: No duplicate documents or secondary user collections.

---

## 2. Field Schema & Invariants

| Field Name | Type | Description | Mutability Rules |
|---|---|---|---|
| `id` | `string` | User's Firebase UID | Immutable primary key |
| `uid` | `string` | Alias for Firebase UID | Immutable |
| `name` | `string` | Display name (for backward compatibility) | Editable via Profile |
| `displayName` | `string` | Verified user display name | Editable via Profile |
| `email` | `string` | Verified Google account email | Immutable from client |
| `photoURL` | `string?` | Profile picture URL from Google | Updated on login / profile |
| `role` | `"student" \| "coordinator" \| "admin"` | Authorized institutional role | **Server-Admin Only** |
| `student_id` | `string?` | Student USN / Roll number | Editable via Profile |
| `studentId` | `string?` | Alias for `student_id` | Editable via Profile |
| `department_id` | `string` | Academic department ID (`dept_eng`, etc.) | Editable via Profile |
| `year` | `number` | Academic year (1 to 4) | Editable via Profile |
| `semester` | `number` | Academic semester (1 to 8) | Editable via Profile |
| `phone_number` | `string?` | Contact phone number | Editable via Profile |
| `phoneNumber` | `string?` | Alias for `phone_number` | Editable via Profile |
| `campus` | `string?` | Campus branch (e.g. "Main Campus") | Editable via Profile |
| `profile_completed` | `boolean` | Flag indicating onboarding status | Set to `true` on submit |
| `profileCompleted` | `boolean` | Alias for `profile_completed` | Set to `true` on submit |
| `account_status` | `"active" \| "pending_approval" \| "suspended"` | Account authorization state | **Server-Admin Only** |
| `credit_balance` | `number` | Authoritative available credit balance | **Ledger Only (`credit_ledger`)** |
| `free_sessions_used` | `number` | Free allocation sessions consumed this week | Reset weekly by algorithm |
| `free_sessions_week` | `string` | ISO week key (e.g. `"2026-W44"`) | System-managed |
| `active` | `boolean` | Active member flag | Server-Admin Only |
| `trainingVerified` | `boolean` | Lab equipment certification verified | Verified by Coordinator |
| `assignedResourceIds` | `string[]` | Resource IDs managed (coordinators only) | Assigned by Admin |
| `created_at` | `string` / `Timestamp` | Profile creation ISO timestamp | Immutable |
| `updated_at` | `string` / `Timestamp` | Profile update ISO timestamp | Updated on save |

---

## 3. Strict Server-Side Immutability Rules

1. **`credit_balance` is Ledger-Only**:
   - The profile update API (`POST /api/user/profile`, `PUT /api/user/profile`) strictly excludes `credit_balance`.
   - Credit balances can only be debited or credited by the immutable audit ledger in `lib/db/ledger.ts`.
2. **`role` Cannot Be Escalated by Clients**:
   - New profiles always default to `"student"`.
   - If a client sends `role: "admin"` or `role: "coordinator"`, the value is discarded.
   - If a user applies for Coordinator status, `account_status` becomes `"pending_approval"`, but `role` remains `"student"` until an administrator verifies the account.
3. **`email` and `uid` Invariance**:
   - `uid` is derived directly from the verified Firebase Auth ID token. A caller cannot supply another user's UID to read or modify another user's profile.

---

## 4. Query Indexes

- Single-document fetch by ID: `users/{uid}` (Standard O(1) primary key lookup).
- Role queries: `where("role", "==", role)` (Used by admin exports and coordinator assignment).
- Email queries: `where("email", "==", email)` (Used by `ensureUserProfile` to link pre-seeded accounts).
