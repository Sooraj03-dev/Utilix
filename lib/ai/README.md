# CampusShare AI/ML Module (`/lib/ai` & `/app/api/ai`)

CampusShare's defining feature is its **Fair Allocation Engine**. When valid student requests compete for limited college equipment and specialized spaces, the engine ranks them using published policy rules, resolves ties deterministically, and explains every outcome in plain, respectful language.

---

## 1. Core Principles & Hard Rules

1. **Deterministic Decisions**: Hard constraints, scoring, ranking, tie-breaking, and exclusions are 100% deterministic code. The LLM only writes plain-language wording and summaries; it can never alter or contradict a decision.
2. **Zero Coupling**: Strictly self-contained inside `/lib/ai` and `/app/api/ai`. No external database, component, or types imports. All required state arrives in request payloads.
3. **Resilience & Fallback Guarantee**: Every endpoint functions with no API key, on network timeout, or on invalid LLM JSON. Under any LLM failure, the engine returns identical decisions with templated fallback text (`source: "fallback"`). It never throws 5xx due to AI failures.
4. **Privacy by Design**: Real names, emails, and student IDs are never transmitted to external AI providers. Only opaque identifiers and computed numerical facts are passed.
5. **Strict TypeScript & Limits**: Maximum 100 requests per batch, 200 KB request body limit.

---

## 2. File Structure

```
lib/ai/
  index.ts              # Public exports for all routes
  types.ts              # Zod schemas & TypeScript inferred contracts
  policy.ts             # Default policy definitions and normalisation
  constraints.ts        # Hard constraint guards (training, limits, credits)
  scoring.ts            # Component scoring (usage, waiting, need, diversity)
  tiebreak.ts           # Deterministic tie-breaker with mulberry32 PRNG
  allocate.ts           # Core allocation orchestrator
  templates.ts          # Deterministic plain-language fallback templates
  llm.ts                # Provider-agnostic fetch client with deadline & retry
  explain.ts            # LLM explanation layer with validation & in-memory cache
  envelope.ts           # Standard request validation & response envelopes
  counterfactual.ts     # "What would change my result?" advice generator
  alternatives.ts       # Top-3 alternative recommendations
  bundle.ts             # Multi-resource team scheduler
  metrics.ts            # Gini coefficient, Jain's index, utilisation
  insights.ts           # Admin utilisation & fairness analyzer
  simulate.ts           # FCFS vs Fair Allocation simulator
  condition.ts          # Condition report severity analyzer
  forecast.ts           # 7-day seasonal moving average demand forecast
  anomalies.ts          # User cancellation & no-show detector
  fixtures/             # Sample JSON payloads for all scenarios
  __tests__/            # Comprehensive Vitest test suites
  scripts/              # Automated verification runner
app/api/ai/
  allocate/route.ts     # POST /api/ai/allocate
  health/route.ts       # GET /api/ai/health
  alternatives/route.ts # POST /api/ai/alternatives
  bundle/route.ts       # POST /api/ai/bundle
  insights/route.ts     # POST & GET ?demo=1 /api/ai/insights
  simulate/route.ts     # POST /api/ai/simulate
  condition/route.ts    # POST /api/ai/condition
  forecast/route.ts     # POST /api/ai/forecast
```

---

## 3. Environment Variables

Configure these in `.env.local` (see `.env.example`):

| Variable | Default | Description |
|---|---|---|
| `AI_PROVIDER` | `none` | AI provider: `gemini`, `openai_compatible`, or `none` |
| `AI_API_KEY` | `""` | Provider API key (optional; defaults to fallback if omitted) |
| `AI_MODEL` | `""` | Model identifier (e.g., `gemini-1.5-flash` or `google/gemini-flash-1.5`) |
| `AI_BASE_URL` | `https://openrouter.ai/api/v1` | Base URL for OpenAI-compatible providers |
| `AI_TIMEOUT_MS` | `7000` | Total overall timeout budget in milliseconds |

---

## 4. API Endpoints & Contracts

All endpoints return a uniform envelope:
```json
{
  "ok": true,
  "source": "ai" | "fallback",
  "data": { ... },
  "meta": { "latencyMs": 12, "policyVersion": "v1", "llm": { ... } }
}
```

