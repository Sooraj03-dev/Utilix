# CampusShare End-to-End Test Plan: Journeys J1–J7

This test plan defines the 7 end-to-end user journeys (J1–J7) validating fairness, transparency, role switching, anti-hoarding rules, and accessibility.

---

## Journey Overview Matrix

| Journey | Name | Target Persona | Primary Pages | Key Rules Validated |
| :--- | :--- | :--- | :--- | :--- |
| **J1** | Public Discovery & Interdisciplinary Catalog | Anonymous Visitor / Student | `/`, `/rules` | Rule 1, Rule 6 |
| **J2** | One-Click Demo Role Onboarding | All Roles | `/login`, Navbar | Role Context System |
| **J3** | Credit-Based Booking with Team Multiplier | Student (`Aarav`) | `/`, Reservation Modal | Rule 2, Rule 3, Rule 6 |
| **J4** | Contested Allocation & DecisionPanel Audit | Student (`Aarav` vs `Julian`) | `/`, `/rules` | Rule 1, Rule 3, Rule 5, Rule 8 |
| **J5** | 15-Minute Phantom Slot Reclamation | Waitlisted Student (`Julian`) | Notifications, `/` | Rule 4 (Anti-Hoarding) |
| **J6** | Coordinator Queue & Safety Gate Review | Coordinator (`Dr. Sarah Lin`) | `/`, Review Queue | Rule 7 (Safety Gate), Rule 8 |
| **J7** | Administrative Quota & Platform Audit | Admin (`Marcus Vance`) | `/`, Admin Shell | Rule 2, Rule 6 (Equity) |

---

## Detailed Journey Test Steps & Expected Results

### J1: Public Discovery & Interdisciplinary Catalog
- **Goal**: Verify that an unauthenticated student can discover campus assets, understand the hybrid access model, and read the fair allocation policy.
- **Steps**:
  1. Navigate to `/`.
  2. Verify hero text: *"One campus. Every resource. Fair for everyone."*
  3. Scroll to the **Interdisciplinary Team Story**; verify all 4 pillars (3D Print, IoT, Cinema, Audio).
  4. Test category filters (3D Fabrication, Computing, Heavy Workshop); verify zero layout shift.
  5. Click **"Read 8 Fair Rules"**; verify navigation to `/rules`.
- **Pass Criteria**: All equipment displays paired icon + status chips (green/amber/red/grey). Viewport scales to 360px without horizontal scroll.

---

### J2: One-Click Demo Role Onboarding
- **Goal**: Validate that judges and evaluators can switch between personas in one click without passwords.
- **Steps**:
  1. Navigate to `/login`.
  2. Click **"Aarav Sharma (Student)"** card.
  3. Verify success toast notification fires.
  4. Verify redirect to `/` with navbar showing Aarav's name, Mechatronics department, and 7 credits.
  5. Open navbar role dropdown and switch to **"Coordinator"**; verify links dynamically update to Coordinator views.
- **Pass Criteria**: Role switching takes < 100ms, updates global React context, and changes navbar links dynamically.

---

### J3: Credit-Based Booking with Team Multiplier (Rule 3 & 6)
- **Goal**: Verify reservation submission and weekly non-monetary credit deduction.
- **Steps**:
  1. Log in as Student (7 credits).
  2. Select **Prusa XL 5-Toolhead 3D Printer** (2 credits).
  3. Click **"Reserve Slot"**.
  4. Check the **"Interdisciplinary Team Membership"** checkbox (+15% Multiplier).
  5. Click **"Submit Fair Request"**.
- **Pass Criteria**: Success toast confirms allocation priority calculation; credit balance decreases from 7 to 5.

---

### J4: Contested Allocation & DecisionPanel Audit (Rule 1, 3, 5, 8)
- **Goal**: Verify that the signature "Why this decision?" block produces transparent mathematical justification.
- **Steps**:
  1. Open the **DecisionPanel** (via `/rules#worked-example` or "See Demo Decision Audit" on `/`).
  2. Verify outcome badge: `APPROVED` with `88 / 100 pts`.
  3. Expand the **Evaluation Factors Breakdown**.
  4. Verify all 4 factors: Academic Urgency (+35), Cross-Disciplinary (+25), Trust Score (+20), Quota (+8).
  5. Verify rule citations list Rule 1, Rule 3, Rule 5, and Rule 8.
- **Pass Criteria**: Plain language explanation clearly explains why candidate won over competing requests without opaque jargon.

---

### J5: 15-Minute Phantom Slot Reclamation (Rule 4)
- **Goal**: Verify that absent students lose slots to waitlist applicants after 15 minutes.
- **Steps**:
  1. View Julian Hayes (Waitlist #1) on contested slot.
  2. Simulate clock expiring: check-in time exceeds `startTime + 15min`.
  3. Primary reservation transitions to `REVOKED (No-Show)`.
  4. Slot transitions to `OFFERED` for Julian with automated 10-minute acceptance timer.
- **Pass Criteria**: High-demand machines are never left vacant due to ghost bookings.

---

### J6: Coordinator Queue & Safety Certification Gate (Rule 7)
- **Goal**: Verify hazardous machinery requires verified safety credentials.
- **Steps**:
  1. Switch to Coordinator (`Dr. Sarah Lin`).
  2. Inspect **ShopBot Heavy-Duty CNC Mill** (labeled `Requires: Heavy Machinery Safety L3`).
  3. Attempting to reserve without certification flags request for manual safety review.
  4. Coordinator can view student's certification status and issue approval.
- **Pass Criteria**: Hazardous machines cannot be booked without requisite safety badges.

---

### J7: Administrative Quota & Platform Audit (Rule 2 & 6)
- **Goal**: Validate campus-wide anti-hoarding limits and zero out-of-pocket enforcement.
- **Steps**:
  1. Switch to Admin (`Marcus Vance`).
  2. Verify system statistics: 142 shared lab assets, 98.4% on-time return rate, 0 hours phantom hoarding.
  3. Verify non-monetary currency rules (credits cannot be bought with money, preventing inequality).
- **Pass Criteria**: Admin view provides full audit trail for all algorithmic decisions and coordinator overrides.
