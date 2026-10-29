# Utilix — Local Development Guide

## 1. Prerequisites
- Node.js >= 20.x
- Python 3.11+
- PowerShell (on Windows) or Bash

## 2. Environment Configuration
Ensure `.env.local` is present in the repository root and `ai-service/.env` is present in `ai-service/`.

The repository contains preconfigured templates:
- `.env.example` (root)
- `ai-service/.env.example`

## 3. Running the Entire Application

### Using the Automated Launcher:
On Windows:
```powershell
./start.ps1
```
This script validates ports, checks dependencies, and launches both:
- **Next.js Web Frontend & API Routes** on `http://localhost:3000`
- **FastAPI AI Microservice** on `http://localhost:8000`

### Running Services Independently:

**Frontend & API:**
```bash
npm run dev
```

**Python AI Service:**
```bash
cd ai-service
uvicorn app.main:app --reload --port 8000
```

## 4. Running Quality Checks & Tests

- **TypeScript Typecheck:**
  ```bash
  npm run typecheck
  ```
- **Vitest Unit & Integration Tests:**
  ```bash
  npm run test
  npx vitest run tests/auth tests/mocks tests/seed "app/(workflow)/_lib/workflow.test.ts"
  ```
- **Python Pytest Suite:**
  ```bash
  python -m pytest ai-service/tests
  ```
- **Next.js Production Build:**
  ```bash
  npm run build
  ```
- **Verify Live Firestore Persistence:**
  ```bash
  npx tsx --env-file=.env.local scratch/verify_live_firestore_crud.ts
  ```
