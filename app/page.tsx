"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Coins,
  CheckCircle2,
  Clock,
  Layers,
  Boxes,
  Cpu,
  Camera,
  Mic,
  HelpCircle,
  Zap,
  Check,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  StatusChip,
  Badge,
  CreditPill,
  Modal,
  DecisionPanel,
  EmptyState,
  GeometricDeco,
  DecoPlus,
  DecoCircle,
  FloatingAddButton,
  UtilixAppIcon,
} from "@/components";
import { useRole } from "@/components/RoleContext";
import { useToast } from "@/components/ToastContext";
import { ResourceItem } from "@/components/types";

// Mock Featured Resources matching the interdisciplinary campus story
const FEATURED_RESOURCES: ResourceItem[] = [
  {
    id: "res-01",
    name: "Prusa XL 5-Toolhead 3D Printer",
    category: "3D Fabrication",
    department: "Makerspace & Mechanical Engg",
    location: "Engineering Hall B, Lab 104",
    accessType: "credits",
    creditCost: 2,
    status: "available",
    description:
      "Multi-material rapid prototyping with 360x360x360mm build volume. Ideal for functional mechanical assemblies.",
    specs: ["5 Extruders", "Soluble PVA Support", "Auto-mesh Bed Leveling"],
    imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
    leadTimeHours: 2,
    trainingPrerequisite: "3D Printing Safety L1",
    availableSlotsToday: 4,
    totalSlotsToday: 8,
    maxBookingHoursPerWeek: 6,
  },
  {
    id: "res-02",
    name: "IoT & Embedded Prototyping Bench",
    category: "Electronics & IoT",
    department: "Electrical & Computer Engg",
    location: "Turing Lab, Room 220",
    accessType: "free",
    creditCost: 0,
    status: "available",
    description:
      "Includes Rigol 4-channel oscilloscope, programmable bench PSU, soldering station, Arduino & ESP32 development kits.",
    specs: ["100MHz Scope", "ESD-safe Station", "SMD Rework Heat Gun"],
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
    leadTimeHours: 0,
    availableSlotsToday: 6,
    totalSlotsToday: 10,
    maxBookingHoursPerWeek: 12,
  },
  {
    id: "res-03",
    name: "Sony FX3 Full-Frame Cinema Kit",
    category: "Media & Studio",
    department: "School of Media & Journalism",
    location: "Creative Arts Center, Studio 3",
    accessType: "credits",
    creditCost: 3,
    status: "waitlisted",
    description:
      "4K 120p cinema-line camera with 24-70mm f/2.8 GM II lens, XLR handle audio unit, and carbon fiber video tripod.",
    specs: ["Dual Native ISO", "16-bit RAW HDMI", "Wireless Follow Focus"],
    imageUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80",
    leadTimeHours: 6,
    trainingPrerequisite: "Cine Gear Care Certification",
    availableSlotsToday: 1,
    totalSlotsToday: 4,
    maxBookingHoursPerWeek: 8,
  },
  {
    id: "res-04",
    name: "Acoustically Isolated Voice & Audio Booth",
    category: "Audio Booth",
    department: "Music & Digital Audio Arts",
    location: "Performing Arts Pavilion, B-12",
    accessType: "credits",
    creditCost: 1,
    status: "booked",
    description:
      "Double-walled WhisperRoom with Neumann TLM 103 microphone, Apollo Twin X interface, and Logic Pro / Pro Tools workstation.",
    specs: ["-45dB Isolation", "Neumann TLM 103", "PreSonus Monitors"],
    imageUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80",
    leadTimeHours: 4,
    availableSlotsToday: 0,
    totalSlotsToday: 6,
    maxBookingHoursPerWeek: 5,
  },
  {
    id: "res-05",
    name: "ShopBot Heavy-Duty CNC Mill",
    category: "Heavy Workshop",
    department: "Architecture & Spatial Design",
    location: "Fabrication Annex, Bay 2",
    accessType: "training_required",
    creditCost: 2,
    status: "maintenance",
    description:
      "Precision 4x8ft bed CNC router for timber, composites, and non-ferrous metals. Scheduled spindle calibration in progress.",
    specs: ["4x8 Foot Bed", "Vacuum Hold-down", "HSD 2.2kW Spindle"],
    imageUrl: "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80",
    leadTimeHours: 24,
    trainingPrerequisite: "Heavy Machinery Safety L3",
    availableSlotsToday: 0,
    totalSlotsToday: 4,
    maxBookingHoursPerWeek: 4,
  },
  {
    id: "res-06",
    name: "NVIDIA RTX 6000 Ada GPU Workstation",
    category: "Computing",
    department: "AI & Computational Sciences",
    location: "Cloud Cluster Node 04",
    accessType: "credits",
    creditCost: 2,
    status: "available",
    description:
      "Dedicated 48GB VRAM compute node for deep learning model fine-tuning, CAD simulation, and Blender photorealistic rendering.",
    specs: ["48GB VRAM", "128GB RAM", "10GbE Network Link"],
    imageUrl: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80",
    leadTimeHours: 1,
    availableSlotsToday: 5,
    totalSlotsToday: 8,
    maxBookingHoursPerWeek: 15,
  },
];

