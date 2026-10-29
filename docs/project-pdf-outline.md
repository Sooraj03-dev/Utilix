# CampusShare Project Presentation & PDF Outline

This outline specifies the content structure for the CampusShare executive summary and hackathon submission document.

---

## Slide 1: Cover & Vision
- **Title**: CampusShare — Fair Campus Resource-Sharing Platform
- **Tagline**: *"One campus. Every resource. Fair for everyone."*
- **Track**: Campus Life & Higher Education Tech / Equity in Shared Infrastructure
- **Team Roles**: Full Stack A (Backend & Data), Full Stack B (AI & Workflow), Full Stack C (Design System, UI Shell & Public Experience)
- **Visual**: Hero screenshot of `/` with live counter metrics and clean indigo card interface.

---

## Slide 2: The Core Problem (Departmental Silos & Machine Hoarding)
- **The Physical Reality**:
  - Millions of dollars of campus equipment (3D printers, CNC mills, 4K cinema cameras, GPU rigs) sit in locked departmental silos.
  - Mechanical engineering students hoard 3D printers for entire weekends.
  - Creative media students cannot access computing clusters; engineering students cannot access cinema cameras for robotic vision projects.
  - Traditional booking uses paper sign-up sheets or first-come bot races where students with fast internet win everything.
- **Visual**: Diagram showing isolated department silos vs interdisciplinary gridlock.

---

## Slide 3: The CampusShare Solution (Hybrid Access + Algorithmic Fairness)
- **Two-Tier Resource Model**:
  - **Tier 1 (Free Baseline)**: Hand tools, soldering benches, entry printers cost 0 credits and require no paperwork.
  - **Tier 2 (High-Demand Shared Pool)**: Scarce equipment allocated using non-monetary weekly credits (7 credits/student) and fair algorithmic arbitration.
- **Zero Pay-to-Win**: Credits cannot be purchased with real money; every student receives the exact same baseline.
- **Visual**: Infographic illustrating the free baseline + weekly credit replenishment loop.

---

## Slide 4: The 8 Fair Allocation Rules (The Platform Constitution)
1. **Curricular Urgency (+35 pts)**: Imminent Capstone deadlines prioritize accredited coursework.
2. **Anti-Hoarding Cap**: Strict limit of 1 active peak slot per machine type per student.
3. **Cross-Disciplinary Multiplier (+15%)**: Guaranteed boost for teams uniting 2+ different academic faculties.
4. **15-Minute Phantom Reclamation**: Unclaimed slots auto-released to Waitlist #1 after 15 minutes.
5. **Return Reliability (+10 pts)**: Trust rating based on on-time, undamaged returns.
6. **Weekly Equal Replenishment**: 7 credits reset every Monday at 08:00 AM.
7. **Safety Credential Gate**: High-risk machines locked behind Canvas/Blackboard certification badges.
8. **Transparent Decision Receipts**: Every allocation decision publishes a plain-language receipt with score math.

---

## Slide 5: The Signature "Why This Decision?" DecisionPanel
- **Differentiator**: Unlike opaque corporate AI systems, CampusShare provides a human-readable explanation for every contested slot.
- **Real-World Case Study**:
  - Aarav & Maya (Capstone + Cross-Disciplinary Team) score **88/100 pts**.
  - Julian (Solo Hobby) scores **33/100 pts**.
  - Julian is placed as Waitlist #1 with automatic SMS notification if Aarav fails to check in within 15 minutes.
- **Visual**: High-resolution screenshot of the `DecisionPanel` component showing progress score, factor breakdown, and rule citations.

---

## Slide 6: System Architecture & Tech Stack
- **Frontend Core (Role C)**:
  - Next.js App Router (React 18 / 19, TypeScript)
  - Tailwind CSS with custom Indigo design system tokens
  - Lucide React for consistent semantic iconography
  - Mobile-first responsive layouts down to 360px viewport
  - WCAG 2.1 AA accessibility (touch targets $\ge 44\text{px}$, color + icon status pairing)
- **Backend & Realtime (Role A)**:
  - Supabase PostgreSQL with Row Level Security (RLS)
  - Realtime subscriptions for live slot status updates
- **AI & Workflow Engine (Role B)**:
  - Google Gemini API for natural-language project justification analysis and cross-department skill extraction
  - Automated waitlist cascading dispatchers

---

## Slide 7: Demonstrated User Journeys (J1–J7)
- **J1**: Public catalog discovery & filtering across 7 campus departments.
- **J2**: One-click demo persona onboarding (`Student`, `Coordinator`, `Admin`).
- **J3**: Credit-based booking with interdisciplinary team multiplier toggle.
- **J4**: Mathematical conflict arbitration and plain-language audit receipt.
- **J5**: 15-minute phantom reservation auto-reclaim to waitlist.
- **J6**: Lab coordinator queue review and hazardous equipment safety credential verification.
- **J7**: Dean of facilities quota governance and cross-department resource utilization metrics.

---

## Slide 8: Future Roadmap & Institutional Impact
- **Phase 1 (Current MVP)**: Core shell, shared component library, public discovery, 8 fair allocation rules, and demo persona switcher.
- **Phase 2 (IoT Lab Kiosk Integration)**: Door-mounted iPad barcode scanners for physical 15-minute NFC card tap-in.
- **Phase 3 (Cross-University Federation)**: Inter-campus resource sharing across regional university consortiums.
- **Conclusion**: *"Zero wasted hours. Zero departmental gatekeeping. Fair campus tools for everyone."*
