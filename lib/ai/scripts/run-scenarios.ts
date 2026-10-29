import fs from "node:fs";
import path from "node:path";
import { allocateRequests } from "../allocate.js";
import { planBundle } from "../bundle.js";
import { DEFAULT_POLICY } from "../policy.js";
import type { AllocateRequest, BundleRequest, Slot, StudentRequest } from "../types.js";

interface ScenarioResult {
  num: number;
  scenario: string;
  inputSummary: string;
  expected: string;
  actual: string;
  pass: boolean;
}

const printerSlot: Slot = {
  id: "slot-printer-scenarios",
  resourceId: "printer-3d-mk4",
  resourceName: "Prusa MK4 3D Printer",
  resourceType: "3d-printer",
  startsAt: "2026-11-05T10:00:00Z",
  endsAt: "2026-11-05T12:00:00Z",
  slotType: "free",
  creditCost: 0,
  capacity: 1,
  restricted: false,
};

const makeStudent = (
  id: string,
  overrides: Partial<StudentRequest> = {}
): StudentRequest => ({
  requestId: id,
  requestedAt: "2026-10-29T10:00:00Z",
  sessionsLast30d: 0,
  sessionsThisMonth: 0,
  waitingHours: 1,
  deadlineDays: null,
  departmentsInTeam: 1,
  creditsAvailable: 10,
  freeSessionsLeft: 2,
  constraints: {
    trainingOk: true,
    withinBookingLimit: true,
    resourceAvailable: true,
    noOverlap: true,
  },
  ...overrides,
});

const results: ScenarioResult[] = [];

// 1. Two teams, same 3D printer slot; A has 4 sessions this month, B has 0. Expect B rank 1.
{
  const input: AllocateRequest = {
    slot: printerSlot,
    mode: "new_requests",
    requests: [
      makeStudent("Team-A", { sessionsLast30d: 4, sessionsThisMonth: 4 }),
      makeStudent("Team-B", { sessionsLast30d: 0, sessionsThisMonth: 0 }),
    ],
  };
  const res = allocateRequests(input);
  const actualWinner = res.ranking[0]?.requestId;
  const pass = actualWinner === "Team-B";
  results.push({
    num: 1,
    scenario: "Competing 3D printer requests",
    inputSummary: "Team A (4 sessions) vs Team B (0 sessions)",
    expected: "Team B allocated at rank 1",
    actual: `${actualWinner} allocated at rank 1`,
    pass,
  });
}

// 2. 0 credits, free off-peak slot, freeSessionsLeft above 0. Expect allocated with charge 0.
{
  const input: AllocateRequest = {
    slot: printerSlot,
    mode: "new_requests",
    requests: [makeStudent("Student-Free", { creditsAvailable: 0, freeSessionsLeft: 1 })],
  };
  const res = allocateRequests(input);
  const allocated = res.ranking[0];
  const pass = allocated?.decision === "allocated" && allocated?.creditCharge === 0;
  results.push({
    num: 2,
    scenario: "Zero credits with free session available",
    inputSummary: "0 credits, freeSessionsLeft = 1, free slot",
    expected: "Allocated with 0 credit charge",
    actual: `Decision: ${allocated?.decision}, Charge: ${allocated?.creditCharge}`,
    pass,
  });
}

// 3. 0 credits, peak credit slot. Expect excluded INSUFFICIENT_CREDITS with an off-peak suggestion.
{
  const peakSlot: Slot = { ...printerSlot, slotType: "credit", creditCost: 3 };
  const input: AllocateRequest = {
    slot: peakSlot,
    mode: "new_requests",
    requests: [makeStudent("Student-Broke", { creditsAvailable: 0, freeSessionsLeft: 0 })],
  };
  const res = allocateRequests(input);
  const ex = res.excluded[0];
  const pass = ex?.code === "INSUFFICIENT_CREDITS" && ex?.studentReason.includes("off-peak");
  results.push({
    num: 3,
    scenario: "Zero credits for credit slot",
    inputSummary: "0 credits, 0 free sessions, slot cost = 3",
    expected: "Excluded INSUFFICIENT_CREDITS with off-peak advice",
    actual: `Code: ${ex?.code}, Hint: "${ex?.studentReason.substring(0, 35)}..."`,
    pass,
  });
}

