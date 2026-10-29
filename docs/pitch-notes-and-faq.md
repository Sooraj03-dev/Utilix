# Utilix Pitch Notes & Judge FAQ

---

## 1. The 60-Second Elevator Pitch

> *"Every year, universities spend millions purchasing high-end hardware — 3D printers, cinema cameras, CNC mills, and GPU clusters. But if you walk onto campus on a Saturday, half this gear is either locked behind departmental silos or hoarded by aggressive students who book entire weekends and never show up.*
>
> *Utilix is the campus resource-sharing platform built on **Share. Use. Build.** We combine a **free baseline allowance** (2 off-peak sessions per week) for everyday coursework with an **algorithmic fairness credit pool** (10 monthly credits) for high-demand assets. When multiple students compete for the same machine, our engine calculates an objective 4-factor score evaluating usage fairness, waiting time, accredited syllabus deadlines within 7 days, and cross-departmental team diversity.*
>
> *Best of all, there are zero black boxes: every student receives our signature **'Why this decision?'** receipt with plain-language mathematical transparency and 100% deterministic fallback resilience. Utilix turns campus equipment from a source of student frustration into an engine of cross-faculty innovation."*

---

## 2. Anticipated Judge Questions & Tactical Answers

### Q1: Why not simply use First-Come, First-Served (FIFO)?
**Answer**:  
FIFO sounds fair in theory, but in practice it rewards bot-racing, students with fiber broadband, and those with free time to camp on registration portals at midnight. Furthermore, FIFO ignores academic reality: a freshman printing a casual toy shouldn't displace a graduating senior whose accredited Capstone is due in 48 hours. Our engine guarantees that academic urgency and interdisciplinary teamwork receive proportional priority.

### Q2: What prevents wealthy students or labs from buying up credits?
**Answer**:  
**Rule 3 and Rule 8 strictly forbid monetary transactions.** Utilix credits are non-monetary academic rationing tokens, not cryptocurrency or real money. Every enrolled student receives an equal allocation of 10 credits each month, with 2 free off-peak sessions every week. You cannot purchase, transfer, or hoard credits across terms. Baseline tools remain completely free at 0 credits.

### Q3: What if someone creates fake interdisciplinary teams just to get the diversity boost?
**Answer**:  
Rule 4 requires verified university accounts from participating students. For team reservations, tagged teammates receive a confirmation prompt via campus email, and active booking quotas are tracked across their schedules. Falsifying project rosters constitutes an academic integrity violation flagged during coordinator review.

### Q4: How do you handle "Phantom Bookings" (students who book but never show up)?
**Answer**:  
**Rule 3 and Rule 6 enforce a 15-Minute Auto-Reclamation policy.** If the reserving student does not physically or digitally scan in within 15 minutes of the slot start time, the slot is immediately revoked, 1 credit is forfeit as an anti-hoarding penalty, and the slot is automatically promoted to Waitlist #1.

### Q5: Can lab coordinators override the algorithm if they know better?
**Answer**:  
**Yes, but with radical transparency (Rule 8).** Coordinators can override automated matches for emergency lab maintenance or specialized research protocols, but they cannot do so silently. Every override requires an immutable written justification recorded directly in the public audit receipt viewable by the affected students.

### Q6: What happens if the AI service fails or is rate-limited?
**Answer**:  
**Deterministic Fallback Guarantee (Rule 8).** The AI service only generates plain-English explanatory prose — it has ZERO authority over floating-point scoring or hard eligibility gates. If the AI service times out or is unreachable, Utilix automatically falls back to deterministic rule receipts, rendering full factor math with zero downtime.

### Q7: How does Full Stack C collaborate cleanly with Roles A and B?
**Answer**:  
Full Stack C provides a strictly modular, shared component library in `/components` (`Button`, `Card`, `StatusChip`, `Badge`, `CreditPill`, `Modal`, `DecisionPanel`, `EmptyState`, `ErrorState`, etc.) with comprehensive TypeScript contracts in `components/types.ts`. Roles A (backend/Firestore) and B (booking workflows) can consume these exact components without styling overhead or merge conflicts.
