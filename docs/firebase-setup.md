# Utilix — Firebase Setup & Architecture Guide

## 1. Overview
Utilix is an institutional resource-sharing and fair allocation platform backed by **Google Cloud Firestore** and **Firebase Authentication**.
All primary business entities (Users, Resources, Bookings, Approvals, Checkouts, Issues, Credit Ledger, Notifications, and Audit Logs) are persisted in Cloud Firestore.

## 2. Configuration & Environment Variables

Place these in `.env.local` for local execution and staging:

```bash
# Firebase Web Client (Browser SDK)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC6gk-AnXvMrvtqq6HzNXnh_i5AFZiODz4
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=utilix-d7843.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=utilix-d7843
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=utilix-d7843.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=192734767414
NEXT_PUBLIC_FIREBASE_APP_ID=1:192734767414:web:19125919aee3346e62eb97
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-Z25WGTLR87

# Firebase Mode Selection
NEXT_PUBLIC_USE_EMULATORS=false
NEXT_PUBLIC_USE_MOCK_AUTH=false
NEXT_PUBLIC_USE_MOCK_DATA=false
USE_MOCK_DATA=false

# Firebase Admin SDK (Server Route Handlers)
FIREBASE_PROJECT_ID=utilix-d7843
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@utilix-d7843.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# AI Allocation Microservice
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_SECRET=utilix-shared-dev-secret-2026
AI_SERVICE_TIMEOUT_MS=6000
```

## 3. Collections & Data Model

The authoritative Firestore collections are:
- `users`: User profiles with role (`student` | `coordinator` | `admin`), credit balance, and active status.
- `departments`: Campus academic departments (`dept_eng`, `dept_cs`, etc.).
- `resources`: Laboratories, 3D printers, cameras, instruments, and project rooms.
- `availability_windows`: Recurring and one-off operating schedules.
- `training_certifications`: Equipment certifications and safety quiz clearances.
- `bookings`: Reservations with state machine tracking (`submitted` -> `eligibility_passed` -> `allocated` -> `pending_approval` -> `confirmed` -> `checked_out` -> `returned`).
- `slot_locks`: Atomic slot concurrency locks preventing double-booking.
- `approvals`: Coordinator and administrator decision records with audit timestamps.
- `checkouts`: Physical handover and condition inspection records.
- `issue_reports`: Reported equipment damage, maintenance tickets, and resolutions.
- `credit_ledger`: Immutable, auditable transaction ledger for credit grants, reserves, spends, and refunds.
- `notifications`: User alert notifications for approvals, cancellations, and returns.
- `policies`: Allocation weight parameters and slot quotas.
- `audit_log`: Sensitive administrative operation logs.

## 4. Firebase Authentication

In the Firebase Console:
1. Navigate to **Authentication** > **Sign-in method**.
2. **Email/Password Provider**: Ensure it is enabled (for seeded testing accounts).
3. **Google Provider**:
   - Click **Add new provider** > Select **Google**.
   - Toggle **Enable**.
   - Set the Project public-facing name to **Utilix** and choose your Project support email.
   - Click **Save**.
4. **Authorized Domains**:
   - In **Settings** > **Authorized domains**, confirm that `localhost` is present.
5. Users logging in with Google or Email/Password are authenticated directly through Firebase Auth, generating secure server-side session cookies (`utilix_session`).

## 5. Seeded Test Accounts in Firebase Auth & Firestore

All test accounts have been created in Firebase Authentication and populated in Firestore with password: `UtilixPassword2026!`

| Role | Email | Password | UID | Notes |
|---|---|---|---|---|
| **Student** | `student01@utilix.local` | `UtilixPassword2026!` | `student-01` | Active, 20 credits, certified |
| **Student** | `student02@utilix.local` | `UtilixPassword2026!` | `student-02` | Active, 25 credits |
| **Student** | `student03@utilix.local` | `UtilixPassword2026!` | `student-03` | Active, DSLR certified |
| **Coordinator** | `coord-lab@utilix.local` | `UtilixPassword2026!` | `coordinator-01` | Lab & Equipment coordinator |
| **Coordinator** | `coord-media@utilix.local` | `UtilixPassword2026!` | `coordinator-02` | Media & Studio coordinator |
| **Coordinator** | `coord-makerspace@utilix.local` | `UtilixPassword2026!` | `coordinator-03` | 3D Printer & Makerspace coordinator |
| **Admin** | `admin-platform@utilix.local` | `UtilixPassword2026!` | `admin-01` | Full institutional administrator |