### 1. `POST /api/ai/allocate`
Ranks competing requests for a given equipment slot.
- **Request**:
```json
{
  "slot": {
    "id": "slot-printer-001",
    "resourceId": "res-printer-3d",
    "resourceName": "Prusa MK4 3D Printer",
    "resourceType": "3d-printer",
    "startsAt": "2026-11-02T10:00:00Z",
    "endsAt": "2026-11-02T12:00:00Z",
    "slotType": "free",
    "creditCost": 0,
    "capacity": 1,
    "restricted": false
  },
  "mode": "new_requests",
  "requests": [
    {
      "requestId": "req-1",
      "requestedAt": "2026-10-29T08:00:00Z",
      "sessionsLast30d": 4,
      "sessionsThisMonth": 4,
      "waitingHours": 2,
      "deadlineDays": null,
      "departmentsInTeam": 1,
      "creditsAvailable": 10,
      "freeSessionsLeft": 2,
      "constraints": {
        "trainingOk": true,
        "withinBookingLimit": true,
        "resourceAvailable": true,
        "noOverlap": true
      }
    }
  ]
}
```
*Note on `mode`: Use `"new_requests"` for initial batch allocations. When an existing reservation is cancelled, call with `mode: "promotion"` passing current waitlisted requests; the engine applies the same fair ranking rules to promote the top candidate and re-rank the rest.*

### 2. `GET /api/ai/health`
Health & LLM configuration status.
- Query `?probe=1` initiates a tiny network probe to verify credentials.

### 3. `POST /api/ai/alternatives`
Finds top-3 alternative equipment slots for waitlisted or excluded requests.

### 4. `POST /api/ai/bundle`
Coordinates multi-resource sessions for cross-functional teams (e.g., 3D printer + Arduino + studio).

### 5. `GET /api/ai/insights?demo=1` & `POST /api/ai/insights`
Calculates resource utilisation, identifies underused/over-contended equipment, computes Gini and Jain fairness indexes, and recommends rebalancing.

### 6. `POST /api/ai/simulate`
Generates a comparative benchmark of First-Come-First-Served vs. CampusShare Fair Allocation.

### 7. `POST /api/ai/condition`
Evaluates post-session check-in notes to determine equipment wear severity (`none`, `minor`, `major`).

### 8. `POST /api/ai/forecast`
7-day seasonal moving average demand forecast per equipment.

---

## 5. Exclusion & Error Codes

| Code | Explanation |
|---|---|
| `TRAINING_MISSING` | Required safety certification is unverified or expired |
| `LIMIT_REACHED` | Student has reached maximum active bookings quota |
| `RESOURCE_UNAVAILABLE` | Resource is reserved or under maintenance |
| `OVERLAP` | Student has a conflicting reservation during the timeframe |
| `INSUFFICIENT_CREDITS` | Student credit balance is lower than slot cost |
| `VALIDATION_ERROR` | Request payload failed Zod schema or exceeds 200 KB |

---

## 6. PowerShell Usage Examples

```powershell
# Run allocation scenario 1 (Printer Conflict)
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/ai/allocate `
  -ContentType "application/json" `
  -Body (Get-Content lib/ai/fixtures/conflict-printer.json -Raw)

# Inspect AI health status
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/ai/health?probe=1"

# Query Admin Insights Demo
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/ai/insights?demo=1"

# Run Fair Allocation Simulator
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/ai/simulate `
  -ContentType "application/json" `
  -Body (Get-Content lib/ai/fixtures/simulate-default.json -Raw)
```

---

## 7. Integration Notes for Teammates

### For Full Stack B (Workflow / API Coordinator)
- **Call Endpoint**: `POST /api/ai/allocate`.
- **Payload Requirements**: Construct request using `StudentRequestSchema` including pre-checked constraints.
- **Store from Response**:
  - `ranking`: Array of student allocations.
  - `studentReason`: Store on the booking record for display to students.
  - `coordinatorSummary`: Store for coordinator audit log.
  - `source`: `"ai"` or `"fallback"`.
  - `audit`: Store the audit object on the booking batch record.
- **Handling Cancellations**: When a slot is freed, call `/api/ai/allocate` with `mode: "promotion"` passing current waitlisted requests to automatically promote the top candidate.

### For Full Stack A (Dashboard & Admin Insights)
- **Call Endpoint**: Call `GET /api/ai/insights?demo=1` or `POST /api/ai/insights`.
- **Display**: Bind `resourceUtilisation`, `overContended`, `underused`, `fairness.jainIndex`, `fairness.gini`, and `redistributionSuggestions` directly to admin dashboard cards.

### For Full Stack C (Frontend UI & DecisionPanel)
- Bind the following fields from `RankedRequest`:
  - `decision`: `"allocated"` (show green badge) or `"waitlisted"` (show amber badge with position `#X`).
  - `studentReason`: Primary explanation text.
  - `counterfactual`: Display as a "💡 Pro Tip" callout if non-null.
  - `requiresCoordinatorApproval`: Display notice if `true`.
