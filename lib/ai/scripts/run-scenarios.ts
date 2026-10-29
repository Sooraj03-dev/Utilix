import fs from "node:fs";
import path from "node:path";
import { allocateRequests } from "../allocate.js";
import { planBundle } from "../bundle.js";
import { DEFAULT_POLICY } from "../policy.js";
import type { AllocateRequest, BundleRequest, Slot, StudentRequest } from "../types.js";

const printerSlot: Slot = {
  id: "slot-printer-scenarios", resourceId: "printer-3d-mk4", resourceName: "Prusa MK4 3D Printer",
  resourceType: "3d-printer", startsAt: "2026-11-05T10:00:00Z", endsAt: "2026-11-05T12:00:00Z",
  slotType: "free", creditCost: 0, capacity: 1, restricted: false,
};

const makeStudent = (id: string, overrides: Partial<StudentRequest> = {}): StudentRequest => ({
  requestId: id, requestedAt: "2026-10-29T10:00:00Z", sessionsLast30d: 0, sessionsThisMonth: 0,
  waitingHours: 1, deadlineDays: null, departmentsInTeam: 1, creditsAvailable: 10, freeSessionsLeft: 2,
  constraints: { trainingOk: true, withinBookingLimit: true, resourceAvailable: true, noOverlap: true },
  ...overrides,
});

interface ScenarioResult {
  num: number; scenario: string; inputSummary: string; expected: string; actual: string; pass: boolean;
}
const results: ScenarioResult[] = [];

// 1. Two teams, 3D printer slot: A has 4 sessions, B has 0 -> B rank 1
{
  const res = allocateRequests({
    slot: printerSlot, mode: "new_requests",
    requests: [makeStudent("Team-A", { sessionsLast30d: 4, sessionsThisMonth: 4 }), makeStudent("Team-B", { sessionsLast30d: 0, sessionsThisMonth: 0 })],
  });
  const pass = res.ranking[0]?.requestId === "Team-B";
  results.push({ num: 1, scenario: "Competing 3D printer requests", inputSummary: "Team A (4 sessions) vs Team B (0 sessions)", expected: "Team B allocated at rank 1", actual: `${res.ranking[0]?.requestId} rank 1`, pass });
}

// 2. 0 credits, free slot, freeSessionsLeft > 0 -> allocated, charge 0
{
  const res = allocateRequests({ slot: printerSlot, mode: "new_requests", requests: [makeStudent("Student-Free", { creditsAvailable: 0, freeSessionsLeft: 1 })] });
  const all = res.ranking[0];
  const pass = all?.decision === "allocated" && all?.creditCharge === 0;
  results.push({ num: 2, scenario: "Zero credits with free session available", inputSummary: "0 credits, freeSessionsLeft = 1", expected: "Allocated with 0 credit charge", actual: `Decision: ${all?.decision}, Charge: ${all?.creditCharge}`, pass });
}

// 3. 0 credits, peak credit slot -> INSUFFICIENT_CREDITS with off-peak advice
{
  const res = allocateRequests({ slot: { ...printerSlot, slotType: "credit", creditCost: 3 }, mode: "new_requests", requests: [makeStudent("Student-Broke", { creditsAvailable: 0, freeSessionsLeft: 0 })] });
  const ex = res.excluded[0];
  const pass = ex?.code === "INSUFFICIENT_CREDITS" && ex?.studentReason.includes("off-peak");
  results.push({ num: 3, scenario: "Zero credits for credit slot", inputSummary: "0 credits, slot cost = 3", expected: "Excluded INSUFFICIENT_CREDITS with off-peak advice", actual: `Code: ${ex?.code}`, pass });
}

// 4. trainingOk false -> TRAINING_MISSING before scoring
{
  const res = allocateRequests({ slot: printerSlot, mode: "new_requests", requests: [makeStudent("Untrained", { constraints: { trainingOk: false, withinBookingLimit: true, resourceAvailable: true, noOverlap: true } })] });
  const ex = res.excluded[0];
  const pass = ex?.code === "TRAINING_MISSING" && res.ranking.length === 0;
  results.push({ num: 4, scenario: "Safety training unverified", inputSummary: "trainingOk = false", expected: "Excluded TRAINING_MISSING before scoring", actual: `Code: ${ex?.code}`, pass });
}

// 5. withinBookingLimit false -> LIMIT_REACHED explaining limit
{
  const res = allocateRequests({ slot: printerSlot, mode: "new_requests", requests: [makeStudent("Capped", { constraints: { trainingOk: true, withinBookingLimit: false, resourceAvailable: true, noOverlap: true } })] });
  const ex = res.excluded[0];
  const pass = ex?.code === "LIMIT_REACHED" && ex?.studentReason.includes(String(DEFAULT_POLICY.maxActiveBookings));
  results.push({ num: 5, scenario: "Booking quota limit reached", inputSummary: "withinBookingLimit = false", expected: `Excluded LIMIT_REACHED (${DEFAULT_POLICY.maxActiveBookings} max)`, actual: `Code: ${ex?.code}`, pass });
}

