"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Scale,
  CheckCircle2,
  ArrowRight,
  Info,
  Cpu,
  Clock,
  Sparkles,
  Users,
  AlertTriangle,
  FileText,
  Lock,
} from "lucide-react";
import {
  Card,
  Button,
  StatusChip,
} from "@/components";

interface AllocationRule {
  number: number;
  title: string;
  tagline: string;
  category: "Hard Gate" | "Credit Economy" | "Scoring" | "Governance";
  explanation: string;
  whyItMatters: string;
  formulaOrConstraint: string;
  studentImpact: string;
  enforcementTier: "Deterministic Code" | "Scoring Formula" | "Policy Ledger" | "Audit Ledger";
}

const ALLOCATION_RULES: AllocationRule[] = [
  {
    number: 1,
    title: "Hard Eligibility & Safety Gate",
    tagline: "Binary code-enforced checks that can never be bypassed by credits or scores.",
    category: "Hard Gate",
    explanation:
      "Before any request is scored or queued, six deterministic constraints must pass: active enrolled account, verified safety certifications for hazardous machines, confirmed equipment availability, no scheduled maintenance blocks, maximum 3 active concurrent bookings per student, session duration within allowed bounds (1–4 hrs), and zero overlapping bookings on the student's schedule.",
    whyItMatters:
      "Protects laboratory safety, prevents operator injury, and eliminates physical double-booking collisions entirely.",
    formulaOrConstraint: "eligible = activeAcct && certsVerified && !maintenance && activeBookings < 3 && !slotOverlap",
    studentImpact: "Complete your free 15-minute lab safety quiz to unlock heavy machinery like CNC mills and laser cutters.",
    enforcementTier: "Deterministic Code",
  },
  {
    number: 2,
    title: "Weekly Free Baseline Allowance",
    tagline: "Guaranteed access for every student. Zero pay-to-play on campus.",
    category: "Credit Economy",
    explanation:
      "Every active enrolled student receives 2 free off-peak sessions per week (costing 0 credits). Off-peak hours include weekday mornings (08:00–12:00) and weekends. Baseline sessions reset every Monday at 00:00 UTC and do not roll over, ensuring steady utilization.",
    whyItMatters:
      "Guarantees that every student, regardless of credit balance or department funding, has guaranteed weekly access to tools.",
    formulaOrConstraint: "weeklyFreeRemaining = 2 - freeSessionsUsedThisWeek (Resets Mon 00:00 UTC)",
    studentImpact: "Book off-peak morning or weekend sessions to complete assignments without consuming your monthly credits.",
    enforcementTier: "Policy Ledger",
  },
  {
    number: 3,
    title: "Credit Economy & Transparent Deductions",
    tagline: "10 credits monthly. Strict refund rules and no-show accountability.",
    category: "Credit Economy",
    explanation:
      "Students receive 10 non-transferable credits on the 1st of each month. Standard slots deduct 1–3 credits based on equipment scarcity and peak demand. Full credit refunds are automatically processed if a cancellation occurs at least 24 hours in advance. Unused bookings without a check-in within 15 minutes forfeit 1 credit.",
    whyItMatters:
      "Prevents resource hoarding and frivolous phantom reservations while ensuring fair rotational opportunity for all peers.",
    formulaOrConstraint: "cost: 1-3 credits/slot; refund: 100% if Δt >= 24h; no-show: 1 credit forfeit + instant release",
    studentImpact: "Plan peak sessions strategically. Always cancel 24h early if your project schedule shifts.",
    enforcementTier: "Policy Ledger",
  },
  {
    number: 4,
    title: "Deterministic 4-Factor Competition Ranking",
    tagline: "Objective mathematical ranking when multiple valid requests contest the same slot.",
    category: "Scoring",
    explanation:
      "When more than one eligible student requests the same slot, Utilix ranks requests deterministically using four weighted factors: Usage Fairness (35%), Waiting Time (25%), Academic Need (20%), and Interdisciplinary Collaboration (20%). Academic need specifically boosts submissions tied to accredited course milestones within a 7-day deadline window.",
    whyItMatters:
      "Eliminates subjective favoritism and nepotism. The student with greater educational urgency and lower prior usage gets the slot.",
    formulaOrConstraint: "Score = 0.35·S_usage + 0.25·S_wait + 0.20·S_need(<=7d) + 0.20·S_diversity",
    studentImpact: "Declare course project deadlines within 7 days and team with peers across departments for maximum score.",
    enforcementTier: "Scoring Formula",
  },
  {
    number: 5,
    title: "Strict 3-Tier Tie-Breaking Hierarchy",
    tagline: "Deterministic mathematical tiebreaks. Zero opaque coin flips.",
    category: "Scoring",
    explanation:
      "If two or more competing requests achieve the exact same composite score, ties are broken in an unvarying three-tier sequence: (1) Fewest total booked sessions in the current calendar month; (2) Earliest request submission timestamp; (3) Deterministic seeded cryptographic lottery based on SHA-256 hash of request IDs and slot timestamp.",
    whyItMatters:
      "Guarantees that every tiebreak is 100% reproducible, verifiable by students, and free from administrative tampering.",
    formulaOrConstraint: "Tiebreak: fewest_sessions_month -> earliest_requested_at -> seeded_lottery(reqA, reqB, slotTime)",
    studentImpact: "If you have used fewer resources this month, you will always win a tie against higher-frequency users.",
    enforcementTier: "Scoring Formula",
  },
  {
    number: 6,
    title: "Automated Waitlisting & Instant Promotion",
    tagline: "Losing requests are queued and automatically promoted upon cancellation.",
    category: "Governance",
    explanation:
      "Applicants who do not win the primary allocation are automatically placed on an ordered waitlist based on their composite score. If the awarded student cancels their booking or fails to scan in within 15 minutes of slot start, the #1 waitlisted student is immediately and automatically promoted.",
    whyItMatters:
      "Maximizes campus asset utilization by eliminating idle equipment gaps caused by last-minute schedule changes.",
    formulaOrConstraint: "on_cancel(slot) -> promote(waitlist.head()) && notify_student(SMS/Push)",
    studentImpact: "Remain on the waitlist! Over 30% of waitlisted students gain promoted access prior to slot commencement.",
    enforcementTier: "Deterministic Code",
  },
  {
    number: 7,
    title: "Restricted Resources & Coordinator Approvals",
    tagline: "Specialized and high-cost facilities require safety sign-off before allocation.",
    category: "Hard Gate",
    explanation:
      "Designated restricted resources (such as 5-axis CNC mills, cleanroom photolithography, and broadcast studios) require manual coordinator approval even after passing automated eligibility. These requests enter a 'pending_approval' state with an automated 24-hour review SLA.",
    whyItMatters:
      "Ensures that delicate, multimillion-dollar campus apparatuses are operated under qualified faculty supervision.",
    formulaOrConstraint: "if (resource.isRestricted) status = 'pending_approval' until coordinator.signedReview()",
    studentImpact: "Submit project briefs 48 hours early for restricted gear to give faculty lab coordinators review time.",
    enforcementTier: "Deterministic Code",
  },
  {
    number: 8,
    title: "Audit Receipts, Explainable AI & Fallback",
    tagline: "Every allocation publishes an audit record. AI explains, but never overrides code.",
    category: "Governance",
    explanation:
      "Every allocation generates an immutable audit record containing rule version, normalized score components, tiebreak seeds, and decision rationales. An AI explanation engine converts raw metrics into plain English. If the AI service is unreachable or errors, the platform immediately defaults to deterministic rule-based receipts.",
    whyItMatters:
      "Full algorithmic transparency with zero risk of downtime. Deterministic code remains the ultimate source of truth.",
    formulaOrConstraint: "decisionReceipt = { ruleVersion: '2.1', scores, tiebreakSeed, source: aiOnline ? 'ai' : 'fallback' }",
    studentImpact: "Click 'Why this decision?' on any reservation to view the mathematical breakdown and explanation.",
    enforcementTier: "Audit Ledger",
  },
];

