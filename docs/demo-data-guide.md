# Utilix Demo Data & Presentation Guide

This guide details the seeded accounts, resource inventory, conflict scenarios, and the structured 3-minute live presentation script matching the actual application.

---

## 1. Verified Seeded Demo Personas

| Persona | Name | Role | Email | Seeded Quota | Focus Areas |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Student** | Aarav Sharma | `student` | `aarav.sharma@campus.edu` | **8 / 10 Credits**, 2 Free Off-Peak Sessions/Wk | Senior Capstone, Mechatronics, 96% Trust Rating |
| **Coordinator** | Dr. Sarah Lin | `coordinator` | `sarah.lin@campus.edu` | **50 Credits** | FabLab Facility Lead, Approvals Queue, Return Condition |
| **Administrator** | Marcus Vance | `admin` | `marcus.vance@campus.edu` | **999 Credits** | Dean of Facilities, Policy Rules, Quota Allocation, Audit Ledger |

---

## 2. Seeded Resource Assets

1. **Prusa XL 5-Toolhead 3D Printer** (`res-01`):
   - Department: Makerspace & Mechanical Engg
   - Access: Credits (2 credits / slot)
   - Status: `available` (4 of 8 slots open today)
   - Prerequisite: 3D Printing Safety L1
2. **IoT & Embedded Prototyping Bench** (`res-02`):
   - Department: Electrical & Computer Engg
   - Access: Free Baseline (0 credits / slot)
   - Status: `available` (6 of 10 slots open today)
   - Includes: 100MHz Scope, ESD-safe station, Arduino/ESP32 kits
3. **Sony FX3 Full-Frame Cinema Kit** (`res-03`):
   - Department: School of Media & Journalism
   - Access: Credits (3 credits / slot)
   - Status: `waitlisted` (1 of 4 slots open today)
   - Prerequisite: Cine Gear Care Certification
4. **Acoustically Isolated Voice & Audio Booth** (`res-04`):
   - Department: Music & Digital Audio Arts
   - Access: Credits (1 credit / slot)
   - Status: `booked` (0 of 6 slots open today)
   - Includes: WhisperRoom, Neumann TLM 103 microphone
5. **ShopBot Heavy-Duty CNC Mill** (`res-05`):
   - Department: Architecture & Spatial Design
   - Access: Training Required (2 credits / slot)
   - Status: `maintenance` (Scheduled calibration)
   - Prerequisite: Heavy Machinery Safety L3
6. **NVIDIA RTX 6000 Ada GPU Workstation** (`res-06`):
   - Department: AI & Computational Sciences
   - Access: Credits (2 credits / slot)
   - Status: `available` (5 of 8 slots open today)

---

## 3. The 3-Minute Live Presentation Script

### Minute 0:00 – 0:45 | Introduction & Neo-Brutalism Brand Identity
- **Action**: Open [http://localhost:3000/](http://localhost:3000/) in browser.
- **Narrative**:
  > *"Judges, welcome to Utilix — Share. Use. Build. Universities invest millions of dollars in 3D printers, cinema cameras, and makerspaces, yet they sit behind departmental silos. When equipment is unlocked, first-come first-served systems lead to bot-racing and phantom hoarding.*
  > *Notice our Soft Neo-Brutalist design language: high-contrast black borders, hard offset shadows, vibrant brand yellow, and our blinking geometric Utilix 3D U logo entry experience."*
- **Action**: Click **"Enter Utilix"** to smoothly transition into the live hub.

---

### Minute 0:45 – 1:30 | The Interdisciplinary Innovation Story & Booking
- **Action**: Scroll to the **Interdisciplinary Story** section.
- **Narrative**:
  > *"Utilix is built on an interdisciplinary philosophy: what happens when an engineer, a designer, a filmmaker, and an audio producer collaborate?*
  > *Under Rule 4 of our constitution, teams combining multiple departments receive an objective diversity weight boost."*
- **Action**: Scroll to the **Equipment Catalog**. Filter by **"3D Fabrication"**. Select the **Prusa XL 3D Printer**. Click **"Reserve Slot"**.
- **Action**: In the reservation modal, toggle **"Interdisciplinary Team Membership"** (Mechatronics + Visual Arts). Click **"Submit Fair Request"**.
- **Narrative**:
  > *"Watch our real credit ledger update in the Credit Pill: Aarav's balance drops from 8 to 6 credits. But if a student needs entry equipment like our IoT Bench, Tier 1 provides 2 completely free off-peak sessions per week with zero credit deduction."*

---

### Minute 1:30 – 2:15 | Transparent Conflict Resolution & "Why This Decision?"
- **Action**: Navigate to [`/rules`](http://localhost:3000/rules). Scroll to the **Worked Example**.
- **Narrative**:
  > *"When two students compete for the same Friday peak slot on our 3D printer, Utilix doesn't flip an opaque coin. We evaluate four deterministic factors:*
  > *1. Usage Fairness (35% weight) — Aarav has used only 2.5 hours this month.*
  > *2. Waiting Time (25% weight) — Aarav queued 36 hours ahead.*
  > *3. Academic Need (20% weight) — Aarav's Senior Capstone is due in 4 days (within our 7-day accredited window).*
  > *4. Interdisciplinary Diversity (20% weight) — Aarav's team pairs Mechanical Engineering with Visual Arts.*
  > *Aarav scores 89.8 points, while Julian scores 26.8 points. Julian is placed at Waitlist #1. If Aarav fails to check in within 15 minutes, Julian is automatically promoted!"*
- **Action**: Scroll down to the **Explainable AI & Fallback Card**.
- **Narrative**:
  > *"Notice our Decision Receipt. AI provides human-readable explanations, but code and floating-point math enforce the decision. Even if our AI service goes offline, our deterministic fallback engine guarantees 100% receipt transparency with zero student downtime."*

---

### Minute 2:15 – 3:00 | Multi-Persona Governance & Institutional Impact
- **Action**: Click **"Sign In"** or open [`/login`](http://localhost:3000/login).
- **Narrative**:
  > *"Evaluators can test Utilix instantly through our one-click Demo Personas. Let's switch to Dr. Sarah Lin, FabLab Coordinator."*
- **Action**: Click **"Dr. Sarah Lin (Coordinator Demo)"**.
- **Narrative**:
  > *"The navigation immediately adapts to Coordinator workflows: review queues, safety certification gates, and checkouts. Finally, switching to Marcus Vance (Dean of Facilities) reveals our policy ledger and cross-departmental sharing analytics.*
  > *With Utilix, campus equipment is no longer locked in departmental silos — it's shared, used, and built fairly by all students. Thank you!"*
