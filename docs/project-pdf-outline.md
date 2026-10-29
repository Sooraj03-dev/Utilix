# Utilix Project Presentation & Submission Report Outline

This outline specifies the content structure for the Utilix executive summary, pitch deck, and hackathon submission document.

---

## Slide 1: Cover & Vision
- **Title**: Utilix — Share. Use. Build.
- **Tagline**: *"One campus. Every resource. Fair for everyone."*
- **Track**: Campus Life & Higher Education Tech / Equity in Shared Infrastructure
- **Design Language**: Soft Neo-Brutalism (Primary Yellow `#FFD60A`, Warm Cream `#FFF9E6`, Deep Black `#111111`, Hard Drop Shadows)
- **Team**:
  - Full Stack A (Member 1): Data Models, Firebase / Firestore Schemas, Auth Tokens, Credit Ledger
  - Full Stack B (Member 2): Resource Catalogue, Booking Engine, Waitlists, Checkout & Return Workflows
  - Full Stack C (Member 3): Frontend Shell, Design System, Public Landing Page, Rules Page, Login UI, QA & Documentation
  - AI Service (Member 4): Allocation Scoring Algorithm, Gemini API Explanations, Fallback Engine
- **Visual**: Hero screenshot of `/` with the centered blinking geometric 3D U logo and brutalist catalog cards.

---

## Slide 2: The Core Problem: Departmental Silos & Machine Hoarding
- **The Campus Dilemma**:
  - Universities invest millions in specialized gear (3D printers, CNC mills, cinema cameras, GPU rigs).
  - Equipment is trapped in departmental silos. Mechanical Engineering tools are locked against CS students; Media cameras are barred for robotics developers.
  - First-come first-served booking causes bot-racing and phantom hoarders who book slots and never show up.
- **The Consequence**: Undergraduates miss graduation project deadlines while equipment sits vacant behind locked doors.

---

## Slide 3: The Utilix Solution: Hybrid Access & Transparent Fairness
- **Two-Tier Economy (Zero Pay-to-Win)**:
  - **Tier 1 (Free Baseline)**: 2 free off-peak sessions per week (costing 0 credits) for foundational coursework and everyday lab bench access.
  - **Tier 2 (High-Demand Shared Pool)**: 10 non-transferable credits per month for scarce gear (cinema cameras, heavy CNC, GPU workstations).
- **Core Principle**: Real money cannot purchase priority or extra credits. Every enrolled student receives the identical baseline.
- **15-Minute No-Show Reclamation**: Slots unclaimed after 15 minutes are immediately revoked (with 1 credit forfeit) and automatically promoted to Waitlist #1.

---

## Slide 4: The Utilix Constitution: The 8 Fair Allocation Rules
1. **Hard Eligibility & Safety Gate**: 6 binary checks (active student, safety cert L1-L3, no maintenance, max 3 bookings, session duration 1-4h, no slot overlap).
2. **Weekly Free Baseline Allowance**: 2 free off-peak sessions per week (resets Mondays 00:00 UTC).
3. **Credit Economy & Transparent Deductions**: 10 monthly credits, 1-3 credits/slot, full refund $\ge$ 24h, 1 credit forfeit on no-show.
4. **Deterministic 4-Factor Competition Ranking**: $0.35 \cdot \text{Usage} + 0.25 \cdot \text{Wait} + 0.20 \cdot \text{Need}_{(\le 7\text{d})} + 0.20 \cdot \text{Diversity}$.
5. **Strict 3-Tier Tie-Breaking Hierarchy**: Fewest monthly sessions $\to$ earliest request timestamp $\to$ deterministic SHA-256 seeded lottery.
6. **Automated Waitlisting & Instant Promotion**: Losing requests are queued; cancellations auto-promote Waitlist #1.
7. **Restricted Resources & Coordinator Approvals**: Hazardous apparatuses require faculty coordinator safety review.
8. **Audit Receipts, Explainable AI & Deterministic Fallback**: Immutable decision receipts with 100% deterministic fallback resilience.

---

## Slide 5: The Signature "Why This Decision?" Decision Panel
- **Explainability without Opacity**:
  - Whenever a slot is contested, Utilix publishes a transparent mathematical receipt.
  - Case Study: Aarav & Maya (Capstone due in 4 days, MechEng + Visual Arts team) score **89.8 pts**. Julian (Solo hobby) scores **26.8 pts**.
  - Julian is placed as Waitlist #1 and automatically promoted if Aarav cancels.
- **Honest AI Architecture**: AI converts scores into human language. AI never has authority to alter scores or bypass safety gates. If AI is offline, our deterministic fallback engine renders the exact factor breakdown with zero downtime.

---

## Slide 6: System Architecture & Technology Stack
- **Frontend & Design System (Full Stack C)**:
  - Next.js 14 App Router, TypeScript 5.7, Tailwind CSS 3.4
  - Soft Neo-Brutalism theme tokens (`#FFD60A`, `#FFF9E6`, `3.5px solid #111111`)
  - 17 fully typed workflow statuses paired with Lucide SVG icons
  - Accessible dialogs, keyboard focus rings, $\ge 44\text{px}$ touch targets
- **Backend & Data Models (Full Stack A)**:
  - Firestore / Firebase database collections (`resources`, `requests`, `allocations`, `ledgers`)
- **Booking & Workflow Engine (Full Stack B)**:
  - State machine managing transitions: `submitted` $\to$ `allocated` $\to$ `checked_out` $\to$ `returned`
- **Allocation AI Service**:
  - Python / FastAPI service with Google Gemini API for plain-language reasoning

---

## Slide 7: Demonstrated User Journeys (J1–J7)
- **J1**: Student books an eligible free off-peak slot (0 credits deducted).
- **J2**: Student requests a credit-based slot with real-time balance feedback (8 $\to$ 6 credits).
- **J3**: Competing requests ranked fairly, loser waitlisted, cancellation promotes next.
- **J4**: Coordinator reviews restricted request, checks out item, records return condition.
- **J5**: Administrator audits campus metrics and reviews credit distribution.
- **J6**: AI service fails/offline; deterministic fallback receipt renders with 100% uptime.
- **J7**: Responsive design verified across 360px, 390px, 768px, 1024px, 1440px viewports.

---

## Slide 8: Future Roadmap & Institutional Impact
- **Phase 1 (Current MVP)**: Complete frontend shell, soft neo-brutalist design system, 8 fair rules, one-click demo personas, and explainable decision receipts.
- **Phase 2 (IoT Lab Kiosk Integration)**: Door-mounted tablet kiosks with NFC student card scanners for physical 15-minute check-in validation.
- **Phase 3 (Consortium Federation)**: Expanding Utilix across regional university networks so students can cross-borrow specialized electron microscopes and high-performance computing clusters.
- **Closing**: *"Utilix — Share. Use. Build. Zero wasted hours, zero departmental silos, and fair access for every student."*
