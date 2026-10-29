# Seed scenarios

The deterministic seed dataset covers:

1. Student requests Arduino kit (`booking-approved-arduino`).
2. Two students compete for one DSLR (`booking-dslr-approved`, `booking-dslr-waitlisted`, `booking-overlap-pending`).
3. Student fails training eligibility (`booking-rejected-eligibility`).
4. Coordinator approves booking (`audit-coordinator-approve-1`).
5. Maintenance blocks booking (`maintenance-lab-equipment-a`, `booking-maintenance-blocked`).
6. Waitlisted student receives slot notification (`notification-waitlist-promotion-student-06`).
7. Credit reserve/spend/refund flow (`credit-*` records).
8. Admin views statistics (`audit-admin-view-stats`).

## Safe usage

- Default: `ALLOW_SEED=false`.
- Live/demo writes require:
  - `ALLOW_SEED=true`
  - `SEED_TARGET=demo`
  - `FIREBASE_PROJECT_ID` present in `SEED_DEV_PROJECT_ALLOWLIST`.
- No collection wipes and no destructive deletes are performed.
- Deterministic document IDs ensure idempotent reruns.