// 4. trainingOk false on the 3D printer. Expect excluded TRAINING_MISSING before scoring.
{
  const input: AllocateRequest = {
    slot: printerSlot,
    mode: "new_requests",
    requests: [
      makeStudent("Student-Untrained", {
        constraints: {
          trainingOk: false,
          withinBookingLimit: true,
          resourceAvailable: true,
          noOverlap: true,
        },
      }),
    ],
  };
  const res = allocateRequests(input);
  const ex = res.excluded[0];
  const pass = ex?.code === "TRAINING_MISSING" && res.ranking.length === 0;
  results.push({
    num: 4,
    scenario: "Safety training unverified",
    inputSummary: "trainingOk = false",
    expected: "Excluded TRAINING_MISSING before scoring",
    actual: `Excluded before scoring with code: ${ex?.code}`,
    pass,
  });
}

// 5. withinBookingLimit false. Expect excluded LIMIT_REACHED explaining the limit.
{
  const input: AllocateRequest = {
    slot: printerSlot,
    mode: "new_requests",
    requests: [
      makeStudent("Student-Capped", {
        constraints: {
          trainingOk: true,
          withinBookingLimit: false,
          resourceAvailable: true,
          noOverlap: true,
        },
      }),
    ],
  };
  const res = allocateRequests(input);
  const ex = res.excluded[0];
  const pass =
    ex?.code === "LIMIT_REACHED" &&
    ex?.studentReason.includes(String(DEFAULT_POLICY.maxActiveBookings));
  results.push({
    num: 5,
    scenario: "Booking quota limit reached",
    inputSummary: "withinBookingLimit = false",
    expected: "Excluded LIMIT_REACHED citing policy limit",
    actual: `Code: ${ex?.code}, Explains limit of ${DEFAULT_POLICY.maxActiveBookings}`,
    pass,
  });
}

// 6. mode promotion: slot freed, 3 valid waitlisted requests. Expect top-ranked allocated, others re-ranked.
{
  const input: AllocateRequest = {
    slot: { ...printerSlot, capacity: 1 },
    mode: "promotion",
    requests: [
      makeStudent("Wait-1", { sessionsLast30d: 4, waitingHours: 10 }),
      makeStudent("Wait-2", { sessionsLast30d: 0, waitingHours: 12 }),
      makeStudent("Wait-3", { sessionsLast30d: 2, waitingHours: 11 }),
    ],
  };
  const res = allocateRequests(input);
  const pass =
    res.ranking[0]?.requestId === "Wait-2" &&
    res.ranking[0]?.decision === "allocated" &&
    res.ranking[1]?.waitlistPosition === 1 &&
    res.ranking[2]?.waitlistPosition === 2;
  results.push({
    num: 6,
    scenario: "Waitlist promotion on cancellation",
    inputSummary: "3 waitlisted candidates (Wait-1, Wait-2, Wait-3)",
    expected: "Wait-2 promoted to allocated, others re-ranked #1 and #2",
    actual: `${res.ranking[0]?.requestId} allocated, positions: ${res.ranking[1]?.requestId} (#${res.ranking[1]?.waitlistPosition}), ${res.ranking[2]?.requestId} (#${res.ranking[2]?.waitlistPosition})`,
    pass,
  });
}

// 7. Bundle where DSLR has no window. Expect partial plan with DSLR unmet and alternatives.
{
  const input: BundleRequest = {
    teamId: "Team-Robotics",
    creditsAvailable: 10,
    wantedResources: [
      {
        resourceId: "printer-3d",
        resourceName: "3D Printer",
        resourceType: "3d-printer",
        candidateWindows: [
          {
            slotId: "slot-p",
            startsAt: "2026-11-06T10:00:00Z",
            endsAt: "2026-11-06T12:00:00Z",
            creditCost: 0,
          },
        ],
      },
      {
        resourceId: "arduino-kit",
        resourceName: "Arduino Kit",
        resourceType: "electronics",
        candidateWindows: [
          {
            slotId: "slot-a",
            startsAt: "2026-11-06T10:00:00Z",
            endsAt: "2026-11-06T12:00:00Z",
            creditCost: 0,
          },
        ],
      },
      {
        resourceId: "dslr-cam",
        resourceName: "DSLR Camera",
        resourceType: "camera",
        candidateWindows: [],
      },
      {
        resourceId: "studio-space",
        resourceName: "Project Studio",
        resourceType: "studio",
        candidateWindows: [
          {
            slotId: "slot-s",
            startsAt: "2026-11-06T10:00:00Z",
            endsAt: "2026-11-06T12:00:00Z",
            creditCost: 1,
          },
        ],
      },
    ],
  };
  const res = planBundle(input);
  const pass =
    res.plan.length === 3 &&
    res.unmet.length === 1 &&
    res.unmet[0].resourceId === "dslr-cam";
  results.push({
    num: 7,
    scenario: "Multi-resource bundle with missing window",
    inputSummary: "4 resources requested, DSLR camera has 0 open windows",
    expected: "Partial plan of 3 resources, DSLR listed as unmet",
    actual: `Plan: ${res.plan.length} resources, Unmet: ${res.unmet[0]?.resourceName}`,
    pass,
  });
}

