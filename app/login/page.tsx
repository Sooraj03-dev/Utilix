"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Mail,
  Lock,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import {
  Button,
  Card,
  Input,
  Avatar,
  UtilixAppIcon,
  UtilixWordmark,
} from "@/components";
import { useRole, DEMO_USERS } from "@/components/RoleContext";
import { useToast } from "@/components/ToastContext";
import { Role } from "@/components/types";

export default function LoginPage() {
  const router = useRouter();
  const { role, setRole } = useRole();
  const { success, info } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoLogin = (targetRole: Role) => {
    setRole(targetRole);
    const persona = DEMO_USERS[targetRole];
    success(
      `Logged in as ${persona.name} (${targetRole.toUpperCase()}) with active permissions.`,
      "Utilix Demo Activated"
    );
    router.push("/");
  };

  const handleStandardLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setRole("student");
      info("Authenticated via Campus SSO. Welcome to Utilix!", "SSO Login Successful");
      router.push("/");
    }, 600);
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Header Branding with Utilix App Icon */}
        <div className="flex flex-col items-center">
          <Link href="/" className="inline-block group hover:scale-105 transition-transform">
            <UtilixAppIcon size={84} />
          </Link>
          <div className="mt-4">
            <UtilixWordmark height={48} />
          </div>
          <p className="mt-2 text-xs sm:text-sm text-[#111111]/80 font-bold max-w-xs mx-auto">
            Share. Use. Build. Access shared equipment, monitor waitlists, and track fair allocations.
          </p>
        </div>

        {/* DEMO ACCOUNTS QUICK-SWITCHER (Neo-Brutalist Highlight Card) */}
        <div className="bg-[#FFF8E7] rounded-3xl p-5 sm:p-6 border-[3.5px] border-[#111111] shadow-[6px_6px_0px_0px_#111111] text-left space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-[#111111] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#111111] stroke-[2.5]" />
              One-Click Demo Personas
            </span>
            <span className="text-[10px] bg-[#FFD60A] border-[1.5px] border-[#111111] px-2 py-0.5 rounded-full text-[#111111] font-black shadow-[1px_1px_0px_#111]">
              Instant Access
            </span>
          </div>
          <p className="text-xs text-[#111111]/85 font-bold leading-relaxed">
            Click any demo profile below to instantly log in to Utilix with role-tailored permissions:
          </p>

          <div className="space-y-3 pt-1">
            {/* 1. Student */}
            <button
              type="button"
              onClick={() => handleDemoLogin("student")}
              className={`w-full p-3.5 rounded-2xl border-[3px] border-[#111111] transition-all text-left flex items-center justify-between min-h-[44px] group ${
                role === "student"
                  ? "bg-[#FFD60A] shadow-[4px_4px_0px_#111]"
                  : "bg-[#FFFEF2] shadow-[2.5px_2.5px_0px_#111] hover:bg-yellow-100/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar name="Aarav Sharma" role="student" size="md" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs sm:text-sm font-black text-[#111111]">
                      Aarav Sharma
                    </p>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#22C55E] border border-black text-[#111111] font-black">
                      Student
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-[#111111]/70 mt-0.5">
                    Senior Capstone • 7 Credits • 96% Trust
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-xl bg-white border-[2px] border-black flex items-center justify-center shadow-[1.5px_1.5px_0px_#111] group-hover:translate-x-0.5 transition">
                <ArrowRight className="w-4 h-4 text-[#111111] stroke-[3]" />
              </div>
            </button>

            {/* 2. Coordinator */}
            <button
              type="button"
              onClick={() => handleDemoLogin("coordinator")}
              className={`w-full p-3.5 rounded-2xl border-[3px] border-[#111111] transition-all text-left flex items-center justify-between min-h-[44px] group ${
                role === "coordinator"
                  ? "bg-[#FFD60A] shadow-[4px_4px_0px_#111]"
                  : "bg-[#FFFEF2] shadow-[2.5px_2.5px_0px_#111] hover:bg-yellow-100/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar name="Dr. Sarah Lin" role="coordinator" size="md" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs sm:text-sm font-black text-[#111111]">
                      Dr. Sarah Lin
                    </p>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#38BDF8] border border-black text-[#111111] font-black">
                      Coordinator
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-[#111111]/70 mt-0.5">
                    FabLab Lead • Review Queue • Approvals
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-xl bg-white border-[2px] border-black flex items-center justify-center shadow-[1.5px_1.5px_0px_#111] group-hover:translate-x-0.5 transition">
                <ArrowRight className="w-4 h-4 text-[#111111] stroke-[3]" />
              </div>
            </button>

            {/* 3. Admin */}
            <button
              type="button"
              onClick={() => handleDemoLogin("admin")}
              className={`w-full p-3.5 rounded-2xl border-[3px] border-[#111111] transition-all text-left flex items-center justify-between min-h-[44px] group ${
                role === "admin"
                  ? "bg-[#FFD60A] shadow-[4px_4px_0px_#111]"
                  : "bg-[#FFFEF2] shadow-[2.5px_2.5px_0px_#111] hover:bg-yellow-100/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar name="Marcus Vance" role="admin" size="md" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs sm:text-sm font-black text-[#111111]">
                      Marcus Vance
                    </p>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#C084FC] border border-black text-[#111111] font-black">
                      Admin
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-[#111111]/70 mt-0.5">
                    Dean of Facilities • Quota Config • Audit
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-xl bg-white border-[2px] border-black flex items-center justify-center shadow-[1.5px_1.5px_0px_#111] group-hover:translate-x-0.5 transition">
                <ArrowRight className="w-4 h-4 text-[#111111] stroke-[3]" />
              </div>
            </button>
          </div>
        </div>

        {/* Traditional University SSO Form */}
        <Card className="p-6 text-left bg-[#FFF8E7]">
          <div className="mb-4">
            <h3 className="text-sm font-black text-[#111111]">
              Utilix Single Sign-On (SSO)
            </h3>
            <p className="text-xs font-semibold text-[#111111]/70 mt-0.5">
              Enter your official @campus.edu credentials
            </p>
          </div>

          <form onSubmit={handleStandardLogin} className="space-y-4">
            <Input
              label="University Email"
              type="email"
              placeholder="student@campus.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4 stroke-[2.5]" />}
              helperText="Enrolled university student or faculty email"
            />

            <Input
              label="Campus Password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4 stroke-[2.5]" />}
            />

            <div className="flex items-center justify-between text-xs pt-1 font-bold">
              <label className="flex items-center gap-2 text-[#111111] cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-[2px] border-black accent-black w-4 h-4"
                />
                <span>Remember on this device</span>
              </label>
              <a href="#" className="text-[#111111] hover:underline font-black">
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full text-sm font-black"
            >
              Sign In to Utilix
            </Button>
          </form>
        </Card>

        {/* Security & Zero Cost Disclaimer */}
        <div className="text-xs font-bold text-[#111111]/80 space-y-1">
          <p className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#111111] stroke-[2.5]" />
            <span>256-bit encrypted authentication • Zero out-of-pocket costs</span>
          </p>
          <p>
            Need help?{" "}
            <Link href="/rules" className="text-[#111111] font-black underline">
              Read the 8 Fair Allocation Rules
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