// 6. mode promotion -> top waitlisted allocated, others re-ranked
{
  const res = allocateRequests({
    slot: { ...printerSlot, capacity: 1 }, mode: "promotion",
    requests: [makeStudent("Wait-1", { sessionsLast30d: 4, waitingHours: 10 }), makeStudent("Wait-2", { sessionsLast30d: 0, waitingHours: 12 }), makeStudent("Wait-3", { sessionsLast30d: 2, waitingHours: 11 })],
  });
  const pass = res.ranking[0]?.requestId === "Wait-2" && res.ranking[0]?.decision === "allocated" && res.ranking[1]?.waitlistPosition === 1;
  results.push({ num: 6, scenario: "Waitlist promotion on cancellation", inputSummary: "3 waitlisted requests", expected: "Wait-2 allocated, others re-ranked", actual: `${res.ranking[0]?.requestId} allocated, next: ${res.ranking[1]?.requestId}`, pass });
}

// 7. Bundle where DSLR has no window -> partial plan with DSLR unmet
{
  const res = planBundle({
    teamId: "Team-Robotics", creditsAvailable: 10,
    wantedResources: [
      { resourceId: "p", resourceName: "Printer", resourceType: "3d", candidateWindows: [{ slotId: "s1", startsAt: "2026-11-06T10:00:00Z", endsAt: "2026-11-06T12:00:00Z", creditCost: 0 }] },
      { resourceId: "a", resourceName: "Arduino", resourceType: "elec", candidateWindows: [{ slotId: "s2", startsAt: "2026-11-06T10:00:00Z", endsAt: "2026-11-06T12:00:00Z", creditCost: 0 }] },
      { resourceId: "d", resourceName: "DSLR", resourceType: "cam", candidateWindows: [] },
      { resourceId: "s", resourceName: "Studio", resourceType: "space", candidateWindows: [{ slotId: "s3", startsAt: "2026-11-06T10:00:00Z", endsAt: "2026-11-06T12:00:00Z", creditCost: 1 }] },
    ],
  });
  const pass = res.plan.length === 3 && res.unmet.length === 1 && res.unmet[0].resourceId === "d";
  results.push({ num: 7, scenario: "Bundle with missing window", inputSummary: "4 resources requested, DSLR has 0 windows", expected: "Partial plan of 3, DSLR unmet", actual: `Plan: ${res.plan.length}, Unmet: ${res.unmet[0]?.resourceName}`, pass });
}

// 8. Identical scores -> tie-break used, seed returned, deterministic on 2nd run
{
  const req = { slot: printerSlot, mode: "new_requests" as const, seed: "scenario-seed-123", requests: [makeStudent("T1", { sessionsLast30d: 2, waitingHours: 10 }), makeStudent("T2", { sessionsLast30d: 2, waitingHours: 10 })] };
  const r1 = allocateRequests(req);
  const r2 = allocateRequests(req);
  const pass = r1.tieBreak.used && r1.tieBreak.seed === "scenario-seed-123" && r1.ranking[0].requestId === r2.ranking[0].requestId;
  results.push({ num: 8, scenario: "Identical scores tie-breaking", inputSummary: "Identical scores & times", expected: "Tie-break used, seed returned, deterministic", actual: `Tie-break: ${r1.tieBreak.used}, Decided by: ${r1.tieBreak.decidedBy}`, pass });
}

// 9. LLM failure -> source fallback, ranking intact
{
  const res = allocateRequests({ slot: printerSlot, mode: "new_requests", requests: [makeStudent("Req-1", { sessionsLast30d: 5 }), makeStudent("Req-2", { sessionsLast30d: 1 })] }, "fallback");
  const pass = res.audit.source === "fallback" && res.ranking[0].requestId === "Req-2";
  results.push({ num: 9, scenario: "Fallback mode resilience", inputSummary: "Fallback invocation", expected: "Source fallback, ranking intact", actual: `Source: ${res.audit.source}, Winner: ${res.ranking[0].requestId}`, pass });
}

// 10. Deadline in 2 days vs no deadline -> deadline ranks higher
{
  const res = allocateRequests({
    slot: printerSlot, mode: "new_requests",
    requests: [makeStudent("No-Deadline", { sessionsLast30d: 2, waitingHours: 6, deadlineDays: null }), makeStudent("Urgent", { sessionsLast30d: 2, waitingHours: 6, deadlineDays: 2 })],
  });
  const pass = res.ranking[0]?.requestId === "Urgent";
  results.push({ num: 10, scenario: "Academic urgency priority", inputSummary: "Deadline 2 days vs null, equal usage/wait", expected: "Urgent ranks #1", actual: `${res.ranking[0]?.requestId} rank #${res.ranking[0]?.rank}`, pass });
}

// Write Markdown table
let md = `# CampusShare AI/ML Engine - Verification Scenarios\n\nExecuted at: ${new Date().toISOString()}\n\n`;
md += `| # | Scenario | Input Summary | Expected Result | Actual Result | Status |\n|---|---|---|---|---|---|\n`;
for (const r of results) {
  md += `| ${r.num} | ${r.scenario} | ${r.inputSummary} | ${r.expected} | ${r.actual} | **${r.pass ? "PASS" : "FAIL"}** |\n`;
}
fs.writeFileSync(path.resolve(process.cwd(), "lib/ai/TESTING_NOTES.md"), md);
console.log(`Generated TESTING_NOTES.md with ${results.length} scenarios.`);