export default function LandingPage() {
  const { user, role, useCredit } = useRole();
  const { success, warning, error } = useToast();

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [projectJustification, setProjectJustification] = useState("");
  const [isInterdisciplinary, setIsInterdisciplinary] = useState(true);

  // Filter resources
  const filteredResources =
    selectedCategory === "All"
      ? FEATURED_RESOURCES
      : FEATURED_RESOURCES.filter((r) => r.category === selectedCategory);

  const categories = [
    "All",
    "3D Fabrication",
    "Electronics & IoT",
    "Media & Studio",
    "Audio Booth",
    "Heavy Workshop",
    "Computing",
  ];

  const handleOpenReserve = (resource: ResourceItem) => {
    setSelectedResource(resource);
    setIsReserveModalOpen(true);
  };

  const handleConfirmReservation = () => {
    if (!selectedResource) return;

    if (selectedResource.status === "maintenance" || selectedResource.status === "blocked") {
      error("This equipment is temporarily unavailable for reservations.", "Slot Unavailable");
      return;
    }

    const cost = selectedResource.creditCost || 0;
    if (cost > 0 && user.credits < cost && role === "student") {
      warning("You do not have enough credits. Please select a free baseline resource.", "Low Balance");
      return;
    }

    if (cost > 0 && role === "student") {
      useCredit(cost);
    }

    setIsReserveModalOpen(false);
    success(
      `Your request for ${selectedResource.name} was queued with an 88% priority score boost!`,
      "Request Logged in Utilix"
    );
  };

  return (
    <div className="space-y-16 sm:space-y-24 pb-20 pt-6">
      {/* 1. HERO SECTION (Neo-Brutalist Centerpiece with Utilix Brand) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Decorative corner accents matching reference */}
        <div className="hidden lg:block absolute -top-4 left-4 z-0">
          <DecoPlus color="#111111" className="scale-150" />
        </div>
        <div className="hidden lg:block absolute top-10 right-6 z-0">
          <GeometricDeco className="scale-125" />
        </div>

        {/* Hero Card Container */}
        <div className="rounded-[36px] border-[4px] border-[#111111] bg-[#FFF8E7] p-6 sm:p-12 lg:p-16 shadow-[8px_8px_0px_0px_#111111] relative overflow-hidden">
          {/* Subtle Grid Texture */}
          <div className="absolute inset-0 pattern-dots-cream pointer-events-none opacity-40" />

          <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
            {/* Top Brand Pill */}
            <div className="inline-flex items-center justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFD60A] border-[2.5px] border-[#111111] shadow-[3px_3px_0px_#111] text-xs font-black text-[#111111] uppercase tracking-wider">
                <Sparkles className="w-4 h-4 stroke-[2.5]" />
                <span>Utilix Resource Engine v2.4</span>
                <span className="w-2 h-2 rounded-full bg-[#111111]" />
                <span>Share. Use. Build.</span>
              </div>
            </div>

            {/* Core Hero Heading with Utilix Tagline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#111111] tracking-tight leading-[1.12]">
              One campus. Every resource.{" "}
              <span className="inline-block bg-[#FFD60A] border-[3px] border-[#111111] px-3 py-1 rounded-2xl shadow-[4px_4px_0px_#111] rotate-[-1deg] mt-1 sm:mt-0">
                Fair for everyone.
              </span>
            </h1>

            {/* Subtext */}
            <p className="text-base sm:text-xl text-[#111111]/85 font-bold leading-relaxed max-w-2xl mx-auto">
              Welcome to <strong>Utilix</strong> — the modern platform to discover, share, borrow, and utilize underutilized equipment, creative studios, and technical labs with transparent algorithmic fairness.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-3">
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  rightIcon={<ArrowRight className="w-5 h-5 stroke-[3]" />}
                  className="w-full sm:w-auto text-base"
                >
                  Try Demo Accounts
                </Button>
              </Link>
              <Link href="#resources" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto text-base">
                  Browse Equipment
                </Button>
              </Link>
              <Link href="/rules" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-base">
                  Read 8 Fair Rules
                </Button>
              </Link>
            </div>

            {/* Live Counters in Neo-Brutalist Block Cards */}
            <div className="pt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 border-t-[3px] border-[#111111] max-w-4xl mx-auto text-left">
              <div className="p-4 bg-[#FFFEF2] rounded-2xl border-[3px] border-[#111111] shadow-[4px_4px_0px_#111]">
                <p className="text-2xl sm:text-3xl font-black text-[#111111] tabular-nums">142+</p>
                <p className="text-xs font-black text-[#111111] mt-0.5">Shared Lab Assets</p>
                <p className="text-[11px] font-bold text-[#22C55E] mt-1">Across 7 Departments</p>
              </div>
              <div className="p-4 bg-[#FFFEF2] rounded-2xl border-[3px] border-[#111111] shadow-[4px_4px_0px_#111]">
                <p className="text-2xl sm:text-3xl font-black text-[#111111] tabular-nums">98.4%</p>
                <p className="text-xs font-black text-[#111111] mt-0.5">On-Time Returns</p>
                <p className="text-[11px] font-bold text-[#38BDF8] mt-1">Reliability Incentive</p>
              </div>
              <div className="p-4 bg-[#FFFEF2] rounded-2xl border-[3px] border-[#111111] shadow-[4px_4px_0px_#111]">
                <p className="text-2xl sm:text-3xl font-black text-[#111111] tabular-nums">0 hrs</p>
                <p className="text-xs font-black text-[#111111] mt-0.5">Phantom Hoarding</p>
                <p className="text-[11px] font-bold text-[#22C55E] mt-1">Auto-Released Slots</p>
              </div>
              <div className="p-4 bg-[#FFFEF2] rounded-2xl border-[3px] border-[#111111] shadow-[4px_4px_0px_#111]">
                <p className="text-2xl sm:text-3xl font-black text-[#111111] tabular-nums">$0.00</p>
                <p className="text-xs font-black text-[#111111] mt-0.5">Student Out-of-Pocket</p>
                <p className="text-[11px] font-bold text-[#C084FC] mt-1">100% Free Campus Pool</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE INTERDISCIPLINARY STORY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#FFF8E7] rounded-[36px] border-[4px] border-[#111111] p-6 sm:p-10 lg:p-12 shadow-[8px_8px_0px_0px_#111111] relative overflow-hidden">
          <div className="max-w-3xl space-y-4 relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider uppercase bg-[#FFD60A] text-[#111111] px-3.5 py-1 rounded-full border-[2px] border-[#111111] shadow-[2px_2px_0px_#111]">
                The Innovation Dilemma
              </span>
              <DecoCircle color="#38BDF8" />
              <DecoCircle color="#F43F5E" />
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-[#111111] tracking-tight leading-snug">
              What happens when an Engineer, a Designer, a Filmmaker, and an Audio Producer collaborate?
            </h2>
            <p className="text-sm sm:text-base text-[#111111]/85 font-bold leading-relaxed">
              Traditional universities trap gear in departmental silos. The Mechanical Engineering 3D printer sits locked for CS students. The Cinema Sony FX3 camera is barred for roboticists building computer vision documentaries.
            </p>
            <p className="text-sm sm:text-base text-[#111111] font-black">
              Utilix dismantles departmental walls. Under <span className="bg-[#FFD60A] border-[2px] border-[#111111] px-1.5 py-0.5 rounded-lg shadow-[2px_2px_0px_#111]">Rule 3 (Cross-Disciplinary Multiplier)</span>, teams combining diverse majors receive a guaranteed priority bump.
            </p>
          </div>

          {/* 4 Pillars Grid */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative z-10">
            {/* Pillar 1 */}
            <div className="bg-[#FFFEF2] p-5 rounded-3xl border-[3px] border-[#111111] shadow-[4px_4px_0px_#111] space-y-3 hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#4ADE80] border-[2.5px] border-[#111111] shadow-[2.5px_2.5px_0px_#111] flex items-center justify-center text-[#111111]">
                <Boxes className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="text-base font-black text-[#111111]">3D Fabrication</h3>
              <p className="text-xs font-bold text-[#111111]/80 leading-relaxed">
                Rapid structural enclosures & mechanical linkages for robotics prototypes.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-[#FFFEF2] p-5 rounded-3xl border-[3px] border-[#111111] shadow-[4px_4px_0px_#111] space-y-3 hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#38BDF8] border-[2.5px] border-[#111111] shadow-[2.5px_2.5px_0px_#111] flex items-center justify-center text-[#111111]">
                <Cpu className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="text-base font-black text-[#111111]">Arduino & IoT</h3>
              <p className="text-xs font-bold text-[#111111]/80 leading-relaxed">
                Sensor testing, motor drivers, and logic signal analyzers without waiting weeks.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="bg-[#FFFEF2] p-5 rounded-3xl border-[3px] border-[#111111] shadow-[4px_4px_0px_#111] space-y-3 hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#F43F5E] border-[2.5px] border-[#111111] shadow-[2.5px_2.5px_0px_#111] flex items-center justify-center text-white">
                <Camera className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="text-base font-black text-[#111111]">Cinema 4K Optics</h3>
              <p className="text-xs font-bold text-[#111111]/80 leading-relaxed">
                Pitch-deck videography and high-speed motion tracking cameras.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="bg-[#FFFEF2] p-5 rounded-3xl border-[3px] border-[#111111] shadow-[4px_4px_0px_#111] space-y-3 hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#FFD60A] border-[2.5px] border-[#111111] shadow-[2.5px_2.5px_0px_#111] flex items-center justify-center text-[#111111]">
                <Mic className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="text-base font-black text-[#111111]">Acoustic Booth</h3>
              <p className="text-xs font-bold text-[#111111]/80 leading-relaxed">
                Clean voiceovers, game sound design, and podcast interviews.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS IN 3 STEPS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-black uppercase tracking-wider text-[#111111] bg-[#FFD60A] border-[2px] border-[#111111] shadow-[2px_2px_0px_#111] px-3.5 py-1 rounded-full">
            Transparent Workflow
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-[#111111] tracking-tight">
            How Utilix Works in 3 Steps
          </h2>
          <p className="text-sm sm:text-base font-bold text-[#111111]/80">
            Share. Use. Build. No politics, no first-come bot-racing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Step 1 */}
          <Card className="p-6 relative overflow-hidden bg-[#FFF8E7]">
            <span className="text-6xl font-black text-[#111111]/15 absolute -right-2 -top-2 select-none font-mono">
              01
            </span>
            <div className="w-14 h-14 rounded-2xl bg-[#FFD60A] border-[3px] border-[#111111] shadow-[3px_3px_0px_#111] flex items-center justify-center mb-4 text-[#111111]">
              <Layers className="w-7 h-7 stroke-[2.5]" />
            </div>
            <h3 className="text-lg font-black text-[#111111]">1. Discover & Select Slot</h3>
            <p className="text-xs sm:text-sm font-semibold text-[#111111]/80 mt-2 leading-relaxed">
              Explore lab assets across all campuses. Choose between free baseline items or high-demand resources using your weekly credit allocation.
            </p>
            <div className="mt-5 pt-4 border-t-[2.5px] border-[#111111] text-xs font-black text-[#111111] flex items-center gap-1">
              <span>Touch targets & mobile-ready</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </div>
          </Card>

          {/* Step 2 */}
          <Card className="p-6 relative overflow-hidden bg-[#FFF8E7]">
            <span className="text-6xl font-black text-[#111111]/15 absolute -right-2 -top-2 select-none font-mono">
              02
            </span>
            <div className="w-14 h-14 rounded-2xl bg-[#38BDF8] border-[3px] border-[#111111] shadow-[3px_3px_0px_#111] flex items-center justify-center mb-4 text-[#111111]">
              <Zap className="w-7 h-7 stroke-[2.5]" />
            </div>
            <h3 className="text-lg font-black text-[#111111]">2. Algorithmic Match</h3>
            <p className="text-xs sm:text-sm font-semibold text-[#111111]/80 mt-2 leading-relaxed">
              When multiple students request the same slot, the engine evaluates academic deadlines, interdisciplinary teams, and return records.
            </p>
            <div className="mt-5 pt-4 border-t-[2.5px] border-[#111111] text-xs font-black text-[#111111] flex items-center gap-1">
              <span>Zero manual bias</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </div>
          </Card>

          {/* Step 3 */}
          <Card className="p-6 relative overflow-hidden bg-[#FFF8E7]">
            <span className="text-6xl font-black text-[#111111]/15 absolute -right-2 -top-2 select-none font-mono">
              03
            </span>
            <div className="w-14 h-14 rounded-2xl bg-[#4ADE80] border-[3px] border-[#111111] shadow-[3px_3px_0px_#111] flex items-center justify-center mb-4 text-[#111111]">
              <ShieldCheck className="w-7 h-7 stroke-[2.5]" />
            </div>
            <h3 className="text-lg font-black text-[#111111]">3. Plain Language Receipt</h3>
            <p className="text-xs sm:text-sm font-semibold text-[#111111]/80 mt-2 leading-relaxed">
              Every decision comes with our signature “Why this decision?” breakdown. No black box. You see exact rules and scores applied.
            </p>
            <div className="mt-5 pt-4 border-t-[2.5px] border-[#111111] text-xs font-black text-[#111111] flex items-center gap-1">
              <span>Auditable by anyone</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </div>
          </Card>
        </div>
      </section>

      {/* 4. HYBRID ACCESS EXPLAINER (FREE BASELINE + CREDITS) */}
      <section id="hybrid-model" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#FFF8E7] rounded-[36px] border-[4px] border-[#111111] p-6 sm:p-10 shadow-[8px_8px_0px_0px_#111111]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-5">
              <span className="text-xs font-black uppercase tracking-wider text-[#111111] bg-[#4ADE80] px-3.5 py-1 rounded-full border-[2px] border-[#111111] shadow-[2px_2px_0px_#111]">
                Hybrid Access Model
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-[#111111] tracking-tight leading-snug">
                Free baseline access for everyday labs. Credits for scarce, peak gear.
              </h2>
              <p className="text-sm font-bold text-[#111111]/85 leading-relaxed">
                We believe no student should be blocked from coursework because of a shortage or financial barrier. Utilix operates a dual-tier economy designed for maximum utilization and zero pay-to-win.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 p-4 bg-[#FFFEF2] rounded-2xl border-[3px] border-[#111111] shadow-[3px_3px_0px_#111]">
                  <CheckCircle2 className="w-6 h-6 text-[#22C55E] flex-shrink-0 mt-0.5 stroke-[2.5]" />
                  <div>
                    <h4 className="text-sm font-black text-[#111111]">
                      Tier 1: Free Baseline (Unlimited Free Hours)
                    </h4>
                    <p className="text-xs font-medium text-[#111111]/80 mt-0.5 leading-relaxed">
                      Soldering stations, standard hand tools, entry 3D printers, and general study booths cost 0 credits.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-[#FFFEF2] rounded-2xl border-[3px] border-[#111111] shadow-[3px_3px_0px_#111]">
                  <Coins className="w-6 h-6 text-[#F59E0B] flex-shrink-0 mt-0.5 stroke-[2.5]" />
                  <div>
                    <h4 className="text-sm font-black text-[#111111]">
                      Tier 2: High-Demand Shared Credits (Refreshed Weekly)
                    </h4>
                    <p className="text-xs font-medium text-[#111111]/80 mt-0.5 leading-relaxed">
                      Every student receives 7 credits each Monday. High-demand items (cinema cameras, heavy CNC, GPU clusters) cost 1–3 credits.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link href="/rules">
                  <Button variant="primary" size="md">
                    Explore Allocation Rules
                  </Button>
                </Link>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setIsDecisionModalOpen(true)}
                  leftIcon={<HelpCircle className="w-4 h-4 stroke-[3]" />}
                >
                  See Demo Decision Audit
                </Button>
              </div>
            </div>

            {/* Interactive Preview of Signature Decision Panel */}
            <div className="lg:pl-4">
              <DecisionPanel />
            </div>
          </div>
        </div>
      </section>

      {/* 5. FEATURED RESOURCES SECTION (with Filter + Search) */}
      <section id="resources" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-[#111111] bg-[#FFD60A] border-[2px] border-[#111111] shadow-[2px_2px_0px_#111] px-3 py-1 rounded-full">
              Utilix Equipment Catalog
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#111111] tracking-tight mt-2">
              Featured Shared Resources
            </h2>
            <p className="text-sm font-bold text-[#111111]/80 mt-1">
              Current equipment availability across engineering, media, arts, and computing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <CreditPill />
          </div>
        </div>

        {/* Category Filter Pills (Mobile scrollable) */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-3 text-xs scrollbar-none">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2.5 rounded-2xl font-black whitespace-nowrap transition-all min-h-[44px] flex items-center gap-2 border-[2.5px] border-[#111111] focus:outline-none focus:ring-2 focus:ring-black ${
                  isSelected
                    ? "bg-[#FFD60A] text-[#111111] shadow-[3px_3px_0px_#111]"
                    : "bg-[#FFFEF2] text-[#111111] shadow-[1.5px_1.5px_0px_#111] hover:bg-yellow-100/60"
                }`}
              >
                <span>{cat}</span>
              </button>
            );
          })}
        </div>

        {/* Resource Cards Grid */}
        {filteredResources.length === 0 ? (
          <EmptyState
            title="No resources found in this category"
            description="Try selecting a different category or clear filters to view all equipment."
            actionLabel="View All Resources"
            onAction={() => setSelectedCategory("All")}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((res) => (
              <Card key={res.id} hoverEffect className="flex flex-col justify-between overflow-hidden bg-[#FFF8E7]">
                <div>
                  {/* Card Visual Header with Thick Border */}
                  <div className="relative h-48 w-full bg-gray-100 overflow-hidden border-b-[3px] border-[#111111]">
                    <img
                      src={res.imageUrl}
                      alt={res.name}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <StatusChip status={res.status} size="sm" />
                    </div>
                    <div className="absolute top-3 right-3">
                      <Badge
                        variant={res.accessType}
                        cost={res.creditCost}
                        size="sm"
                      />
                    </div>
                  </div>

                  <CardHeader>
                    <div className="flex items-center justify-between text-[11px] text-[#111111]/70 font-black uppercase tracking-wider">
                      <span>{res.department}</span>
                      <span>{res.location}</span>
                    </div>
                    <CardTitle className="mt-1 text-lg sm:text-xl">{res.name}</CardTitle>
                    <CardDescription>{res.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    {/* Specs Pill tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {res.specs.map((spec, i) => (
                        <span
                          key={i}
                          className="text-[11px] font-mono font-bold bg-[#FFFEF2] text-[#111111] px-2.5 py-1 rounded-xl border-[1.5px] border-[#111111] shadow-[1px_1px_0px_#111]"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>

                    {/* Today's Availability indicator */}
                    <div className="p-3 bg-[#FFFEF2] rounded-2xl border-[2px] border-[#111111] shadow-[2px_2px_0px_#111] flex items-center justify-between text-xs font-black">
                      <span className="text-[#111111]/80 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 stroke-[2.5]" />
                        Today's Slots:
                      </span>
                      <span className="text-[#111111] bg-[#FFD60A] px-2 py-0.5 rounded-lg border-[1.5px] border-[#111111]">
                        {res.availableSlotsToday} of {res.totalSlotsToday} open
                      </span>
                    </div>

                    {res.trainingPrerequisite && (
                      <div className="text-[11px] font-bold text-[#111111] bg-[#C084FC]/30 p-2.5 rounded-xl border-[2px] border-[#111111] flex items-center gap-2">
                        <Info className="w-4 h-4 text-[#111111] flex-shrink-0 stroke-[2.5]" />
                        <span>Requires: {res.trainingPrerequisite}</span>
                      </div>
                    )}
                  </CardContent>
                </div>

                <CardFooter className="pt-3">
                  <div className="flex items-center gap-1 text-xs font-black text-[#111111]">
                    {res.creditCost === 0 ? (
                      <span className="text-[#22C55E] bg-[#22C55E]/20 px-2 py-1 rounded-lg border-[1.5px] border-[#111111]">
                        Free Baseline
                      </span>
                    ) : (
                      <span className="bg-[#FFD60A] px-2 py-1 rounded-lg border-[1.5px] border-[#111111]">
                        <strong>{res.creditCost}</strong> credits/slot
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={res.status === "available" ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => handleOpenReserve(res)}
                      disabled={res.status === "maintenance" || res.status === "blocked"}
                    >
                      {res.status === "available"
                        ? "Reserve Slot"
                        : res.status === "waitlisted"
                        ? "Join Waitlist"
                        : res.status === "booked"
                        ? "View Next Slot"
                        : "Unavailable"}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 6. CALL TO ACTION STRIP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-[36px] bg-[#FFF8E7] border-[4px] border-[#111111] p-8 sm:p-12 text-center space-y-6 shadow-[8px_8px_0px_0px_#111111] relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <h2 className="text-2xl sm:text-4xl font-black text-[#111111] tracking-tight">
              Ready to Share, Use, and Build?
            </h2>
            <p className="text-sm sm:text-base font-bold text-[#111111]/85 leading-relaxed">
              Switch seamlessly between Student, Coordinator, and Administrator demo accounts to test conflict resolution, slot reclamation, and cross-department bonus multipliers.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 relative z-10 pt-2">
            <Link href="/login">
              <Button variant="primary" size="lg" className="font-black text-base">
                Launch Role Demo Logins
              </Button>
            </Link>
            <Link href="/rules">
              <Button variant="outline" size="lg" className="font-black text-base">
                Understand the 8 Fair Rules
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FLOATING ACTION PLUS BUTTON */}
      <div className="fixed bottom-6 right-6 z-40 hidden sm:block">
        <FloatingAddButton
          label="Quick Book Asset"
          onClick={() => {
            const firstAvailable = FEATURED_RESOURCES.find((r) => r.status === "available");
            if (firstAvailable) handleOpenReserve(firstAvailable);
          }}
        />
      </div>

      {/* MODAL: Reservation Request with Fair Allocation Context */}
      <Modal
        isOpen={isReserveModalOpen}
        onClose={() => setIsReserveModalOpen(false)}
        title={selectedResource ? `Request: ${selectedResource.name}` : "Resource Reservation"}
        description="Your submission will be evaluated transparently according to Utilix allocation rules."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsReserveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmReservation}
              leftIcon={<Check className="w-4 h-4 stroke-[3]" />}
            >
              Submit Fair Request
            </Button>
          </>
        }
      >
        {selectedResource && (
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="p-4 bg-[#FFFEF2] rounded-2xl border-[3px] border-[#111111] shadow-[3px_3px_0px_#111] flex items-center justify-between">
              <div>
                <p className="font-black text-[#111111] text-base">{selectedResource.name}</p>
                <p className="text-[#111111]/70 font-bold text-xs">{selectedResource.location}</p>
              </div>
              <div className="text-right">
                <StatusChip status={selectedResource.status} size="sm" />
                <p className="text-xs font-black text-[#111111] bg-[#FFD60A] px-2 py-0.5 rounded-lg border-[1.5px] border-[#111111] mt-1.5 inline-block">
                  Cost: {selectedResource.creditCost} Credits
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-[#111111] mb-1.5">
                Project Classification & Milestones
              </label>
              <select className="w-full rounded-2xl border-[3px] border-[#111111] bg-[#FFFEF2] p-3 text-xs sm:text-sm font-bold text-[#111111] shadow-[3px_3px_0px_#111] focus:outline-none">
                <option>Accredited Senior Capstone (Deadline within 14 days)</option>
                <option>Interdisciplinary Cross-Faculty Project</option>
                <option>Standard Coursework Assignment</option>
                <option>Recognized Student Engineering Club</option>
                <option>Independent Research / Exploration</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase text-[#111111]">
                Project Justification (for Algorithmic Review)
              </label>
              <textarea
                rows={3}
                value={projectJustification}
                onChange={(e) => setProjectJustification(e.target.value)}
                placeholder="Explain the build purpose, materials, and why this specific hardware is needed..."
                className="w-full rounded-2xl border-[3px] border-[#111111] bg-[#FFFEF2] p-3 text-xs sm:text-sm font-semibold text-[#111111] shadow-[3px_3px_0px_#111] focus:outline-none"
              />
            </div>

            <div className="p-4 bg-[#FFFEF2] rounded-2xl border-[3px] border-[#111111] shadow-[3px_3px_0px_#111] flex items-start gap-3">
              <input
                type="checkbox"
                id="cross-dept"
                checked={isInterdisciplinary}
                onChange={(e) => setIsInterdisciplinary(e.target.checked)}
                className="mt-1 rounded border-[2px] border-black text-[#111111] focus:ring-black w-5 h-5 accent-black"
              />
              <label htmlFor="cross-dept" className="text-xs text-[#111111]">
                <strong className="block font-black text-sm">Interdisciplinary Team Membership</strong>
                Checking this triggers <span className="bg-[#FFD60A] px-1.5 py-0.5 rounded border border-black font-black">Rule 3 (+15% Multiplier)</span> when teaming with students from other academic departments.
              </label>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: Standalone Signature Decision Audit */}
      <Modal
        isOpen={isDecisionModalOpen}
        onClose={() => setIsDecisionModalOpen(false)}
        title="Algorithmic Allocation Audit Receipt"
        description="Complete mathematical transparent breakdown of a disputed booking request."
        footer={
          <Button variant="primary" onClick={() => setIsDecisionModalOpen(false)}>
            Close Audit Breakdown
          </Button>
        }
      >
        <DecisionPanel />
      </Modal>
    </div>
  );
}
