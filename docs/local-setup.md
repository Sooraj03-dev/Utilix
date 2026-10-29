# Utilix Local Setup & Developer Guide

This guide walks through configuring, running, and testing the fully integrated Utilix platform.

---

## 1. System Requirements

- **Node.js**: v18.17+ or v20+ (tested on Node v24.19.0)
- **Python**: 3.10+ or 3.11+ (tested on Python 3.11.9)
- **Package Managers**: `npm` and `pip`
- **Git**

---

## 2. Initial Setup

### Step 1: Clone and Checkout Integration Branch
```bash
git clone https://github.com/Sooraj03-dev/Utilix.git
cd Utilix
git checkout integration/utilix-complete
```

### Step 2: Install Node Dependencies
```bash
npm install
```

### Step 3: Install Python AI Service Dependencies
```bash
cd ai-service
pip install -r requirements.txt
cd ..
```

---

## 3. Environment Variables Configuration

Copy the example templates:

```bash
# In project root:
cp .env.example .env.local

# In ai-service/:
cp ai-service/.env.example ai-service/.env
```

### Key Configuration Values:

1. **`AI_SERVICE_SECRET`**:
   - Set to the same arbitrary secret string in both `.env.local` and `ai-service/.env`.
   - Example: `AI_SERVICE_SECRET=utilix-shared-dev-secret-2026`

2. **`NEXT_PUBLIC_USE_MOCK_AUTH`**:
   - Set to `true` for instant local development without active Firebase Cloud credentials.
   - Set to `false` when connecting to real Firebase Authentication or the Firebase Emulator.

3. **`USE_MOCK_DATA`**:
   - Set to `true` to use the built-in mock workflow adapter without a running Firestore instance.
   - Set to `false` when connecting to Firestore.

4. **Firebase Credentials (Optional for Cloud Mode)**:
   - Client: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, etc.
   - Admin: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.

---

## 4. Running the Platform Locally

### Terminal 1: Next.js Frontend & API Server
```bash
npm run dev
```
Runs at `http://localhost:3000`.

### Terminal 2: Python AI Allocation Service
```bash
npm run dev:ai
```
Runs at `http://localhost:8000`.

---

## 5. Running the Seed Scripts

Generate mock fixtures or seed development Firestore:

```bash
# Generate mock JSON fixture dataset:
npm run seed

# Seed Firebase Emulator (requires running emulator):
SEED_TARGET=emulator npm run seed

# Seed development Firebase project:
ALLOW_SEED=true SEED_TARGET=demo npm run seed
```

---

## 6. Pre-Configured Demo Personas

When running in mock or demo mode, navigate to `http://localhost:3000/login` to use the one-click persona switcher:

1. **Student (Aarav Sharma)**
   - Role: `student`
   - Quota: 8/10 credits, 2 free off-peak sessions/week
   - Permissions: Browse catalogue, submit reservations, join waitlists

2. **Coordinator (Dr. Sarah Lin)**
   - Role: `coordinator`
   - Department: FabLab Lead / Design & Prototyping
   - Permissions: Review pending requests, approve/reject bookings, manage checkouts/returns

3. **Administrator (Marcus Vance)**
   - Role: `admin`
   - Department: Dean of Campus Facilities
   - Permissions: Policy tuning, audit log inspection, quota configuration

---

## 7. Testing Suite Execution

```bash
# Run Vitest test suites (Unit, Auth, Seed, Workflow):
npm run test

# Run TypeScript compilation check:
npm run typecheck

# Run Python AI service test suite:
npm run test:ai

# Run Next.js production build:
npm run build
```
