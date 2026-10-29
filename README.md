# Utilix

A fair campus equipment and space sharing platform.

## Folder Ownership

| Folder | Owner | Responsibility |
|--------|-------|----------------|
| `app/dashboard`, `app/history`, `lib/db`, `lib/types`, `lib/firebase`, `lib/auth`, `lib/mocks`, `scripts/`, `firebase/` | **A** | Foundation, data layer, dashboards |
| `app/(workflow)`, `app/api/workflow`, `lib/ai-client.ts` | **B** | Booking workflow, API routes |
| `ai-service/` | **AI** | AI/ML service |
| `app/layout.tsx`, `app/page.tsx`, `app/rules`, `app/login`, `components/`, `docs/` | **C** | Frontend shell, QA, docs |

## Branch Naming

| Owner | Pattern |
|-------|---------|
| A | `fs-a/*` |
| B | `fs-b/*` |
| AI | `ai/*` |
| C | `fs-c/*` |

## Environment setup

1. **Copy the templates** (they are never committed with real values):
   ```bash
   cp .env.example .env.local
   cp ai-service/.env.example ai-service/.env
   # For emulator-based tests:
   cp .env.test.example .env.test
   ```

2. **Fill in Firebase values** from the [Firebase console](https://console.firebase.google.com):
   - **Client keys** (`NEXT_PUBLIC_FIREBASE_*`): Project settings → Your apps → Web app.
   - **Admin keys** (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`): Project settings → Service accounts → Generate new private key. Paste the private key inside double quotes with literal `\n` sequences.

3. **AI service secret**: Set `AI_SERVICE_SECRET` to the same value in both `/.env.local` and `/ai-service/.env`. This shared secret authenticates calls from Next.js to the FastAPI service.

4. **`AI_API_KEY`** can stay **empty**. When empty, the AI service uses a deterministic fallback (templated explanations, `source: "fallback"`). This is the default for local development and demos.

5. **Golden rule**: Never commit real keys. Only `*.example` files are tracked by git. If `git status` ever shows a `.env.local` or `serviceAccount*.json`, something is wrong — check `.gitignore`.

## Rule

> Never merge a broken build into `main`.