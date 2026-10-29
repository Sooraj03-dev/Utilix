"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Mail,
  Lock,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  UserPlus,
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
import { getFirebaseClientAuth, isFirebaseClientConfigured } from "@/lib/firebase/client";
import { signInWithEmailAndPassword } from "firebase/auth";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role, setRole } = useRole();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();

  const isVerified = searchParams.get("verified") === "true";
  const isReset = searchParams.get("reset") === "true";
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const handleDemoLogin = async (targetRole: Role) => {
    setRole(targetRole);
    const persona = DEMO_USERS[targetRole];

    // Map to realistic credentials
    const demoCredentials: Record<Role, { email: string; pass: string }> = {
      student: { email: "aarav.sharma@campus.edu", pass: "Password123!" },
      coordinator: { email: "meera.rao@campus.edu", pass: "Password123!" },
      admin: { email: "marcus.vance@campus.edu", pass: "Password123!" },
    };

    const cred = demoCredentials[targetRole];
    setEmail(cred.email);
    setPassword(cred.pass);

    // Call mock auth endpoint to set session cookie if supported
    try {
      await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cred.email, password: cred.pass }),
      });
    } catch {
      // ignore
    }

    toastSuccess(
      `Demo session active: ${persona.name} (${targetRole.toUpperCase()}). Loaded with quota and permissions.`,
      "Demo Persona Activated"
    );
    router.push("/");
  };

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { email?: string; password?: string; general?: string } = {};

    if (!email.trim()) {
      newErrors.email = "University email is required.";
    } else if (!email.includes("@")) {
      newErrors.email = "Please enter a valid university email address.";
    }

    if (!password) {
      newErrors.password = "Password is required.";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);

    try {
      // 1. Try real Firebase Client Auth if configured
      if (isFirebaseClientConfigured()) {
        const auth = getFirebaseClientAuth();
        if (auth) {
          try {
            const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
            const idToken = await userCredential.user.getIdToken(true);

            // Establish secure HTTP-only session cookie
            const sessionRes = await fetch("/api/auth/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken }),
            });

            if (sessionRes.ok) {
              toastSuccess("Signed in successfully to Utilix!", "Welcome Back");
              router.push("/");
              return;
            }
          } catch (firebaseErr: unknown) {
            const fbCode = (firebaseErr as { code?: string }).code;
            if (fbCode === "auth/invalid-credential" || fbCode === "auth/wrong-password" || fbCode === "auth/user-not-found") {
              // Try fallback mock auth before failing
            } else {
              console.warn("[Utilix Auth] Firebase client error, trying fallback:", firebaseErr);
            }
          }
        }
      }

      // 2. Try Mock Auth endpoint (supports local demo accounts)
      const mockRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (mockRes.ok) {
        const data = await mockRes.json();
        if (data.user?.role) {
          setRole(data.user.role as Role);
        }
        toastSuccess(`Signed in as ${data.user?.displayName || "User"}.`, "Authentication Complete");
        router.push("/");
        return;
      }

      // If both failed:
      setErrors({ general: "Invalid email or password. Please verify your credentials or register." });
      toastError("Invalid email or password.", "Sign In Failed");
    } catch (err) {
      console.error(err);
      setErrors({ general: "Could not connect to authentication service." });
      toastError("Could not reach authentication server.", "Connection Error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#FFFDF8]">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Header Branding */}
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

        {/* Success Banners from verification or reset */}
        {isVerified && (
          <div className="p-4 bg-emerald-50 border-[2px] border-emerald-500 rounded-2xl flex items-start gap-3 text-left shadow-[2px_2px_0px_#111]">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs font-bold text-emerald-900">
              <strong>Account verified!</strong> Your campus profile is ready. Please sign in below.
            </div>
          </div>
        )}

        {isReset && (
          <div className="p-4 bg-emerald-50 border-[2px] border-emerald-500 rounded-2xl flex items-start gap-3 text-left shadow-[2px_2px_0px_#111]">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs font-bold text-emerald-900">
              <strong>Password updated!</strong> Please sign in with your new password.
            </div>
          </div>
        )}

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
                      Dr. Sarah Lin / Dr. Meera
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
                      Marcus Vance / Admin
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

        {/* Direct Campus Email Login Card */}
        <Card className="p-6 text-left bg-[#FFFFFF] border-[2px] border-[#111111] shadow-[6px_6px_0px_#111] rounded-3xl">
          <div className="mb-4 space-y-1">
            <h3 className="text-sm font-black text-[#111111]">
              Sign In with Campus Credentials
            </h3>
            <p className="text-xs font-semibold text-[#111111]/70">
              Access your registered campus account or student demo:
            </p>
          </div>

          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border-[2px] border-red-500 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs font-bold text-red-800">{errors.general}</div>
            </div>
          )}

          <form onSubmit={handleStandardLogin} className="space-y-4" noValidate>
            <div>
              <Input
                label="University Email"
                type="email"
                placeholder="yourname@campus.edu"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                leftIcon={<Mail className="w-4 h-4 stroke-[2.5]" />}
                helperText="Registered campus address"
              />
              {errors.email && (
                <p className="text-[11px] font-bold text-[#DC2626] mt-1 flex items-center gap-1" role="alert">
                  <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-black text-[#111111] uppercase tracking-wide">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-bold text-[#111111] hover:text-[#D97706] underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
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

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full text-sm font-black min-h-[48px] shadow-[4px_4px_0px_#111111]"
            >
              Sign In to Utilix
            </Button>
          </form>

          {/* New to Utilix? Register Link */}
          <div className="mt-6 pt-5 border-t-[2px] border-[#111111]/10 text-center">
            <p className="text-xs font-bold text-[#111111]/70">
              New to Utilix?{" "}
              <Link
                href="/register"
                className="text-[#111111] font-black underline hover:text-[#D97706] inline-flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register with Campus Email</span>
              </Link>
            </p>
          </div>
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FFFDF8] flex items-center justify-center font-bold">Loading Utilix Sign In...</div>}>
      <LoginContent />
    </Suspense>
  );
}
