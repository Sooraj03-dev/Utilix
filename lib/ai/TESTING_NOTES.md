# CampusShare AI/ML Engine - Verification Scenarios

Executed at: 2026-10-29T05:57:37.097Z

| # | Scenario | Input Summary | Expected Result | Actual Result | Status |
|---|----------|---------------|-----------------|---------------|--------|
| 1 | Competing 3D printer requests | Team A (4 sessions) vs Team B (0 sessions) | Team B allocated at rank 1 | Team-B allocated at rank 1 | **PASS** |
| 2 | Zero credits with free session available | 0 credits, freeSessionsLeft = 1, free slot | Allocated with 0 credit charge | Decision: allocated, Charge: 0 | **PASS** |
| 3 | Zero credits for credit slot | 0 credits, 0 free sessions, slot cost = 3 | Excluded INSUFFICIENT_CREDITS with off-peak advice | Code: INSUFFICIENT_CREDITS, Hint: "Insufficient credits: this slot req..." | **PASS** |
| 4 | Safety training unverified | trainingOk = false | Excluded TRAINING_MISSING before scoring | Excluded before scoring with code: TRAINING_MISSING | **PASS** |
| 5 | Booking quota limit reached | withinBookingLimit = false | Excluded LIMIT_REACHED citing policy limit | Code: LIMIT_REACHED, Explains limit of 3 | **PASS** |
| 6 | Waitlist promotion on cancellation | 3 waitlisted candidates (Wait-1, Wait-2, Wait-3) | Wait-2 promoted to allocated, others re-ranked #1 and #2 | Wait-2 allocated, positions: Wait-3 (#1), Wait-1 (#2) | **PASS** |
| 7 | Multi-resource bundle with missing window | 4 resources requested, DSLR camera has 0 open windows | Partial plan of 3 resources, DSLR listed as unmet | Plan: 3 resources, Unmet: DSLR Camera | **PASS** |
| 8 | Identical scores tie-breaking | Exact identical score components and timestamps | Tie-break used, seed returned, deterministic outcome | Tie-break used: true, Decided by: seededLottery, Deterministic: true | **PASS** |
| 9 | Fallback mode resilience | No LLM provider configured / fallback invocation | Source 'fallback', deterministic ranking intact | Source: fallback, Winner: Req-2 | **PASS** |
| 10 | Academic urgency priority | Deadline in 2 days vs null deadline, equal usage/wait | Urgent-Deadline ranks #1 | Urgent-Deadline ranked #1 | **PASS** |
