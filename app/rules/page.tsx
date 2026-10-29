"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Scale,
  CheckCircle2,
  ArrowRight,
  Info,
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
  category: "Equity" | "Anti-Hoarding" | "Safety" | "Reputation";
  explanation: string;
  whyItMatters: string;
  formulaOrConstraint: string;
  studentImpact: string;
}

const ALLOCATION_RULES: AllocationRule[] = [
  {
    number: 1,
    title: "Curricular Milestone & Deadline Urgency",
    tagline: "Accredited deadlines take precedence over casual exploration.",
    category: "Equity",
    explanation:
      "When slots are contested, requests tied to imminent syllabus milestones (such as Capstone defenses, ABET accredited projects, or midterm submissions within 14 days) receive +35 base priority points.",
    whyItMatters:
      "Prevents students from failing graded graduation criteria while equipment sits idle or occupied by casual hobby projects.",
    formulaOrConstraint: "Score += 35 pts (if syllabus submission <= 14 days)",
    studentImpact: "Upload your course syllabus or project milestone once to auto-qualify.",
  },
  {
    number: 2,
    title: "Strict Anti-Hoarding & Single Active Slot Cap",
    tagline: "No single student may monopolize peak campus equipment.",
    category: "Anti-Hoarding",
    explanation:
      "A student or project team may hold at most ONE active peak-demand slot for any single machine category at a time. A second booking can only be initiated once the active slot is completed and checked in.",
    whyItMatters:
      "Stops aggressive automated scripts or individual students from booking out 3D printers for entire 72-hour blocks.",
    formulaOrConstraint: "ActiveSlots[machineCategory] <= 1 per student",
    studentImpact: "Fair rotational access. Finish your print, let a classmate use it, then re-queue.",
  },
  {
    number: 3,
    title: "Cross-Disciplinary Collaboration Multiplier",
    tagline: "Interdisciplinary teams receive a +15% algorithmic bonus.",
    category: "Equity",
    explanation:
      "Projects registered with verified teammates from 2 or more distinct faculties (e.g., Mechanical Engineering + Visual Arts, or Computer Science + Architecture) receive a +15% composite score multiplier.",
    whyItMatters:
      "Fosters real-world innovation by encouraging engineers, artists, and medical researchers to co-create using campus infrastructure.",
    formulaOrConstraint: "Score = Score * 1.15 (if departments >= 2)",
    studentImpact: "Tag a team member from another department on your reservation to unlock this bonus.",
  },
  {
    number: 4,
    title: "15-Minute Phantom Booking Auto-Reclamation",
    tagline: "No-shows release slots immediately to the waitlist.",
    category: "Anti-Hoarding",
    explanation:
      "If a student does not physically or digitally scan in at the workstation within 15 minutes of the slot start time, the reservation is revoked, 1 credit is forfeit, and the slot is instantly reassigned to Waitlist #1.",
    whyItMatters:
      "Eliminates ghost bookings where high-demand cameras or audio booths sit vacant because someone overslept.",
    formulaOrConstraint: "If checkInTime > startTime + 15min → Revoke & Notify Waitlist #1",
    studentImpact: "Scan the QR code at the lab door within 15 minutes to secure your slot.",
  },
  {
    number: 5,
    title: "Return Reliability & Care Trust Index",
    tagline: "Punctuality and cleanliness build higher platform trust.",
    category: "Reputation",
    explanation:
      "Every user maintains a Trust Score (0-100%). Returning tools on-time, undamaged, and cleaned grants +10 priority points. Late returns deduct 15 points and freeze peak reservations for 7 days upon 2 strikes.",
    whyItMatters:
      "Protecting shared campus assets ensures longevity and builds a self-policing, respectful student community.",
    formulaOrConstraint: "TrustScore = OnTimeReturns / TotalReturns (Tier 1: >=95% → +10 pts)",
    studentImpact: "Keep your trust score high to receive first-round automated approvals.",
  },
  {
    number: 6,
    title: "Weekly Renewable Fair Credits (Zero Pay-to-Win)",
    tagline: "Campus currency is equal for all. Real money cannot buy priority.",
    category: "Equity",
    explanation:
      "Every enrolled student automatically receives 7 non-transferable credits every Monday at 08:00 AM. Unused credits expire weekly to prevent banking monopolies. Baseline tools (hand tools, soldering) cost 0 credits.",
    whyItMatters:
      "Guarantees that wealthy students or funded research labs cannot financially crowd out undergraduates.",
    formulaOrConstraint: "Balance = 7 credits (reset every Monday 08:00 UTC)",
    studentImpact: "Use credits strategically for scarce gear like Cinema cameras and 5-axis routers.",
  },
  {
    number: 7,
    title: "Mandatory Safety Certification Gate",
    tagline: "Hazardous machinery requires verified lab credentials.",
    category: "Safety",
    explanation:
      "Equipment classified as hazardous (ShopBot CNC, Laser Cutters, High-Voltage Rigs) requires a linked Safety Level (L1, L2, L3) badge in the campus database before booking can proceed.",
    whyItMatters:
      "Prevents machine downtime, physical injury, and voided manufacturer warranties.",
    formulaOrConstraint: "User.certifications.includes(Resource.requiredCert) === true",
    studentImpact: "Complete the free 20-minute safety quiz in Canvas/Blackboard to unlock badges.",
  },
  {
    number: 8,
    title: "Transparent Decision Receipts & Audited Overrides",
    tagline: "Every allocation is explainable. Coordinators cannot silently favor.",
    category: "Equity",
    explanation:
      "Whenever two students request the same slot, the platform publishes a public plain-language Decision Receipt showing exact rule weights. Coordinators can override decisions only by submitting a public written justification.",
    whyItMatters:
      "Eliminates departmental nepotism and gives students full visibility into how their university operates.",
    formulaOrConstraint: "AuditLog.append({ reason, formulaWeights, coordinatorSignedOverride })",
    studentImpact: "Click 'Why this decision?' on any reservation to view the plain-language receipt.",
  },
];