// 8. Two requests with identical scores. Expect tie-break used, seed returned, deterministic on second run.
{
  const input: AllocateRequest = {
    slot: printerSlot,
    mode: "new_requests",
    seed: "fixed-scenario-seed-123",
    requests: [
      makeStudent("Tied-1", {
        sessionsLast30d: 2,
        sessionsThisMonth: 2,
        waitingHours: 10,
        requestedAt: "2026-10-29T10:00:00Z",
      }),
      makeStudent("Tied-2", {
        sessionsLast30d: 2,
        sessionsThisMonth: 2,
        waitingHours: 10,
        requestedAt: "2026-10-29T10:00:00Z",
      }),
    ],
  };
  const r1 = allocateRequests(input);
  const r2 = allocateRequests(input);
  const pass =
    r1.tieBreak.used &&
    r1.tieBreak.seed === "fixed-scenario-seed-123" &&
    r1.ranking[0].requestId === r2.ranking[0].requestId;
  results.push({
    num: 8,
    scenario: "Identical scores tie-breaking",
    inputSummary: "Exact identical score components and timestamps",
    expected: "Tie-break used, seed returned, deterministic outcome",
    actual: `Tie-break used: ${r1.tieBreak.used}, Decided by: ${r1.tieBreak.decidedBy}, Deterministic: ${pass}`,
    pass,
  });
}

// 9. LLM failure fallback verification.
{
  const input: AllocateRequest = {
    slot: printerSlot,
    mode: "new_requests",
    requests: [
      makeStudent("Req-1", { sessionsLast30d: 5 }),
      makeStudent("Req-2", { sessionsLast30d: 1 }),
    ],
  };
  const res = allocateRequests(input, "fallback");
  const pass =
    res.audit.source === "fallback" &&
    res.ranking[0].requestId === "Req-2" &&
    res.ranking[0].decision === "allocated";
  results.push({
    num: 9,
    scenario: "Fallback mode resilience",
    inputSummary: "No LLM provider configured / fallback invocation",
    expected: "Source 'fallback', deterministic ranking intact",
    actual: `Source: ${res.audit.source}, Winner: ${res.ranking[0].requestId}`,
    pass,
  });
}

// 10. Deadline in 2 days vs no deadline, equal usage and waiting. Expect deadline request ranks higher.
{
  const input: AllocateRequest = {
    slot: printerSlot,
    mode: "new_requests",
    requests: [
      makeStudent("No-Deadline", {
        sessionsLast30d: 2,
        waitingHours: 6,
        deadlineDays: null,
      }),
      makeStudent("Urgent-Deadline", {
        sessionsLast30d: 2,
        waitingHours: 6,
        deadlineDays: 2,
      }),
    ],
  };
  const res = allocateRequests(input);
  const pass =
    res.ranking[0].requestId === "Urgent-Deadline" &&
    res.ranking[0].decision === "allocated";
  results.push({
    num: 10,
    scenario: "Academic urgency priority",
    inputSummary: "Deadline in 2 days vs null deadline, equal usage/wait",
    expected: "Urgent-Deadline ranks #1",
    actual: `${res.ranking[0].requestId} ranked #${res.ranking[0].rank}`,
    pass,
  });
}

// Format Markdown Table
let md = `# CampusShare AI/ML Engine - Verification Scenarios\n\n`;
md += `Executed at: ${new Date().toISOString()}\n\n`;
md += `| # | Scenario | Input Summary | Expected Result | Actual Result | Status |\n`;
md += `|---|----------|---------------|-----------------|---------------|--------|\n`;

for (const r of results) {
  const status = r.pass ? "PASS" : "FAIL";
  md += `| ${r.num} | ${r.scenario} | ${r.inputSummary} | ${r.expected} | ${r.actual} | **${status}** |\n`;
}

const outputPath = path.resolve(process.cwd(), "lib/ai/TESTING_NOTES.md");
fs.writeFileSync(outputPath, md);
console.log(`Generated TESTING_NOTES.md with ${results.length} scenarios.`);
