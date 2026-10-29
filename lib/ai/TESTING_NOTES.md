# CampusShare AI/ML Engine - Verification Scenarios

Executed at: 2026-10-29T06:14:55.175Z

| # | Scenario | Input Summary | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| 1 | Competing 3D printer requests | Team A (4 sessions) vs Team B (0 sessions) | Team B allocated at rank 1 | Team-B rank 1 | **PASS** |
| 2 | Zero credits with free session available | 0 credits, freeSessionsLeft = 1 | Allocated with 0 credit charge | Decision: allocated, Charge: 0 | **PASS** |
| 3 | Zero credits for credit slot | 0 credits, slot cost = 3 | Excluded INSUFFICIENT_CREDITS with off-peak advice | Code: INSUFFICIENT_CREDITS | **PASS** |
| 4 | Safety training unverified | trainingOk = false | Excluded TRAINING_MISSING before scoring | Code: TRAINING_MISSING | **PASS** |
| 5 | Booking quota limit reached | withinBookingLimit = false | Excluded LIMIT_REACHED (3 max) | Code: LIMIT_REACHED | **PASS** |
| 6 | Waitlist promotion on cancellation | 3 waitlisted requests | Wait-2 allocated, others re-ranked | Wait-2 allocated, next: Wait-3 | **PASS** |
| 7 | Bundle with missing window | 4 resources requested, DSLR has 0 windows | Partial plan of 3, DSLR unmet | Plan: 3, Unmet: DSLR | **PASS** |
| 8 | Identical scores tie-breaking | Identical scores & times | Tie-break used, seed returned, deterministic | Tie-break: true, Decided by: seededLottery | **PASS** |
| 9 | Fallback mode resilience | Fallback invocation | Source fallback, ranking intact | Source: fallback, Winner: Req-2 | **PASS** |
| 10 | Academic urgency priority | Deadline 2 days vs null, equal usage/wait | Urgent ranks #1 | Urgent rank #1 | **PASS** |
