# Utilix — Share. Use. Build.

> **Campus & Community Resource-Sharing Platform with Algorithmic Fairness & Transparent Allocation**

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Design Language](https://img.shields.io/badge/Design-Soft_Neo--Brutalism-FFD60A)](#design-system--branding)
[![Branch](https://img.shields.io/badge/Branch-full--stack--c-22c55e)](#git-branch--team-ownership)

---

## 1. Project Overview

**Utilix** is a modern campus resource-sharing web application built to eliminate equipment hoarding, dissolve departmental silos, and guarantee transparent, equitable access to underutilized university gear and facilities.

### The Problem
Universities invest millions of dollars into high-end apparatuses:
- **3D Printers & Rapid Prototyping**: Bambu Lab X1-Carbon, Prusa XL multi-toolhead printers.
- **Electronics & Embedded Systems**: Rigol oscilloscopes, ESD-safe soldering benches, Arduino / ESP32 kits.
- **Media & Studio Gear**: Sony FX3 Cinema kits, carbon fiber tripods, wireless follow-focus rigs.
- **Acoustic & Audio Booths**: Acoustically isolated WhisperRooms, Neumann TLM 103 microphones.
- **Heavy Workshops & Compute Nodes**: 5-axis CNC routers, laser cutters, NVIDIA RTX 6000 Ada GPU workstations.

In traditional universities, these tools remain locked inside departmental silos. Mechanical engineering equipment sits idle while computer science or art students are barred from booking. When access is opened, first-come first-served systems lead to bot-racing and phantom hoarders who reserve slots and fail to show up.

### The Utilix Solution
Utilix provides:
1. **Free Baseline Allowance**: Every eligible student receives **2 free off-peak sessions per week** (costing 0 credits) for foundational coursework.
2. **Fair Credit Economy**: Students receive **10 credits per month** to allocate toward scarce peak-demand equipment. Credits cannot be bought with money, preventing pay-to-win dynamics. Full credit refunds apply if cancelled $\ge$ 24 hours prior.
3. **Deterministic 4-Factor Ranking**: When competing requests contest the same slot, Utilix evaluates requests using an objective mathematical formula:
   $$\text{Score} = (0.35 \times \text{Usage}) + (0.25 \times \text{Wait}) + (0.20 \times \text{Need}_{\le 7\text{d}}) + (0.20 \times \text{Diversity})$$
4. **Three-Tier Deterministic Tie-Breaking**: Fewest sessions this month $\to$ earliest request timestamp $\to$ cryptographic seeded lottery.
5. **15-Minute No-Show Reclamation**: Unclaimed slots are revoked after 15 minutes and immediately promoted to Waitlist #1.
6. **Explainable AI with 100% Deterministic Fallback**: AI translates raw allocation metrics into plain English receipts ("Why this decision?"). If the AI service is offline, the deterministic rule engine renders the full receipt without service interruption.

---

## 2. Tech Stack & Architecture

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.7 (Strict mode)
- **Styling**: Tailwind CSS 3.4 (Custom neo-brutalist theme, zero CSS frameworks)
- **Icons**: Lucide React
- **Typography**: Google Font *Plus Jakarta Sans*
- **State & Context**: React Context Architecture (`RoleContext`, `ToastContext`)
- **Backend Data Model**: Firestore / Firebase on `origin/fs-a/data-model` (staged for integration)
- **Workflow & Bookings Engine**: Automated state machine on `origin/fs-b/utilix-workflow`
- **Allocation AI Service**: Python / FastAPI allocation service on `origin/ai/allocation-engine`
- **Frontend Shell & Design System**: Full Stack C (`full-stack-c` branch)

---

## 3. Design System & Branding

Utilix adopts **Soft Neo-Brutalism**:
- **Primary Brand Yellow**: `#FFD60A`
- **Warm Cream Surface**: `#FFF9E6`
- **Card White**: `#FFFEF2`
- **Deep Black Borders**: `3.5px solid #111111`
- **Hard Offset Drop Shadows**: `4px 4px 0px #111111`, `6px 6px 0px #111111`, `8px 8px 0px #111111`
- **Physical Press Micro-Interactions**: Buttons shift `translate(2.5px, 2.5px)` with reduced shadow depth on active click.
- **Accessible Indicators**: Every status chip strictly pairs an accessible SVG icon with explicit text label (color is never used alone).
- **Touch-Friendly**: All mobile interactive buttons satisfy minimum $44 \times 44\text{px}$ touch targets.
- **Animated Brand Entry**: Full-screen entry experience featuring the centered, blinking geometric Utilix 3D U logo and smooth "Enter Utilix" transition.

---

## 4. Prerequisites & Installation

### Prerequisites
- **Node.js**: v18.17.0 or higher (v20+ recommended)
- **Package Manager**: `npm` (v9+) or `pnpm`

### Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/Sooraj03-dev/Utilix.git
cd Utilix

# 2. Check out Full Stack C feature branch
git checkout full-stack-c

# 3. Install dependencies
npm install

# 4. Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Verification & Check Commands

```bash
# TypeScript type check (Zero errors)
npx tsc --noEmit

# Production build validation
npm run build

# Start production server
npm run start
```

---

## 5. Environment Variables Setup

Create a `.env.local` file in the root directory for local configuration:

```bash
# .env.local
NEXT_PUBLIC_APP_NAME="Utilix"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_ENV="development"

# AI Allocation Engine Service (Optional local development)
AI_SERVICE_URL="http://localhost:8000"
AI_SERVICE_TIMEOUT_MS=3000

# Backend Integration (Firestore / Firebase - Staged on fs-a)
# NEXT_PUBLIC_FIREBASE_API_KEY=""
# NEXT_PUBLIC_FIREBASE_PROJECT_ID=""
```

> **Note on AI Fallback**: If `AI_SERVICE_URL` is omitted, offline, or returns an error, Utilix automatically invokes the client-side deterministic fallback engine, generating complete, transparent decision receipts without blocking users.

---

## 6. Seed Accounts & One-Click Demo Personas

Utilix includes an instant one-click demo persona switcher on `/login` and in the navigation header:

| Persona | Role | Seeded Quota | Responsibilities & Test Capabilities |
| :--- | :--- | :--- | :--- |
| **Aarav Sharma** | `student` | 8 / 10 Credits, 2 Free Off-Peak Sessions | Books free/credit slots, toggles interdisciplinary team bonus, reviews decision receipts. |
| **Dr. Sarah Lin** | `coordinator` | 50 Credits | Reviews restricted equipment approvals, manages queue, verifies return conditions. |
| **Marcus Vance** | `admin` | 999 Credits | Deploys fairness policy updates, audits credit ledgers, inspects cross-department metrics. |

---

## 7. The 8 Fair Allocation Rules

Published transparently on [`/rules`](http://localhost:3000/rules):

1. **Hard Eligibility & Safety Gate**: 6 code-enforced checks (active account, safety badge L1-L3, maintenance window, max 3 active bookings, session duration 1-4h, zero schedule overlap).
2. **Weekly Free Baseline Allowance**: 2 free off-peak sessions per week (resets Mondays 00:00 UTC).
3. **Credit Economy & Transparent Deductions**: 10 monthly credits, 1-3 credits/slot, full refund $\ge$ 24h, 1 credit forfeit on 15m no-show.
4. **Deterministic 4-Factor Competition Ranking**: $0.35 \times \text{Usage} + 0.25 \times \text{Wait} + 0.20 \times \text{Need}_{(\le 7\text{d})} + 0.20 \times \text{Diversity}$.
5. **Strict 3-Tier Tie-Breaking Hierarchy**: Fewest monthly sessions $\to$ earliest request timestamp $\to$ deterministic SHA-256 seeded lottery.
6. **Automated Waitlisting & Instant Promotion**: Losing requests are queued; cancellations auto-promote Waitlist #1.
7. **Restricted Resources & Coordinator Approvals**: Hazardous apparatuses require faculty coordinator safety review.
8. **Audit Receipts, Explainable AI & Deterministic Fallback**: Permanent immutable decision receipts with full fallback resilience.

---

## 8. Repository Structure & Team Ownership

```text
Utilix/
├── app/                           # Next.js App Router (Owned by Full Stack C)
│   ├── layout.tsx                 # Root layout, Plus Jakarta Sans, providers
│   ├── page.tsx                   # Landing page, hero, 4-pillar story, catalog
│   ├── rules/page.tsx             # 8 Fair Allocation Rules & worked example
│   ├── login/page.tsx             # Demo persona onboarding & campus sign-in
│   ├── globals.css                # Neo-brutalist theme tokens & animations
│   └── icon.svg                   # Utilix vector brand favicon
├── components/                    # Shared Design System (Owned by Full Stack C)
│   ├── types.ts                   # 17 workflow statuses, models, decision types
│   ├── Button.tsx                 # Neo-brutalist button (primary/secondary/destructive)
│   ├── Card.tsx                   # Brutalist container, header, content, footer
│   ├── StatusChip.tsx             # Accessible icon + label status badge
│   ├── Badge.tsx                  # Free baseline, credits, training badges
│   ├── CreditPill.tsx             # Credit balance popover (10 credits / 2 free sessions)
│   ├── Modal.tsx                  # Accessible dialog with focus & scroll lock
│   ├── ToastContext.tsx           # Global notification toast provider
│   ├── RoleContext.tsx            # Multi-persona demo auth & quota provider
│   ├── DecisionPanel.tsx          # Signature "Why this decision?" audit component
│   ├── Skeleton.tsx               # Content placeholders
│   ├── EmptyState.tsx             # Friendly empty states with action buttons
│   ├── ErrorState.tsx             # Graceful error screens with retry handler
│   ├── Navbar.tsx                 # Role-aware navigation, credit pill, notifications
│   ├── Footer.tsx                 # Global footer with brand links
│   ├── UtilixLogo.tsx             # Scalable SVG brand marks (Monogram, Wordmark, AppIcon)
│   └── UtilixIntro.tsx            # Animated blinking U logo entry experience
├── docs/                          # Project Quality & Governance Documentation
│   ├── test-plan.md               # End-to-end test plan (Journeys J1-J7)
│   ├── bug-log.md                 # Factual QA tracker & defect resolutions
│   ├── demo-data-guide.md         # 3-minute presentation script & persona data
│   ├── fs-c-progress.md           # Full Stack C completion milestones
│   └── project-pdf-outline.md     # Hackathon submission report outline
├── public/                        # Static assets & brand vectors
├── tailwind.config.ts             # Soft neo-brutalist Tailwind theme
├── tsconfig.json                  # TypeScript configuration
└── package.json                   # Dependencies & project scripts
```

### Team Ownership Matrix

- **Full Stack A (Member 1)**: Database models, Firebase / Firestore migrations, auth tokens, credit ledger, management dashboard.
- **Full Stack B (Member 2)**: Resource catalogue detail pages, booking engine, waitlists, coordinator checkouts & return condition.
- **AI Service (Member 4)**: Allocation scoring algorithm, Gemini API explanations, tiebreaker seeds.
- **Full Stack C (Member 3 - Our Ownership)**: Frontend shell, design system, landing page, rules constitution, login UI, integration QA, responsive design, and documentation suite.

---

## 9. 3-Minute Live Demo Script

1. **0:00 - 0:45 | Welcome & Brand Entry**:
   - Open `http://localhost:3000/`. Notice the centered blinking geometric Utilix U logo entry experience. Click "Enter Utilix".
   - Highlight the soft neo-brutalist aesthetic: saturated yellow `#FFD60A`, warm cream `#FFF9E6`, deep black outlines, hard offset drop shadows.
   - Point out the headline: *"One campus. Every resource. Fair for everyone."*
2. **0:45 - 1:30 | The Interdisciplinary Story & Catalog**:
   - Scroll through the 4-pillar story: 3D Fabrication, Arduino/IoT, Cinema Optics, Audio Booth.
   - Filter by "3D Fabrication". View the Prusa XL 3D Printer.
   - Click "Reserve Slot". Notice the credit cost (2 credits) and the Interdisciplinary Team Membership toggle (activating Rule 4's 20% diversity weight). Click "Submit Fair Request" to observe real credit deduction from 8 to 6 credits.
3. **1:30 - 2:15 | Transparent Conflict Resolution & "Why This Decision?"**:
   - Navigate to `/rules`. Explain the 8 Fair Allocation Rules.
   - Scroll to the Worked Example: Candidate A (Aarav & Maya, Capstone due in 4 days, cross-department) vs Candidate B (Julian, hobby drone, solo).
   - Show the exact mathematical computation: 89.8 pts vs 26.8 pts.
   - Inspect the signature Decision Panel receipt: *"Decision Source: AI Explanation Engine (Fallback Ready)"*.
4. **2:15 - 3:00 | Role Switching & Governance**:
   - Open `/login`. Demonstrate the one-click demo personas. Switch to **Dr. Sarah Lin (Coordinator)** and **Marcus Vance (Admin)**.
   - Show that navigation links, notifications, and permissions update dynamically without password friction.

---

## 10. Vercel Deployment

Utilix is optimized for zero-configuration deployment to Vercel:

1. Push your branch to GitHub (`origin/full-stack-c` or `origin/main`).
2. Import the repository into the [Vercel Dashboard](https://vercel.com).
3. Select **Framework Preset**: Next.js.
4. Set root directory to `./`.
5. Deploy. The project builds cleanly with zero errors.

---

## 11. Known Limitations & Teammate Integration Status

- **Authentication Reality**: The repository currently operates on a verified client-side Demo Provider (`RoleContext`). Production SAML/SSO is staged on `origin/fs-a/data-model` using Firebase authentication tokens.
- **Backend Booking API Merge**: Resource reservations in this branch simulate state transitions and credit balance deductions through the typed demo adapter. Full database mutations connect upon merging `origin/fs-b/utilix-workflow`.
- **AI Explanation Service**: Uses deterministic fallback receipts when the Python allocation service is not running locally.