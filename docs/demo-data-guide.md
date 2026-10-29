# CampusShare Demo Data & Presentation Script Guide

This guide details exactly which seeded accounts, resource assets, and simulated conflicts to use during demo presentations and judge evaluations.

---

## 1. Demo Personas & Credentials

| Persona | Name | Role | Email | Seeded Credits | Target Demo Step |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Student A** | Aarav Sharma | `student` | `student@campus.edu` | **7** | Steps 1, 2, 3 |
| **Student B** | Julian Hayes | `student` | `julian.h@campus.edu` | **5** | Step 2 (Contested Slot) |
| **Lab Coordinator** | Dr. Sarah Lin | `coordinator` | `coordinator@campus.edu` | 50 | Step 4 (Queue & Safety) |
| **Campus Admin** | Dean Marcus Vance | `admin` | `admin@campus.edu` | 999 | Step 5 (Quotas & Audit) |

---

## 2. Step-by-Step Presentation Script

### Step 1: Discovering Resources as an Interdisciplinary Student
1. Open the homepage `/` as **Aarav Sharma** (`student`).
2. Point out the top-right **Credit Pill** showing `7 credits` (highlight that credits are non-monetary and replenish every Monday).
3. Scroll to the **Live Campus Catalog** (`#resources`).
4. Filter by **"3D Fabrication"**.
5. Select the **Prusa XL 5-Toolhead 3D Printer** (Status: `Available`, 2 credits/slot).
6. Click **"Reserve Slot"** to open the reservation modal.
7. Note the **"Interdisciplinary Team Membership"** toggle: checking this demonstrates **Rule 3 (+15% Multiplier)** by pairing Mechatronics with Architecture.
8. Click **"Submit Fair Request"** → A toast confirms the request with an 88% priority score boost, and credits update from 7 to 5.

---

### Step 2: The 2-Student Conflict Demonstration (The Core Pitch)
**Scenario**: Both Aarav Sharma and Julian Hayes request the Friday 14:00 - 17:00 slot on the Prusa XL 3D Printer.

| Factor | Candidate A (Aarav & Maya) | Candidate B (Julian) | Algorithmic Winner |
| :--- | :--- | :--- | :--- |
| **Academic Urgency** | Senior Capstone (due in 6 days) | Personal hobby drone frame | **Candidate A** (+35 pts vs +15 pts) |
| **Team Diversity** | Mechatronics + Visual Arts | Solo (Mechanical Engg) | **Candidate A** (+25 pts vs 0 pts) |
| **Trust Rating** | 100% on-time return record | 92% (1 strike last month) | **Candidate A** (+20 pts vs +10 pts) |
| **Quota Cap Check** | 0 active peak slots | 0 active peak slots | **Tie** (+8 pts each) |
| **Total Score** | **88 / 100 pts** | **33 / 100 pts** | **Candidate A Wins Slot** |

---

### Step 3: Inspecting the Signature "Why This Decision?" Receipt
1. Navigate to `/rules#worked-example` or click **"See Demo Decision Audit"** on `/`.
2. Open the **DecisionPanel**:
   - Show judges the composite score progress bar (**88 / 100 pts**).
   - Expand the **Evaluation Factors Breakdown**: explain each factor weight (Academic Urgency, Interdisciplinary Boost, Trust Score, Quota Usage).
   - Point out the **Rule Citations**: Rule 1, Rule 3, Rule 5, Rule 8.
   - Emphasize: *No student is left guessing why they didn't get a machine. Every allocation is mathematically auditable.*

---

### Step 4: The 15-Minute Phantom Reclamation (Rule 4)
1. Julian was placed as **Waitlist #1**.
2. Explain the **15-Minute Check-in Window**:
   - If Aarav does not physically scan in at the Engineering Hall B station by 14:15, the reservation is revoked immediately.
   - Julian receives an automated notification: *"Slot reclaimed! You have 10 minutes to confirm."*
   - Eliminates empty rooms and phantom hoarding.

---

### Step 5: Coordinator Queue & Safety Certification Verification
1. Click the top-right profile menu and switch to **Dr. Sarah Lin (`coordinator`)**.
2. Notice the navigation changes to **Resource Hub**, **Review Queue**, and **Fair Rules**.
3. Point out that coordinators review flagged edge-cases (e.g. hazardous ShopBot CNC requiring Safety Level 3).
4. Highlight that coordinator manual overrides cannot be done silently—every override requires an immutable public written justification.

---

### Step 6: Dean of Facilities Admin Audit
1. Switch role to **Marcus Vance (`admin`)**.
2. Show administrative governance:
   - Adjusting baseline weekly credit allowances (default 7).
   - Auditing departmental cross-sharing metrics (proving Mechanical Engineering machines are actually serving Arts and Computing students).
   - Verifying the campus-wide 98.4% on-time return rate.
