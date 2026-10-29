# ai-service

FastAPI AI/ML microservice for CampusShare fair equipment and space sharing. Owner: **AI**

---

## Architecture & Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Service health status, secret detection, and LLM configuration. |
| `POST` | `/allocate` | Deterministic Fair Allocation Engine with constraint validation and audit trail. |
| `POST` | `/alternatives` | Smart alternative slot recommendations for unallocated or waitlisted users. |
| `POST` | `/bundle` | Multi-resource team scheduler finding common slot intervals. |
| `GET` | `/insights` | Campus fairness telemetry (Gini coefficient, Jain's index, contention rates). |

---

## Exclusion Codes (`POST /allocate`)

The engine checks hard constraints before scoring in the following strict order:

| Code | Reason / Description |
|------|----------------------|
| `RESOURCE_UNAVAILABLE` | Resource is undergoing maintenance or temporarily decommissioned (`resourceAvailable == False`). |
| `TRAINING_MISSING` | Mandatory safety or lab equipment training has not been verified (`trainingVerified == False`). |
| `LIMIT_REACHED` | Active reservation limit reached for the user in this resource category (`withinBookingLimit == False`). |
| `OVERLAP` | Request conflicts with an existing booking in the student's schedule (`noOverlap == False`). |
| `INSUFFICIENT_CREDITS` | Insufficient credit balance for paid slots (`currentCreditBalance < creditCost`) OR free weekly session quota exhausted for free slots (`freeSessionsLeft <= 0`). |

---

## Scoring Formulas (Source of Truth)

All applicants are evaluated with deterministic, transparent mathematical formulas:

1. **Usage Score ($S_{\text{usage}}$)**: $\frac{1.0}{1.0 + \max(0, \text{sessionsThisMonth})}$. Monotonically favors users with fewer prior sessions.
2. **Waiting Score ($S_{\text{waiting}}$)**: $\min\left(1.0, \frac{\text{waitingHours}}{72.0}\right)$. Linearly rewards students waiting in queue up to 72 hours.
3. **Need Urgency ($S_{\text{need}}$)**: $\min\left(1.0, \frac{\text{projectNeedScore}}{10.0}\right)$. Standardized project need urgency (1–10).
4. **Diversity & Equity ($S_{\text{diversity}}$)**: $\min\left(1.0, 0.5 + 0.3 \times \mathbb{I}_{\text{priority}} + \frac{0.2}{1 + \text{depSessions}}\right)$. Supports cross-departmental access and verified priority initiatives.

**Total Score**:
$$\text{Total Score} = w_{\text{usage}} S_{\text{usage}} + w_{\text{waiting}} S_{\text{waiting}} + w_{\text{need}} S_{\text{need}} + w_{\text{diversity}} S_{\text{diversity}}$$
Weights are normalized so $\sum w_i = 1.0$ (Default: usage=0.35, waiting=0.25, need=0.20, diversity=0.20).

---

## Deterministic Tie-Breaking

When candidate scores are within $\epsilon = 0.0001$, ties are resolved in order:
1. `fewestSessionsThisMonth` (ascending)
2. `earliestRequest` (submission timestamp ascending)
3. `seededLottery` (PRNG using 32-bit `mulberry32` with seed logged in audit)

---

## Promotion Mode

When `mode == "promotion"` (e.g., following a reservation cancellation), the endpoint applies the identical ranking criteria to promote the highest-priority waitlisted request without unfair bias.

---

## LLM Privacy & Fallback

- **Privacy Guarantee**: Student names (`userName`), emails, or personal identifiers are **never** passed to the LLM. Candidates are anonymized as `Candidate {requestId}`.
- **Resilience**: If `AI_API_KEY` is empty, or the LLM times out ($> \text{AI\_TIMEOUT\_MS}$), fails, or produces text contradicting the ground-truth decision, the service immediately falls back to deterministic templates (`source: "fallback"`).
- **Word Limits**:
  - `studentReason` $\le$ 60 words
  - `coordinatorSummary` $\le$ 25 words

---

## Running and Testing

```bash
cd ai-service

# Run all unit and integration tests
python -m pytest -v

# Run the microservice locally
uvicorn app.main:app --reload --port 8000
```
