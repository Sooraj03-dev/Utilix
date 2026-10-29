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

## Rule

> Never merge a broken build into `main`.