# CampusShare Pitch Notes & Judge FAQ

---

## 1. The 60-Second Elevator Pitch

> *"Every year, universities spend millions purchasing high-end hardware—3D printers, cinema cameras, CNC mills, and GPU clusters. But if you walk onto campus on a Saturday, half this gear is either locked behind departmental silos or hoarded by aggressive students who book entire weekends and never show up.*
>
> *CampusShare is the fair campus resource-sharing platform. We combine **free baseline access** for everyday tools with **algorithmic fairness credits** for high-demand assets. When two students need the same machine, our engine looks at syllabus deadlines, interdisciplinary team diversity, and return reliability.*
>
> *Best of all, there are no black boxes: every student receives our signature **'Why this decision?'** receipt with plain-language mathematical transparency. CampusShare turns campus equipment from a source of student frustration into an engine of cross-faculty innovation."*

---

## 2. Anticipated Judge Questions & Tactical Answers

### Q1: Why not simply use First-Come, First-Served (FIFO)?
**Answer**:  
FIFO sounds fair in theory, but in practice it rewards bot-racing, students with high-speed internet, and those with free time to camp on registration portals at midnight. Furthermore, FIFO ignores academic reality: a freshman printing a toy keychain shouldn't displace a graduating senior whose accredited Capstone is due in 48 hours. Our engine guarantees that academic urgency and interdisciplinary teamwork get proportional priority.

### Q2: What prevents wealthy students or labs from buying up credits?
**Answer**:  
**Rule 6 strictly forbids monetary transactions.** CampusShare credits are non-monetary academic rationing tokens, not crypto or real cash. Every enrolled student receives an equal allocation of 7 credits every Monday morning. You cannot purchase, transfer, or hoard credits across weeks. Baseline tools remain completely free at 0 credits.

### Q3: What if someone creates fake interdisciplinary teams just to get the +15% multiplier?
**Answer**:  
Rule 3 requires verified university accounts from participating students. For team reservations, all tagged teammates receive a confirmation prompt via campus email/SSO, and the reservation deduction is shared across their respective active slot quotas (Rule 2). Falsifying project rosters constitutes an academic integrity violation flagged during coordinator review.

### Q4: How do you handle "Phantom Bookings" (students who book but never show up)?
**Answer**:  
**Rule 4 enforces a 15-Minute Auto-Reclamation policy.** If the reserving student does not physically or digitally scan in within 15 minutes of the slot start time, the slot is immediately revoked, 1 credit is forfeit as an anti-hoarding penalty, and the slot is automatically texted and awarded to Waitlist #1.

### Q5: Can lab coordinators override the algorithm if they know better?
**Answer**:  
**Yes, but with radical transparency (Rule 8).** Coordinators can override automated matches for emergency lab maintenance or specialized research protocols, but they cannot do so silently. Every override requires an immutable written justification recorded directly in the public audit receipt viewable by the affected students.

### Q6: How does the platform scale to mobile devices in physical lab environments?
**Answer**:  
The frontend is built mobile-first, tested strictly down to 360px screen width (iPhone SE and Android entry devices). All touch targets meet or exceed $44 \times 44\text{px}$, and tables automatically refactor into high-readability cards. A student can check their waitlist position, review rules, or scan into a workstation right from their phone at the lab doorway.

### Q7: How does Full Stack C collaborate cleanly with Roles A and B?
**Answer**:  
Full Stack C provides a strictly modular, shared component library in `/components` (`Button`, `Card`, `StatusChip`, `Badge`, `CreditPill`, `Modal`, `DecisionPanel`, `EmptyState`, `ErrorState`, etc.) with comprehensive TypeScript contracts in `components/types.ts`. Roles A (backend/Supabase) and B (AI workflow) can consume these exact components without styling overhead or merge conflicts.