export default function RulesPage() {
  const [activeTab, setActiveTab] = useState<string>("All");

  const categories = ["All", "Hard Gate", "Credit Economy", "Scoring", "Governance"];

  const filteredRules =
    activeTab === "All"
      ? ALLOCATION_RULES
      : ALLOCATION_RULES.filter((r) => r.category === activeTab);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16 space-y-16">
      {/* 1. HERO HEADER */}
      <div className="bg-[#FFF9E6] rounded-[36px] border-[3.5px] border-[#111111] p-8 sm:p-12 shadow-[8px_8px_0px_0px_#111111] text-center max-w-4xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFD60A] border-[2px] border-[#111111] shadow-[2px_2px_0px_#111] text-xs font-black text-[#111111] uppercase">
          <Scale className="w-4 h-4 stroke-[2.5]" />
          <span>The Utilix Allocation Constitution</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-[#111111] tracking-tight leading-tight">
          The 8 Fair Allocation Rules
        </h1>
        <p className="text-sm sm:text-lg font-bold text-[#111111]/85 leading-relaxed max-w-2xl mx-auto">
          Built into Utilix by academic deans, student councils, and lab coordinators to eliminate hoarding, abolish departmental silos, and guarantee transparent educational access.
        </p>

        {/* 3 Pillars Overview Banner */}
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <div className="p-3 bg-[#FFFEF2] rounded-2xl border-[2px] border-[#111111] shadow-[2px_2px_0px_#111]">
            <div className="flex items-center gap-1.5 font-black text-xs text-[#111111]">
              <Lock className="w-3.5 h-3.5 text-[#DC2626] stroke-[2.5]" />
              <span>1. Hard Constraints</span>
            </div>
            <p className="text-[11px] font-bold text-[#111111]/70 mt-1">
              Deterministic code gates that can NEVER be overridden.
            </p>
          </div>
          <div className="p-3 bg-[#FFFEF2] rounded-2xl border-[2px] border-[#111111] shadow-[2px_2px_0px_#111]">
            <div className="flex items-center gap-1.5 font-black text-xs text-[#111111]">
              <Scale className="w-3.5 h-3.5 text-[#2563EB] stroke-[2.5]" />
              <span>2. Fair 4-Factor Scoring</span>
            </div>
            <p className="text-[11px] font-bold text-[#111111]/70 mt-1">
              Usage (35%), Wait (25%), Need (20%), Diversity (20%).
            </p>
          </div>
          <div className="p-3 bg-[#FFFEF2] rounded-2xl border-[2px] border-[#111111] shadow-[2px_2px_0px_#111]">
            <div className="flex items-center gap-1.5 font-black text-xs text-[#111111]">
              <Cpu className="w-3.5 h-3.5 text-[#9333EA] stroke-[2.5]" />
              <span>3. AI + Deterministic Fallback</span>
            </div>
            <p className="text-[11px] font-bold text-[#111111]/70 mt-1">
              AI explains decisions; fallback guarantees 100% uptime.
            </p>
          </div>
        </div>
      </div>

      {/* 2. CATEGORY TABS */}
      <div className="flex items-center justify-center gap-2.5 overflow-x-auto pb-2 text-xs">
        {categories.map((cat) => {
          const isSelected = activeTab === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveTab(cat)}
              className={`px-4 py-2.5 rounded-2xl font-black transition-all min-h-[44px] flex items-center gap-2 border-[2.5px] border-[#111111] focus:outline-none focus:ring-2 focus:ring-black ${
                isSelected
                  ? "bg-[#FFD60A] text-[#111111] shadow-[3px_3px_0px_#111]"
                  : "bg-[#FFF9E6] text-[#111111] shadow-[1.5px_1.5px_0px_#111] hover:bg-yellow-100/60"
              }`}
            >
              <span>{cat} Rules</span>
            </button>
          );
        })}
      </div>

      {/* 3. RULES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredRules.map((rule) => (
          <Card key={rule.number} className="flex flex-col justify-between p-6 bg-[#FFF9E6]">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl bg-[#FFD60A] border-[2.5px] border-[#111111] shadow-[3px_3px_0px_#111] text-[#111111] font-black text-lg flex items-center justify-center flex-shrink-0">
                    #{rule.number}
                  </span>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-[#111111] leading-snug">
                      {rule.title}
                    </h3>
                    <p className="text-xs font-black text-[#111111]/75 mt-0.5">
                      {rule.tagline}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#FFFEF2] border-[1.5px] border-[#111111] shadow-[1.5px_1.5px_0px_#111] text-[#111111] font-mono flex-shrink-0">
                  {rule.category}
                </span>
              </div>

              <div className="mt-5 space-y-3 text-xs sm:text-sm text-[#111111] leading-relaxed font-semibold">
                <p>{rule.explanation}</p>
                <div className="p-3.5 bg-[#FFFEF2] rounded-2xl border-[2px] border-[#111111] shadow-[2px_2px_0px_#111] space-y-1.5">
                  <p className="text-xs font-black text-[#111111] flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 stroke-[2.5]" />
                    Why this rule matters:
                  </p>
                  <p className="text-xs text-[#111111]/80 font-medium">{rule.whyItMatters}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t-[2.5px] border-[#111111] flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[#111111]/70 font-mono font-bold text-[11px]">Enforcement rule:</span>
                <code className="text-[#111111] bg-[#FFD60A] border-[1.5px] border-[#111111] px-2 py-0.5 rounded text-[11px] font-mono font-black break-all">
                  {rule.formulaOrConstraint}
                </code>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-[#111111] font-bold">👉 Student advice: {rule.studentImpact}</span>
                <span className="text-[10px] font-mono bg-[#E0E7FF] text-[#3730A3] border border-[#111111] px-1.5 py-0.2 rounded font-black">
                  {rule.enforcementTier}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 4. WORKED EXAMPLE: 2 REAL STUDENTS COMPETING FOR 3D PRINTER */}
      <section className="bg-[#FFF9E6] rounded-[36px] border-[3.5px] border-[#111111] p-6 sm:p-10 lg:p-12 shadow-[8px_8px_0px_0px_#111111] space-y-8">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4ADE80] text-[#111111] text-xs font-black border-[2px] border-[#111111] shadow-[2px_2px_0px_#111]">
            <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
            <span>Worked Mathematical Demonstration</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
            Step-by-Step Conflict Resolution: 2 Students for 1 Slot
          </h2>
          <p className="text-sm font-bold text-[#111111]/85 leading-relaxed">
            Here is the exact mathematical execution of how Utilix evaluates two valid, competing requests for the Bambu Lab X1-Carbon 3D Printer (Friday 14:00 – 17:00).
          </p>
        </div>

        {/* Side-by-side comparison cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Candidate A (Approved) */}
          <div className="rounded-3xl border-[3.5px] border-[#111111] bg-[#22C55E]/15 p-5 sm:p-6 space-y-4 shadow-[5px_5px_0px_#111]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#111111] bg-[#22C55E] px-2 py-0.5 rounded border border-[#111111]">
                  Applicant A (Awarded Slot)
                </span>
                <h3 className="text-base sm:text-lg font-black text-[#111111] mt-1">Aarav Sharma & Maya Lin</h3>
              </div>
              <StatusChip status="allocated" customLabel="Slot Awarded" />
            </div>

            <div className="text-xs space-y-1.5 text-[#111111] font-bold">
              <p>
                <strong>Team:</strong> Mechanical Engineering + Visual Arts (2 departments)
              </p>
              <p>
                <strong>Project:</strong> Senior Capstone Robotics Shell (Course deadline in 4 days)
              </p>
              <p>
                <strong>Monthly Usage:</strong> 2.5 hours used this month (High fairness score)
              </p>
              <p>
                <strong>Waiting Time:</strong> Requested 36 hours in advance
              </p>
            </div>

            {/* Score math */}
            <div className="p-4 bg-[#FFFEF2] rounded-2xl border-[2.5px] border-[#111111] shadow-[3px_3px_0px_#111] space-y-2">
              <span className="text-xs font-black text-[#111111] block uppercase tracking-wider">
                Formula Computation (Weights: 0.35, 0.25, 0.20, 0.20):
              </span>
              <ul className="text-xs font-bold text-[#111111] space-y-1 font-mono">
                <li>• Usage Fairness (0.35 × 0.88): <strong>+0.308</strong></li>
                <li>• Waiting Time   (0.25 × 0.80): <strong>+0.200</strong></li>
                <li>• Academic Need  (0.20 × 0.95): <strong>+0.190</strong> (due in 4d &lt; 7d)</li>
                <li>• Interdisciplinary (0.20 × 1.00): <strong>+0.200</strong> (2 faculties)</li>
              </ul>
              <div className="pt-2 border-t-[2px] border-[#111111] flex items-center justify-between font-black text-xs text-[#111111]">
                <span>Composite Priority Score:</span>
                <span className="text-sm font-mono bg-[#22C55E] px-2 py-0.5 rounded border border-[#111111]">
                  0.898 / 1.000 (89.8 pts)
                </span>
              </div>
            </div>
          </div>

          {/* Candidate B (Waitlist #1) */}
          <div className="rounded-3xl border-[3.5px] border-[#111111] bg-[#F59E0B]/15 p-5 sm:p-6 space-y-4 shadow-[5px_5px_0px_#111]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#111111] bg-[#F59E0B] px-2 py-0.5 rounded border border-[#111111]">
                  Applicant B (Waitlist Position #1)
                </span>
                <h3 className="text-base sm:text-lg font-black text-[#111111] mt-1">Julian Hayes</h3>
              </div>
              <StatusChip status="waitlisted" customLabel="Waitlist #1" />
            </div>

            <div className="text-xs space-y-1.5 text-[#111111] font-bold">
              <p>
                <strong>Team:</strong> Computer Science (Solo request)
              </p>
              <p>
                <strong>Project:</strong> Personal Drone Frame Prototype (No accredited deadline)
              </p>
              <p>
                <strong>Monthly Usage:</strong> 12.0 hours used this month (Lower fairness score)
              </p>
              <p>
                <strong>Waiting Time:</strong> Requested 8 hours in advance
              </p>
            </div>

            {/* Score math */}
            <div className="p-4 bg-[#FFFEF2] rounded-2xl border-[2.5px] border-[#111111] shadow-[3px_3px_0px_#111] space-y-2">
              <span className="text-xs font-black text-[#111111] block uppercase tracking-wider">
                Formula Computation (Weights: 0.35, 0.25, 0.20, 0.20):
              </span>
              <ul className="text-xs font-bold text-[#111111] space-y-1 font-mono">
                <li>• Usage Fairness (0.35 × 0.40): <strong>+0.140</strong></li>
                <li>• Waiting Time   (0.25 × 0.35): <strong>+0.088</strong></li>
                <li>• Academic Need  (0.20 × 0.20): <strong>+0.040</strong> (no verified syllabus)</li>
                <li>• Interdisciplinary (0.20 × 0.00): <strong>+0.000</strong> (single major)</li>
              </ul>
              <div className="pt-2 border-t-[2px] border-[#111111] flex items-center justify-between font-black text-xs text-[#111111]">
                <span>Composite Priority Score:</span>
                <span className="text-sm font-mono bg-[#F59E0B] px-2 py-0.5 rounded border border-[#111111]">
                  0.268 / 1.000 (26.8 pts)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Explainable AI Decision Receipt Demonstration */}
        <div className="p-5 bg-[#FFD60A] rounded-3xl border-[3.5px] border-[#111111] shadow-[5px_5px_0px_#111] space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#111111] stroke-[2.5]" />
              <h4 className="text-sm font-black text-[#111111]">
                Actual Decision Receipt Published to Both Students:
              </h4>
            </div>
            <span className="text-[10px] font-mono bg-black text-white px-2 py-0.5 rounded font-bold">
              Rule Engine v2.1 • Seed: #0a84e9
            </span>
          </div>
          <p className="text-xs text-[#111111] font-bold leading-relaxed bg-[#FFF9E6] p-3.5 rounded-2xl border-[2px] border-[#111111]">
            “Applicant A (Aarav & Maya) awarded slot. Factor breakdown: +30.8 pts (low historical usage), +19.0 pts (Capstone milestone due in 4 days), +20.0 pts (Mechanical Eng + Visual Arts cross-department team). Applicant B (Julian) placed at Waitlist #1. If Applicant A cancels or does not check in by 14:15, the slot immediately auto-promotes Julian.”
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-[11px] font-bold text-[#111111]">
              ⚡ Tested AI Fallback: If AI explanation service is offline, deterministic score receipts render automatically.
            </span>
            <Link href="/login">
              <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="w-4 h-4 stroke-[3]" />}>
                Test Demo Personas
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 5. ARCHITECTURAL TRANSPARENCY: CODE VS SCORING VS AI */}
      <section className="bg-[#FFF9E6] rounded-[36px] border-[3.5px] border-[#111111] p-6 sm:p-10 shadow-[8px_8px_0px_0px_#111111] space-y-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#E0E7FF] text-[#3730A3] text-xs font-black border border-[#111111]">
            <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Integrity Architecture</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#111111]">
            Clear Separation of Responsibilities in Utilix
          </h2>
          <p className="text-xs sm:text-sm font-bold text-[#111111]/75">
            How code, mathematics, and artificial intelligence interact without compromising fairness:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[#FFFEF2] rounded-2xl border-[2.5px] border-[#111111] shadow-[3px_3px_0px_#111] space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-[#DC2626]">
              <Lock className="w-4 h-4 stroke-[3]" />
              <span>1. Hard Constraints (Code)</span>
            </div>
            <p className="text-xs font-bold text-[#111111]/80 leading-relaxed">
              Enforced by strict database and backend code. Cannot be bypassed by credits, administrative favors, or prompt injection. A student lacking safety certification cannot book hazardous tools under any circumstances.
            </p>
          </div>

          <div className="p-4 bg-[#FFFEF2] rounded-2xl border-[2.5px] border-[#111111] shadow-[3px_3px_0px_#111] space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-[#2563EB]">
              <Scale className="w-4 h-4 stroke-[3]" />
              <span>2. Deterministic Scoring</span>
            </div>
            <p className="text-xs font-bold text-[#111111]/80 leading-relaxed">
              Calculated using transparent floating-point arithmetic. Tiebreaks evaluate fewest monthly sessions, then submission timestamp, then a reproducible hash seed. Zero stochastic randomness or black-box hidden factors.
            </p>
          </div>

          <div className="p-4 bg-[#FFFEF2] rounded-2xl border-[2.5px] border-[#111111] shadow-[3px_3px_0px_#111] space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-[#9333EA]">
              <Cpu className="w-4 h-4 stroke-[3]" />
              <span>3. AI Explanations & Fallback</span>
            </div>
            <p className="text-xs font-bold text-[#111111]/80 leading-relaxed">
              AI translates calculated allocation mathematics into human-friendly explanations. AI has ZERO scoring authority. If the AI service is unreachable, Utilix defaults to deterministic templates with zero downtime.
            </p>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION */}
      <div className="text-center pt-2">
        <Link href="/">
          <Button variant="secondary" size="lg" className="font-black">
            ← Return to Utilix Hub
          </Button>
        </Link>
      </div>
    </div>
  );
}
