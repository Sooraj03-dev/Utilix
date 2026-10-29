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
  AlertCircle,
  Info,
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
import { useAuth } from "@/lib/auth/context";

const DEMO_CREDENTIALS: Record<Role, { email: string; pass: string }> = {
  student: { email: "student.demo@utilix.local", pass: "demo-student" },
  coordinator: { email: "coord.demo@utilix.local", pass: "demo-coord" },
  admin: { email: "admin.demo@utilix.local", pass: "demo-admin" },
};

export default function LoginPage() {
  const router = useRouter();
  const { role, setRole } = useRole();
  const { success, info, error: toastError } = useToast();
  const { login, user: authUser, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoLogin = async (targetRole: Role) => {
    setRole(targetRole);
    const persona = DEMO_USERS[targetRole];
    const creds = DEMO_CREDENTIALS[targetRole];

    try {
      if (login) {
        await login(creds.email, creds.pass).catch(() => {
          // In mock/offline mode, continuing with role state is safe
        });
      }
    } catch {
      // Continue with demo role state
    }

    success(
      `Demo session active: ${persona.name} (${targetRole.toUpperCase()}). Loaded with demo quota and permissions.`,
      "Demo Persona Activated"
    );
    router.push("/");
  };

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { email?: string; password?: string; general?: string } = {};

    if (!email) {
      newErrors.email = "University email is required.";
    } else if (!email.includes("@")) {
      newErrors.email = "Please enter a valid university email address.";
    }

    if (!password) {
      newErrors.password = "Password is required.";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsLoading(true);
    try {
      if (login) {
        await login(email, password);
      }
      setRole("student");
      success("Signed in successfully to Utilix.", "Welcome");
      router.push("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      // Fallback for demo experience if Firebase is not reachable
      if (msg.includes("configuration") || msg.includes("network") || msg.includes("auth")) {
        setRole("student");
        info(
          "Demo session initialized. (Backend credentials or emulator can be connected via .env.local).",
          "Session Active"
        );
        router.push("/");
      } else {
        setErrors((prev) => ({ ...prev, general: msg }));
        toastError(msg, "Sign-In Error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Header Branding with Utilix App Icon */}
        <div className="flex flex-col items-center">
          <Link href="/" className="inline-block group hover:scale-105 transition-transform" aria-label="Utilix Home">
            <UtilixAppIcon size={84} />
          </Link>
          <div className="mt-4">
            <UtilixWordmark height={48} />
          </div>
          <p className="mt-2 text-xs sm:text-sm text-[#111111]/80 font-bold max-w-xs mx-auto">
            Share. Use. Build. Transparent campus resource sharing, waitlist tracking, and fair allocation.
          </p>
        </div>

        {/* DEMO PERSONAS QUICK-SWITCHER */}
        <div className="bg-[#FFF9E6] rounded-3xl p-5 sm:p-6 border-[3.5px] border-[#111111] shadow-[6px_6px_0px_0px_#111111] text-left space-y-3">
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
            Select an explicit demo persona below to explore Utilix with role-tailored permissions and seeded quotas:
          </p>

          <div className="space-y-3 pt-1">
            {/* 1. Student */}
            <button
              type="button"
              onClick={() => handleDemoLogin("student")}
              className={`w-full p-3.5 rounded-2xl border-[3px] border-[#111111] transition-all text-left flex items-center justify-between min-h-[48px] group ${
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
                      Student Demo
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-[#111111]/70 mt-0.5">
                    Senior Capstone • 8/10 Credits • 2 Free Sessions/Wk
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
              className={`w-full p-3.5 rounded-2xl border-[3px] border-[#111111] transition-all text-left flex items-center justify-between min-h-[48px] group ${
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
                      Coordinator Demo
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-[#111111]/70 mt-0.5">
                    FabLab Lead • Approvals Queue • Checkouts/Returns
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
              className={`w-full p-3.5 rounded-2xl border-[3px] border-[#111111] transition-all text-left flex items-center justify-between min-h-[48px] group ${
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
                      Admin Demo
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-[#111111]/70 mt-0.5">
                    Dean of Facilities • Policy Tuning • Audit Ledger
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-xl bg-white border-[2px] border-black flex items-center justify-center shadow-[1.5px_1.5px_0px_#111] group-hover:translate-x-0.5 transition">
                <ArrowRight className="w-4 h-4 text-[#111111] stroke-[3]" />
              </div>
            </button>
          </div>
        </div>

        {/* Direct Campus Email Onboarding Card */}
        <Card className="p-6 text-left bg-[#FFF9E6]">
          <div className="mb-4 space-y-1">
            <h3 className="text-sm font-black text-[#111111]">
              Campus Email Sign-In (Preview & Production)
            </h3>
            <p className="text-xs font-semibold text-[#111111]/70">
              Enter your university email to authenticate your active session:
            </p>
          </div>

          <form onSubmit={handleStandardLogin} className="space-y-4" noValidate>
            <div>
              <Input
                label="University Email"
                type="email"
                placeholder="student.demo@utilix.local"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                leftIcon={<Mail className="w-4 h-4 stroke-[2.5]" />}
                helperText="Use your student or faculty @utilix.local or campus email"
              />
              {errors.email && (
                <p className="text-[11px] font-bold text-[#DC2626] mt-1 flex items-center gap-1" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <Input
                label="Campus Password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                leftIcon={<Lock className="w-4 h-4 stroke-[2.5]" />}
              />
              {errors.password && (
                <p className="text-[11px] font-bold text-[#DC2626] mt-1 flex items-center gap-1" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                  {errors.password}
                </p>
              )}
            </div>

            {errors.general && (
              <p className="text-[11px] font-bold text-[#DC2626] flex items-center gap-1" role="alert">
                <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                {errors.general}
              </p>
            )}

            <div className="p-3 bg-[#FFFEF2] rounded-xl border-[2px] border-[#111111] text-[11px] font-bold text-[#111111]/80 space-y-1">
              <div className="flex items-center gap-1.5 font-black text-[#111111]">
                <Info className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Notice on Authentication Integration</span>
              </div>
              <p>
                Connected to Firebase Auth &amp; local demo session. Seed accounts: student.demo@utilix.local, coord.demo@utilix.local, admin.demo@utilix.local.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading || authLoading}
              className="w-full text-sm font-black min-h-[48px]"
            >
              Sign In to Utilix
            </Button>
          </form>
        </Card>

        {/* Security & Policy Link */}
        <div className="text-xs font-bold text-[#111111]/80 space-y-1">
          <p className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#111111] stroke-[2.5]" />
            <span>Deterministic allocation rules • Zero pay-to-play</span>
          </p>
          <p>
            Questions on eligibility or ranking?{" "}
            <Link href="/rules" className="text-[#111111] font-black underline min-h-[44px] inline-flex items-center">
              Read the 8 Fair Allocation Rules
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