export default function RulesPage() {
  const [activeTab, setActiveTab] = useState<string>("All");

  const categories = ["All", "Equity", "Anti-Hoarding", "Reputation", "Safety"];

  const filteredRules =
    activeTab === "All"
      ? ALLOCATION_RULES
      : ALLOCATION_RULES.filter((r) => r.category === activeTab);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16 space-y-16">
      {/* 1. HEADER (Brutalist Card) */}
      <div className="bg-[#FFF8E7] rounded-[36px] border-[4px] border-[#111111] p-8 sm:p-12 shadow-[8px_8px_0px_0px_#111111] text-center max-w-4xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFD60A] border-[2px] border-[#111111] shadow-[2px_2px_0px_#111] text-xs font-black text-[#111111] uppercase">
          <Scale className="w-4 h-4 stroke-[2.5]" />
          <span>The Utilix Constitution</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-[#111111] tracking-tight leading-tight">
          The 8 Fair Allocation Rules
        </h1>
        <p className="text-sm sm:text-lg font-bold text-[#111111]/85 leading-relaxed max-w-2xl mx-auto">
          Built into Utilix by student councils, lab coordinators, and academic deans to eliminate hoarding, abolish departmental silos, and guarantee transparent educational access.
        </p>
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
                  : "bg-[#FFF8E7] text-[#111111] shadow-[1.5px_1.5px_0px_#111] hover:bg-yellow-100/60"
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
          <Card key={rule.number} className="flex flex-col justify-between p-6 bg-[#FFF8E7]">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl bg-[#FFD60A] border-[2.5px] border-[#111111] shadow-[3px_3px_0px_#111] text-[#111111] font-black text-lg flex items-center justify-center">
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
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#FFFEF2] border-[1.5px] border-[#111111] shadow-[1.5px_1.5px_0px_#111] text-[#111111] font-mono">
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
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#111111]/70 font-mono font-bold text-[11px]">Algorithmic logic:</span>
                <code className="text-[#111111] bg-[#FFD60A] border-[1.5px] border-[#111111] px-2 py-0.5 rounded text-[11px] font-mono font-black">
                  {rule.formulaOrConstraint}
                </code>
              </div>
              <p className="text-[11px] text-[#111111] font-bold">
                👉 Student advice: {rule.studentImpact}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* 4. WORKED EXAMPLE: CLEAR STEP-BY-STEP CONFLICT RESOLUTION */}
      <section className="bg-[#FFF8E7] rounded-[36px] border-[4px] border-[#111111] p-6 sm:p-10 lg:p-12 shadow-[8px_8px_0px_0px_#111111] space-y-8">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4ADE80] text-[#111111] text-xs font-black border-[2px] border-[#111111] shadow-[2px_2px_0px_#111]">
            <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
            <span>Real-World Scenario</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
            Worked Example: 2 Students Competing for Slot 14:00 - 17:00
          </h2>
          <p className="text-sm font-bold text-[#111111]/85 leading-relaxed">
            Here is an authentic step-by-step mathematical demonstration of how Utilix resolves a conflict when two students request the same 3D printer at the same time.
          </p>
        </div>

        {/* Side-by-side comparison cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Candidate A (Approved) */}
          <div className="rounded-3xl border-[3.5px] border-[#111111] bg-[#22C55E]/15 p-5 sm:p-6 space-y-4 shadow-[5px_5px_0px_#111]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#111111] bg-[#22C55E] px-2 py-0.5 rounded border border-[#111111]">
                  Applicant A (Approved)
                </span>
                <h3 className="text-base sm:text-lg font-black text-[#111111] mt-1">Aarav Sharma & Maya Patel</h3>
              </div>
              <StatusChip status="confirmed" customLabel="Slot Awarded" />
            </div>

            <div className="text-xs space-y-2 text-[#111111] font-bold">
              <p>
                <strong>Department:</strong> Mechanical Engineering + Visual Arts (Team of 2)
              </p>
              <p>
                <strong>Project:</strong> Senior Capstone Robotics Enclosure (Due in 6 days)
              </p>
              <p>
                <strong>Trust Score:</strong> 100% (4 on-time returns, 0 strikes)
              </p>
              <p>
                <strong>Current Active Slots:</strong> 0
              </p>
            </div>

            {/* Score math */}
            <div className="p-4 bg-[#FFFEF2] rounded-2xl border-[2.5px] border-[#111111] shadow-[3px_3px_0px_#111] space-y-2">
              <span className="text-xs font-black text-[#111111] block uppercase tracking-wider">
                Score Computation:
              </span>
              <ul className="text-xs font-bold text-[#111111] space-y-1">
                <li>• Base Capstone Urgency (Rule 1): <strong>+35 pts</strong></li>
                <li>• Cross-Disciplinary Multiplier (Rule 3): <strong>+25 pts</strong></li>
                <li>• Trust Reputation (Rule 5): <strong>+20 pts</strong></li>
                <li>• Anti-Hoarding Slot Check (Rule 2): <strong>+8 pts</strong></li>
              </ul>
              <div className="pt-2 border-t-[2px] border-[#111111] flex items-center justify-between font-black text-xs text-[#111111]">
                <span>Total Fairness Priority:</span>
                <span className="text-sm font-mono bg-[#22C55E] px-2 py-0.5 rounded border border-[#111111]">
                  88 / 100 pts
                </span>
              </div>
            </div>
          </div>

          {/* Candidate B (Waitlist #1) */}
          <div className="rounded-3xl border-[3.5px] border-[#111111] bg-[#F59E0B]/15 p-5 sm:p-6 space-y-4 shadow-[5px_5px_0px_#111]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#111111] bg-[#F59E0B] px-2 py-0.5 rounded border border-[#111111]">
                  Applicant B (Waitlist #1)
                </span>
                <h3 className="text-base sm:text-lg font-black text-[#111111] mt-1">Julian Hayes</h3>
              </div>
              <StatusChip status="waitlisted" customLabel="Waitlist #1" />
            </div>

            <div className="text-xs space-y-2 text-[#111111] font-bold">
              <p>
                <strong>Department:</strong> Mechanical Engineering (Solo)
              </p>
              <p>
                <strong>Project:</strong> Drone Frame Exploration (Independent personal build)
              </p>
              <p>
                <strong>Trust Score:</strong> 92% (1 minor late return last month)
              </p>
              <p>
                <strong>Current Active Slots:</strong> 0
              </p>
            </div>

            {/* Score math */}
            <div className="p-4 bg-[#FFFEF2] rounded-2xl border-[2.5px] border-[#111111] shadow-[3px_3px_0px_#111] space-y-2">
              <span className="text-xs font-black text-[#111111] block uppercase tracking-wider">
                Score Computation:
              </span>
              <ul className="text-xs font-bold text-[#111111] space-y-1">
                <li>• Base Project Urgency (Rule 1): <strong>+15 pts</strong> (casual hobby)</li>
                <li>• Cross-Disciplinary Team (Rule 3): <strong>+0 pts</strong> (single major)</li>
                <li>• Trust Reputation (Rule 5): <strong>+10 pts</strong> (92% trust)</li>
                <li>• Anti-Hoarding Slot Check (Rule 2): <strong>+8 pts</strong></li>
              </ul>
              <div className="pt-2 border-t-[2px] border-[#111111] flex items-center justify-between font-black text-xs text-[#111111]">
                <span>Total Fairness Priority:</span>
                <span className="text-sm font-mono bg-[#F59E0B] px-2 py-0.5 rounded border border-[#111111]">
                  33 / 100 pts
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Conclusion Banner */}
        <div className="p-5 bg-[#FFD60A] rounded-3xl border-[3.5px] border-[#111111] shadow-[5px_5px_0px_#111] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-black text-[#111111]">
              The Outcome Under Rule 8 (Decision Receipt):
            </h4>
            <p className="text-xs text-[#111111] font-bold leading-relaxed">
              Applicant A receives the slot with a transparent explanation. Julian (Applicant B) is placed as #1 Waitlist, and under <strong>Rule 4</strong>, if Applicant A fails to scan in within 15 minutes, Julian is automatically texted the reclaimed slot!
            </p>
          </div>
          <Link href="/login" className="flex-shrink-0">
            <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="w-4 h-4 stroke-[3]" />}>
              Test with Demo Logins
            </Button>
          </Link>
        </div>
      </section>

      {/* 5. CALL TO ACTION */}
      <div className="text-center pt-4">
        <Link href="/">
          <Button variant="secondary" size="lg" className="font-black">
            ← Return to Utilix Hub
          </Button>
        </Link>
      </div>
    </div>
  );
}
