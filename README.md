# Utilix — Share. Use. Build.

> **Campus & Community Resource-Sharing Platform with Algorithmic Fairness & Transparent Allocation**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-Custom-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Design Language](https://img.shields.io/badge/Design-Soft_Neo--Brutalism-FFD60A)](#design-system--branding)
[![Branch](https://img.shields.io/badge/Branch-integration%2Futilix--complete-22c55e)](#git-integration-status)

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
1. **Free Baseline Allowance**: Every eligible student receives **2 free off-peak sessions per week** (costing 0 credits) for foundational coursework.
2. **Fair Credit Economy**: Students receive **10 credits per month** to allocate toward scarce peak-demand equipment. Credits cannot be bought with money, preventing pay-to-win dynamics. Full credit refunds apply if cancelled $\ge$ 24 hours prior.
3. **Deterministic 4-Factor Ranking**: When competing requests contest the same slot, Utilix evaluates requests using an objective mathematical formula:
   $$\text{Score} = (0.35 \times \text{Usage}) + (0.25 \times \text{Wait}) + (0.20 \times \text{Need}_{\le 7\text{d}}) + (0.20 \times \text{Diversity})$$
4. **Three-Tier Deterministic Tie-Breaking**: Fewest sessions this month $\to$ earliest request timestamp $\to$ cryptographic seeded lottery.
5. **15-Minute No-Show Reclamation**: Unclaimed slots are revoked after 15 minutes and immediately promoted to Waitlist #1.
6. **Explainable AI with 100% Deterministic Fallback**: AI translates raw allocation metrics into plain English receipts ("Why this decision?"). If the AI service is offline, the deterministic rule engine renders the full receipt without service interruption.

---

## 2. Integrated Tech Stack & Architecture

- **Frontend Framework**: Next.js 16 (App Router) with React 19.
- **Language**: TypeScript 5.
- **Styling**: Tailwind CSS + Custom Soft Neo-Brutalist design tokens.
- **Backend & Database**: Firebase Authentication, Firestore NoSQL, Firebase Admin SDK.
- **Booking & Workflow Engine**: Real concurrency-safe booking, validation, cancellation, and slot allocation engine (`app/api/workflow/*`, `lib/db/*`).
- **AI Intelligence Service**: Python FastAPI allocation engine (`ai-service/`) with deterministic ranking, tie-breaking, simulation, and plain-language explanation generation.
- **Testing**: Vitest for unit & pure rule testing, Pytest for Python AI service.

---

## 3. Design System & Branding

Utilix adopts **Soft Neo-Brutalism**:
- **Primary Brand Yellow**: `#FFD60A`
- **Warm Cream Surface**: `#FFF9E6`
- **Card White**: `#FFFEF2`
- **Deep Black Borders**: `3.5px solid #111111`
- **Hard Offset Drop Shadows**: `4px 4px 0px #111111`, `6px 6px 0px #111111`
- **Physical Press Micro-Interactions**: Buttons shift `translate(2.5px, 2.5px)` with reduced shadow depth on active click.
- **Accessible Indicators**: Every status chip strictly pairs an accessible SVG icon with explicit text label (color is never used alone).
- **Touch-Friendly**: All mobile interactive buttons satisfy minimum $44 \times 44\text{px}$ touch targets.

---

## 4. Local Development Setup

### 1. Prerequisites
- **Node.js**: v18.17+ or v20+
- **Python**: 3.10+ (for `ai-service`)
- **Package Manager**: `npm`

### 2. Environment Configuration
```bash
# Frontend & Backend environment template:
cp .env.example .env.local

# Python AI Service environment template:
cp ai-service/.env.example ai-service/.env
```

Set `AI_SERVICE_SECRET` to the same secret in both `.env.local` and `ai-service/.env`.

### 3. Install Dependencies
```bash
npm install
cd ai-service && pip install -r requirements.txt && cd ..
```

### 4. Running the Application
```bash
# In terminal 1 (Next.js Application):
npm run dev

# In terminal 2 (Python AI Service):
npm run dev:ai
```

Access the web platform at `http://localhost:3000`.

---

## 5. Seed Data Setup

The seed module provides three targets through `scripts/seed.ts`:
- `SEED_TARGET=mock`: writes deterministic JSON fixtures to `scripts/generated/mock-seed-data.json`.
- `SEED_TARGET=emulator`: upserts deterministic records into the Firebase Firestore emulator.
- `SEED_TARGET=demo`: upserts deterministic records into an allowlisted development Firebase project.

Run the seed script:
```bash
npm run seed
```

---

## 6. Pre-Configured Demo Accounts

| Persona | Role | Email | Password | Assigned Resources |
| :--- | :--- | :--- | :--- | :--- |
| **Student** | Student | `student01@utilix.local` | `UtilixPassword2026!` | N/A (20 credits) |
| **Coordinator** | Coordinator | `coord-lab@utilix.local` | `UtilixPassword2026!` | Lab resources (Arduino, ESP32, Pi, Lab Pack) |
| **Admin** | Administrator | `admin-platform@utilix.local` | `UtilixPassword2026!` | All campus resources & oversight |

---

## 7. Testing Suite

```bash
# Run Frontend & Unit tests:
npm run test

# Run TypeScript typecheck:
npm run typecheck

# Run Python AI service tests:
npm run test:ai
```
