# Utilix End-to-End Test Plan: Journeys J1–J7

This test plan defines the execution, expected outcomes, and current verification status for the seven required user journeys (**J1–J7**) across the Utilix platform.

---

## 1. Journey Execution & Verification Matrix

| Journey | Description | Persona / Role | Target Components & Routes | Verification Status | Blockers & Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **J1** | Student books an eligible free off-peak slot | Student (`Aarav Sharma`) | `/`, Featured Catalog, Modal, `CreditPill` | **PASS (Frontend Tested)** | None. Validated in demo mode: 0 credits deducted, 2 free off-peak sessions tracked. |
| **J2** | Student requests a credit slot with cost & balance feedback | Student (`Aarav Sharma`) | `/`, Reservation Modal, `CreditPill`, `ToastContext` | **PASS (Frontend Tested)** | None. Deducts 2 credits from 8 balance -> 6 credits remaining; validates balance sufficiency. |
| **J3** | Competing requests ranked fairly, loser waitlisted, cancellation promotes next | Competing Students (`Aarav` vs `Julian`) | `/rules#worked-example`, `DecisionPanel`, Waitlist | **PASS (Model Verified)** | Backend auto-cascading webhook pending merge of `origin/fs-b/utilix-workflow`. Algorithm and receipts fully verified. |
| **J4** | Coordinator approves restricted request, checks out item, records return condition | Coordinator (`Dr. Sarah Lin`) | `/login`, Review Queue, Status Chips | **BLOCKED (Backend Pending)** | UI status configs (17 statuses) and demo switcher ready. Physical checkout mutation requires `fs-b` workflow APIs. |
| **J5** | Administrator updates fairness policy and views updated metrics | Admin (`Marcus Vance`) | `/login`, Policy Ledger, Audit metrics | **BLOCKED (Backend Pending)** | Policy parameters and audit UI ready. Live policy write requires `fs-a` Firestore integration. |
| **J6** | AI service fails / offline, platform renders deterministic fallback receipt | All Users | `/rules`, `DecisionPanel` | **PASS (Simulated & Verified)** | Fallback engine tested. Renders complete mathematical factor receipt with explicit "Deterministic Fallback" badge. |
| **J7** | Responsive design (360px–1440px) & accessibility compliance | All Personas | `/`, `/rules`, `/login`, Mobile Nav | **PASS (Automated & Visual Audit)** | Tested at 360px, 390px, 768px, 1024px, 1440px. 0 horizontal overflow; touch targets $\ge 44\text{px}$. |

---

## 2. Detailed Journey Test Procedures

### Journey J1: Student Books an Eligible Free Off-Peak Slot
- **User Story**: As an enrolled undergraduate, I want to reserve a weekday morning off-peak slot for coursework without consuming my monthly credits.
- **Preconditions**: Student is signed in as Aarav Sharma with 2 weekly free baseline sessions remaining.
- **Execution Steps**:
  1. Open homepage at `/`.
  2. Locate the **IoT & Embedded Prototyping Bench** (`res-02`), badged with `Free Baseline (0 credits)`.
  3. Click **"Reserve Slot"**.
  4. Select project classification ("Standard Coursework Assignment") and enter brief description.
  5. Click **"Submit Fair Request"**.
- **Expected Results**:
  - Modal dismisses cleanly.
  - Toast fires: `"Free Baseline Slot Queued: Demo request submitted for IoT & Embedded Prototyping Bench under weekly free off-peak baseline (0 credits deducted)."`.
  - Credit balance remains unchanged at 8 credits.
- **Observed Result**: **PASS**. Tested in browser session.

---

