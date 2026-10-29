# Utilix — Technical Architecture & Deployment Guide

> **Utilix**: Share. Use. Build.  
> The modern resource-sharing platform that makes it simple for students, researchers, and campus communities to discover, share, borrow, and utilize underutilized equipment, creative studios, and technical labs with transparent algorithmic fairness.

---

## 1. Brand Identity & Visual System

- **Brand Name**: **Utilix**
- **Primary Tagline**: **Share. Use. Build.**
- **Design Language**: Soft Neo-Brutalism (bright saturated yellow background `#FFD60A`, warm cream cards `#FFF9E6`, 3.5px solid black borders, and hard black offset shadows).
- **Primary Logo**: Combination Mark — Stylized geometric letter U with cream body and yellow accent, paired with the heavy rounded Utilix wordmark.
- **App Icon**: Yellow Square — Bright yellow rounded-square with centered geometric U, 3D black shadow, and top-right sparkle star.
- **Animated Brand Intro**: High-impact interactive splash sequence featuring physical spring physics and tagline reveal.

---

## 2. Integrated Tech Stack & Architecture

- **Frontend & App Router**: Next.js 16 / React 19 with App Router, TypeScript, and Tailwind CSS.
- **Backend & Database**: Google Firebase Authentication, Cloud Firestore, and Firebase Admin SDK.
- **Workflows & State Machine**: Atomic booking reservation, cancellation, slot validation, and concurrent access control (`app/api/workflow/*` and `lib/db/*`).
- **AI Intelligence & Allocation Service**: Python FastAPI microservice (`ai-service/`) providing deterministic multi-factor scoring, tie-breaking, recommendations, and plain-language explanation generation.
- **Security & Authorization**: Role-based access control (Student, Coordinator, Administrator) with server-side token verification and client-side guards.

---

## 3. Quick Start & Setup

### Prerequisites
- **Node.js**: v18.17+ or v20+
- **Python**: 3.10+ (for `ai-service`)
- **Package Manager**: `npm`

### Installation
```bash
# 1. Install frontend & backend dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
cp ai-service/.env.example ai-service/.env

# 3. Start Next.js development server
npm run dev

# 4. In a separate terminal, start the Python AI service
npm run dev:ai
```

The application runs locally at **`http://localhost:3000`** and the AI service runs at **`http://localhost:8000`**.

---

## 4. Pre-Configured Demo Accounts (One-Click Login)
Navigate to `/login` or use the role switcher in the top-right navbar:

| Persona | Name | Role | Department | Default Credits | Key Permissions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Student** | Aarav Sharma | `student` | Mechatronics & Robotics (Senior) | **8** / 10 | Book slots, view priority math, join waitlists |
| **Coordinator** | Dr. Sarah Lin | `coordinator` | Design Lab & Makerspace Lead | 50 | Review queue, verify certifications, audit overrides |
| **Admin** | Marcus Vance | `admin` | Dean of Campus Facilities | 999 | Configure fair quota caps, algorithm weights, platform audit |

---

## 5. Components Library (`/components`)
- `UtilixLogo.tsx`: Combination mark, Monogram U, Wordmark, and App Icon.
- `UtilixIntro.tsx`: Animated brand intro sequence with interactive replay button.
- `Button.tsx`: Neo-Brutalist tactile buttons with active click translation.
- `Card.tsx`: Cream containers with 3.5px black borders and 5px hard shadows.
- `DecisionPanel.tsx`: Signature "Why this decision?" plain-language explanation block.
- `StatusChip.tsx`: Strict pairing of status color, Lucide icon, and label.
- `CreditPill.tsx`: Renewable campus allowance pill with interactive popover.
- `Modal.tsx`: Accessible dialog with mobile sheet mode.
- `Navbar.tsx` & `Footer.tsx`: Unified Utilix shell with role switcher and drawer.
