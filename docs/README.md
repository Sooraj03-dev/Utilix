# Utilix — Technical Architecture & Deployment Guide

> **Utilix**: Share. Use. Build.  
> The modern resource-sharing platform that makes it simple for students, researchers, and campus communities to discover, share, borrow, and utilize underutilized equipment, creative studios, and technical labs with transparent algorithmic fairness.

---

## 1. Brand Identity & Visual System

- **Brand Name**: **Utilix**
- **Primary Tagline**: **Share. Use. Build.**
- **Design Language**: Soft Neo-Brutalism (bright saturated yellow background `#FFD60A`, warm cream cards `#FFF9E6`, 3.5px solid black borders, and hard black offset shadows).
- **Primary Logo**: Combination Mark (Design 3) — Stylized geometric letter U with cream body and yellow accent, paired with the heavy rounded Utilix wordmark.
- **App Icon**: Yellow Square (Design 6) — Bright yellow rounded-square with centered geometric U, 3D black shadow, and top-right sparkle star.
- **Animated Brand Intro**: High-impact interactive splash sequence featuring physical spring physics and tagline reveal.

---

## 2. Quick Start & Setup

### Prerequisites
- **Node.js**: v18.17+ or v20+ (tested on Node v24)
- **Package Manager**: `npm` (v9+) or `pnpm`

### Installation
```bash
# Clone the repository
git clone https://github.com/Sooraj03-dev/Utilix.git
cd Utilix

# Checkout branch
git checkout full-stack-c

# Install dependencies
npm install

# Start local Next.js development server
npm run dev
```

The application will start locally at **`http://localhost:3000`**.

---

## 3. Environment Variables (`.env.local`)

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | Public application URL | `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase endpoint (Role A backend) | `https://xyzcompany.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anonymous client key for Supabase | `eyJhbGciOi...` |
| `GEMINI_API_KEY` | Google Gemini AI key (Role B AI Engine) | `AIzaSy...` |
| `UTILIX_ALLOCATION_MODE` | Fairness calculation algorithm mode | `production` / `demo` |

---

## 4. Pre-Configured Demo Accounts (One-Click Login)
Navigate to `/login` or use the role switcher in the top-right navbar:

| Persona | Name | Role | Department | Default Credits | Trust Score | Key Permissions |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Student** | Aarav Sharma | `student` | Mechatronics & Robotics (Senior) | **7** / 10 | 96% | Book slots, view priority math, join waitlists |
| **Coordinator** | Dr. Sarah Lin | `coordinator` | Design Lab & Makerspace Lead | 50 | 100% | Review queue, verify certifications, audit overrides |
| **Admin** | Marcus Vance | `admin` | Dean of Campus Facilities | 999 | 100% | Configure fair quota caps, algorithm weights, platform audit |

---

## 5. Components Library (`/components`)
- `UtilixLogo.tsx`: Combination mark (Design 3), Monogram U, Wordmark, and App Icon (Design 6).
- `UtilixIntro.tsx`: Animated brand intro sequence with interactive replay button.
- `Button.tsx`: Neo-Brutalist tactile buttons with active click translation.
- `Card.tsx`: Cream containers with 3.5px black borders and 5px hard shadows.
- `DecisionPanel.tsx`: Signature "Why this decision?" plain-language explanation block.
- `StatusChip.tsx`: Strict pairing of status color, Lucide icon, and label.
- `CreditPill.tsx`: Renewable campus allowance pill with interactive popover.
- `Modal.tsx`: Accessible dialog with mobile sheet mode.
- `Navbar.tsx` & `Footer.tsx`: Unified Utilix shell with role switcher and drawer.