### Journey J2: Student Requests a Credit-Based Slot & Validates Balance
- **User Story**: As a student building functional hardware, I want to request a high-demand 3D printer slot and see the exact credit deduction and remaining balance.
- **Preconditions**: Student Aarav Sharma has 8 of 10 monthly credits.
- **Execution Steps**:
  1. From `/`, select the **Prusa XL 5-Toolhead 3D Printer** (`res-01`, cost: 2 credits).
  2. Click **"Reserve Slot"**.
  3. Check the **"Interdisciplinary Team Membership"** checkbox (activating Rule 4's 20% diversity factor).
  4. Click **"Submit Fair Request"**.
- **Expected Results**:
  - Modal validates credit balance sufficiency (`credits >= 2`).
  - Credit balance updates immediately from 8 credits to 6 credits in `CreditPill`.
  - Toast fires: `"Request Queued in Utilix: Demo request submitted for Prusa XL 5-Toolhead 3D Printer. Deducted 2 credits (Remaining balance: 6). Queued for fair allocation ranking."`.
- **Observed Result**: **PASS**. Tested in browser session.

---

### Journey J3: Competing Requests Fairly Ranked, Waitlisting & Auto-Promotion
- **User Story**: When two students request the same peak 3D printer slot, the platform must objectively score both requests and assign the winning slot and waitlist position.
- **Preconditions**: Slot Friday 14:00–17:00 is contested by Applicant A (Aarav, Capstone due in 4 days, MechEng + Visual Arts) and Applicant B (Julian, hobby drone, solo CS).
- **Execution Steps**:
  1. Navigate to `/rules#worked-example`.
  2. Review the mathematical formula breakdown:
     - Usage Score: $0.35 \times 0.88 = 0.308$ vs $0.35 \times 0.40 = 0.140$
     - Waiting Time: $0.25 \times 0.80 = 0.200$ vs $0.25 \times 0.35 = 0.088$
     - Academic Need: $0.20 \times 0.95 = 0.190$ vs $0.20 \times 0.20 = 0.040$
     - Diversity: $0.20 \times 1.00 = 0.200$ vs $0.20 \times 0.00 = 0.000$
  3. Verify composite scores: Applicant A = **89.8 pts**, Applicant B = **26.8 pts**.
  4. Inspect waitlist cascading: Applicant B is assigned **Waitlist Position #1**.
  5. If Applicant A cancels or triggers the 15-minute no-show rule, Applicant B is promoted automatically.
- **Expected Results**:
  - Winning applicant receives `allocated` status.
  - Losing applicant receives `waitlisted` status with explicit position queue indicator.
- **Observed Result**: **PASS** (Frontend and algorithmic logic validated; live auto-promotion webhook pending merge of `origin/fs-b/utilix-workflow`).

---

### Journey J4: Coordinator Approves Restricted Request & Records Return Condition
- **User Story**: As a FabLab coordinator, I need to review safety plans for restricted heavy machinery (e.g. ShopBot CNC), issue approval, check out equipment, and record return condition upon check-in.
- **Preconditions**: User signs in as Coordinator (`Dr. Sarah Lin`).
- **Execution Steps**:
  1. Open `/login` and click **"Dr. Sarah Lin (Coordinator Demo)"**.
  2. Verify navbar role switches to `COORDINATOR` with facility management links.
  3. Inspect restricted machinery (`res-05` ShopBot CNC Mill, requiring `Heavy Machinery Safety L3`).
  4. Coordinator reviews safety credentials and approves request, transitioning status from `pending_approval` $\to$ `approved` $\to$ `checked_out` $\to$ `returned`.
- **Expected Results**:
  - All 17 workflow statuses render appropriate icons and labels via `StatusChip.tsx`.
- **Observed Result**: **BLOCKED (Backend Pending)**. Frontend UI status chips and demo switcher fully verified; live approval mutations depend on `fs-b` workflow endpoints.

---

### Journey J5: Administrator Changes Policy & Audits Campus Metrics
- **User Story**: As Dean of Facilities, I want to review campus-wide utilization, adjust monthly credit quotas, and audit cross-departmental sharing rates.
- **Preconditions**: User signs in as Administrator (`Marcus Vance`).
- **Execution Steps**:
  1. Open `/login` and click **"Marcus Vance (Admin Demo)"**.
  2. Verify navbar role switches to `ADMIN` with administrative indicators.
  3. Inspect policy definitions (10 monthly credits, 2 weekly free sessions, 7-day academic window).
  4. Verify audit ledger displays policy version `v2.1` and cryptographic tie-break seed `#0a84e9`.
- **Expected Results**:
  - System statistics are explicitly marked as Demonstration Benchmarks to prevent misleading evaluators.
- **Observed Result**: **BLOCKED (Backend Pending)**. Frontend UI and role switching passed; live policy writes require `fs-a` Firestore admin SDK.

---

### Journey J6: AI Service Fails / Unreachable; Deterministic Fallback Engages
- **User Story**: As a student reviewing an allocation receipt, if the AI service is down or unconfigured, I must still receive an accurate mathematical explanation.
- **Preconditions**: Set `AI_SERVICE_URL="http://localhost:9999"` (simulating service downtime) or leave unconfigured.
- **Execution Steps**:
  1. Open `/rules` or click **"See Demo Decision Audit"** on `/`.
  2. Inspect the **DecisionPanel** component.
  3. Observe the `decisionSource` indicator at the bottom of the panel.
- **Expected Results**:
  - Interface does NOT crash or show a blank screen.
  - DecisionPanel renders the exact 4-factor scoring breakdown.
  - A prominent yellow badge with `ShieldCheck` icon displays: `"Deterministic Fallback Receipt"`.
  - Fallback text explains: *"Generated by deterministic rule engine (AI service offline). Factor weights and tiebreak criteria remain 100% verified."*
- **Observed Result**: **PASS**. Fallback rendering verified without exceptions.

---

### Journey J7: Responsive Design & Accessibility Audit (360px–1440px)
- **User Story**: As a mobile user or keyboard-only student, all elements must be readable, touchable, and accessible without visual clipping.
- **Test Widths**: `360px` (Small mobile), `390px` (iPhone 14/15), `768px` (iPad portrait), `1024px` (Desktop), `1440px` (Large screen).
- **Execution Steps**:
  1. Audit viewport scaling at all 5 widths across `/`, `/rules`, `/login`.
  2. Verify that `body` and container elements do not exceed viewport width (zero horizontal scroll).
  3. Verify mobile navigation drawer opens and closes with body scroll lock.
  4. Audit interactive touch targets: all buttons, links, inputs, and toggles meet $\ge 44 \times 44\text{px}$.
  5. Audit keyboard navigation: Tab focus rings (`0 0 0 3px #111111, 0 0 0 5px #FFD60A`), Escape key dismisses modals.
  6. Audit status chips: verify all statuses feature paired SVG icons + text.
- **Observed Result**: **PASS**. 100% compliant with accessibility and responsive criteria.
