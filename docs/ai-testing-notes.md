# AI Testing Notes

Notes and observations from testing the FastAPI AI/ML microservice (`ai-service/`).

## Architecture & Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | `GET` | Health status probe, secret detection, and LLM configuration info |
| `/allocate` | `POST` | Deterministic Fair Allocation Engine with constraint validation and audit trail |
| `/alternatives` | `POST` | Suggests top-3 alternative slots when requested slot is contended |
| `/bundle` | `POST` | Synchronous multi-resource team reservation scheduler |
| `/insights` | `GET` | Campus resource utilization, Gini coefficient, Jain's index, and recommendations |

## Test Verification Summary

### Test Suite Execution
- **Environment**: Python 3.11.9, FastAPI 0.115.12, Pydantic 2.13.4, Pytest 9.1.1
- **Command**: `python -m pytest -v` (inside `ai-service/`)
- **Result**: `18 passed in 1.02s` (100% pass rate)

### Test Modules Tested
1. `tests/test_scoring.py`:
   - `test_usage_monotonic_decrease`: verified inverse scaling ($1.0 / (1.0 + \text{sessions})$).
   - `test_waiting_saturation`: verified linear increase up to 72 hours, clamped at 1.0.
   - `test_need_score_clamping`: verified 0-10 normalization to [0.0, 1.0].
   - `test_diversity_scoring`: verified department and priority group weighting.
   - `test_weight_normalisation`: verified weights sum to 1.0.
2. `tests/test_tiebreak.py`:
   - `test_mulberry32_determinism`: verified PRNG output stability across runs with identical seed.
   - `test_fewest_sessions_tiebreaker`: verified fewest sessions takes precedence in tie groups.
   - `test_earliest_request_tiebreaker`: verified timestamp ordering for identical scores.
3. `tests/test_allocate.py`:
   - `test_training_unverified_exclusion`: requests without safety training excluded with `TRAINING_MISSING`.
   - `test_free_slot_exhaustion_exclusion`: free slot requests with 0 free sessions excluded with `INSUFFICIENT_CREDITS`.
   - `test_credit_slot_insufficient_credits`: paid slots excluded when user balance is insufficient.
   - `test_fair_allocation_and_capacity`: multi-capacity slot correctly allocates top candidates and waitlists the remainder.
4. `tests/test_routers.py`:
   - `test_alternatives_filtering`: ranked alternatives by resource, department, and cost similarity.
   - `test_bundle_scheduler`: complete synchronous match for multi-equipment requests.
   - `test_gini_and_jain_metrics`: mathematical correctness of Gini and Jain fairness index calculations.
5. `tests/test_scenarios.py`:
   - `test_health_endpoint`: HTTP 200 OK with correct service metadata.
   - `test_conflict_printer_scenario`: End-to-end HTTP POST to `/allocate` resolving conflicting requests.
   - `test_insights_endpoint`: HTTP 200 OK returning utilization and narrative.

## How to Run Locally

```bash
cd ai-service
# Run tests:
python -m pytest -v

# Start the service:
uvicorn app.main:app --reload --port 8000
```
