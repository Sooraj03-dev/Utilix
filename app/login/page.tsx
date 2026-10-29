"use client";

import React, { useState, Suspense } from "react";
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
  Boxes,
  Cpu,
  Camera,
  Layers,
  ChevronRight,
  LogOut,
  UserCheck,
  ExternalLink,
} from "lucide-react";
import {
  Button,
  Input,
  Avatar,
  UtilixAppIcon,
  UtilixWordmark,
} from "@/components";
import { useRole, DEMO_USERS } from "@/components/RoleContext";
import { useToast } from "@/components/ToastContext";
import { Role } from "@/components/types";
import { useAuth } from "@/lib/auth/context";

// Legitimate Google Brand Asset SVG
function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

const DEMO_CREDENTIALS: Record<Role, { email: string; pass: string }> = {
  student: { email: "student01@utilix.local", pass: "UtilixPassword2026!" },
  coordinator: { email: "coord-lab@utilix.local", pass: "UtilixPassword2026!" },
  admin: { email: "admin-platform@utilix.local", pass: "UtilixPassword2026!" },
};

function getSafeRedirectUrl(userRole: string, candidate?: string | null): string {
  if (
    candidate &&
    candidate.startsWith("/") &&
    !candidate.startsWith("//") &&
    !candidate.includes(":")
  ) {
    return candidate;
  }
  if (userRole === "admin") {
    return "/dashboard/admin";
  }
  if (userRole === "coordinator") {
    return "/dashboard/coordinator";
  }
  return "/";
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const { role, setRole } = useRole();
  const { success, error: toastError } = useToast();
  const {
    login,
    loginWithGoogle,
    logout,
    user: authUser,
    loading: authLoading,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<"google" | "email" | "demo">("google");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  // 1. Google Authentication Handler
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);

    try {
      const signedInUser = await loginWithGoogle();
      if (signedInUser) {
        setRole(signedInUser.role as Role);
        success(
          `Welcome, ${signedInUser.displayName}! Signed in with Google.`,
          "Authentication Success"
        );
        const destination = getSafeRedirectUrl(signedInUser.role, redirectParam);
        router.push(destination);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google authentication failed.";
      setErrorMessage(msg);
      toastError(msg, "Sign-In Failed");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // 2. Campus Email & Password Handler
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid campus email address.");
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setIsEmailLoading(true);
    try {
      await login(email, password);

      // Verify active session profile to determine role
      const res = await fetch("/api/auth/session");
      const json = await res.json();
      const resolvedRole = json?.user?.role || "student";
      setRole(resolvedRole as Role);

      success("Signed in successfully to Utilix.", "Welcome Back");
      const destination = getSafeRedirectUrl(resolvedRole, redirectParam);
      router.push(destination);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid credentials or user not found.";
      setErrorMessage(msg);
      toastError(msg, "Sign-In Failed");
    } finally {
      setIsEmailLoading(false);
    }
  };

  // 3. One-Click Demo Persona Handler
  const handleDemoSignIn = async (targetRole: Role) => {
    setErrorMessage(null);
    const persona = DEMO_USERS[targetRole];
    const creds = DEMO_CREDENTIALS[targetRole];

    setIsEmailLoading(true);
    try {
      await login(creds.email, creds.pass);
      setRole(targetRole);
      success(
        `Active session: ${persona.name} (${targetRole.toUpperCase()}).`,
        "Demo Persona Loaded"
      );
      const destination = getSafeRedirectUrl(targetRole, redirectParam);
      router.push(destination);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Demo sign-in failed.";
      setErrorMessage(`${msg} Ensure Firebase Auth and Firestore seed data are active.`);
      toastError(msg, "Demo Login Failed");
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      success("You have been signed out.", "Session Ended");
    } catch {
      toastError("Error signing out.", "Sign Out Failed");
    }
  };

  return (
    <div className="min-h-[calc(100vh-100px)] py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="w-full max-w-5xl rounded-3xl border-[3.5px] border-[#111111] shadow-[8px_8px_0px_0px_#111111] overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-white">
        
        {/* ─── LEFT PANEL: Brand & Product Identity ─────────────────────── */}
        <div className="lg:col-span-5 bg-[#0F172A] text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

          {/* Top Brand Header */}
          <div className="relative z-10 space-y-6">
            <Link href="/" className="inline-flex items-center gap-3 group" aria-label="Utilix Home">
              <div className="w-12 h-12 rounded-2xl bg-[#FFD60A] border-[2.5px] border-black flex items-center justify-center shadow-[2px_2px_0px_#FFF] group-hover:scale-105 transition-transform">
                <UtilixAppIcon size={34} />
              </div>
              <UtilixWordmark height={32} className="brightness-0 invert" />
            </Link>

            <div className="space-y-3 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-400/20 text-[#FFD60A] border border-amber-400/30">
                <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                Institutional Resource Sharing
              </span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight text-white">
                Your Campus.<br />Shared Smarter.
              </h1>
              <p className="text-sm font-medium text-slate-300 leading-relaxed">
                Discover resources, book equipment, and make the most of your campus with fair algorithmic allocation.
              </p>
            </div>

            {/* 3 Concise Benefit Points */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5 text-teal-400">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Discover Available Resources</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Access 3D printers, media equipment, hardware labs, and studios with real-time schedule visibility.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5 text-amber-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Book Equipment &amp; Spaces</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Transparent reservation queues backed by policy fairness algorithms with zero pay-to-play favoritism.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5 text-sky-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Manage Everything in One Place</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Track requests, physical check-ins, return condition inspections, and credit ledger in your dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Campus Categories Pill Badges */}
          <div className="relative z-10 pt-8 border-t border-slate-800/80 mt-6">
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-300">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700">
                <Cpu className="w-3 h-3 text-amber-400" /> FabLab &amp; 3D Print
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700">
                <Camera className="w-3 h-3 text-teal-400" /> Cinema &amp; Audio
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700">
                <Boxes className="w-3 h-3 text-sky-400" /> Electronics
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-3 font-medium">
              Backed by Google Cloud Firestore &amp; Firebase Authentication.
            </p>
          </div>
        </div>

        {/* ─── RIGHT PANEL: Login Card ──────────────────────────────────── */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-[#FFFEF2]">
          <div className="max-w-md w-full mx-auto space-y-6">
            
            {/* Header */}
            <div>
              <h2 className="text-2xl font-black text-[#111111] tracking-tight">
                Welcome to Utilix
              </h2>
              <p className="text-xs sm:text-sm text-[#111111]/70 font-semibold mt-1">
                Sign in with your institutional Google account to continue.
              </p>
            </div>

            {/* Existing Active Session Notice (if user is already logged in) */}
            {authUser && (
              <div className="p-4 rounded-2xl bg-teal-50 border-[2.5px] border-teal-600 shadow-[3px_3px_0px_#0D9488] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-teal-900 font-black text-xs uppercase tracking-wider">
                    <UserCheck className="w-4 h-4 text-teal-700 stroke-[2.5]" />
                    <span>Active Session Detected</span>
                  </div>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-teal-200 text-teal-900">
                    {authUser.role}
                  </span>
                </div>
                <div className="text-xs text-teal-950">
                  You are signed in as <span className="font-bold">{authUser.displayName}</span> ({authUser.email}).
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => router.push(getSafeRedirectUrl(authUser.role, redirectParam))}
                    className="flex-1 py-2 px-3 rounded-xl bg-teal-600 text-white font-black text-xs hover:bg-teal-700 transition flex items-center justify-center gap-1 shadow-sm"
                  >
                    <span>Go to Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="py-2 px-3 rounded-xl border border-teal-300 text-teal-800 font-bold text-xs hover:bg-teal-100 transition flex items-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}

            {/* Error Message Alert & Intelligent Firebase Guidance */}
            {errorMessage && (
              (errorMessage.toLowerCase().includes("operation-not-allowed") ||
               errorMessage.toLowerCase().includes("google sign-in is not enabled") ||
               errorMessage.toLowerCase().includes("google provider is not enabled")) ? (
                <div className="p-4 rounded-2xl bg-amber-50 border-[2.5px] border-amber-600 shadow-[3px_3px_0px_#D97706] text-xs text-amber-950 space-y-3">
                  <div className="flex items-center gap-2 font-black text-amber-900 text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-700 stroke-[2.5] shrink-0" />
                    <span>Google Provider Needs 1-Minute Activation in Firebase Console</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-900/90 font-medium">
                    Firebase Authentication rejected Google sign-in because the Google provider is currently disabled in your Firebase project (<strong>utilix-d7843</strong>).
                  </p>
                  <ol className="list-decimal list-inside text-[11px] space-y-1 font-semibold text-amber-900 bg-white/70 p-3 rounded-xl border border-amber-200">
                    <li>Open Firebase Console &rarr; <strong>Authentication</strong> &rarr; <strong>Sign-in method</strong>.</li>
                    <li>Click <strong>Add new provider</strong> &rarr; Select <strong>Google</strong>.</li>
                    <li>Toggle <strong>Enable</strong>, choose your support email, and click <strong>Save</strong>.</li>
                  </ol>
                  <div className="pt-1 flex flex-col sm:flex-row gap-2">
                    <a
                      href="https://console.firebase.google.com/project/utilix-d7843/authentication/providers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs text-center border-[2px] border-black shadow-[2px_2px_0px_#111] transition flex items-center justify-center gap-1.5"
                    >
                      <span>Open Firebase Console</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => { setActiveTab("demo"); setErrorMessage(null); }}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-amber-900 font-bold text-xs text-center border border-amber-300 transition"
                    >
                      Use Demo Accounts in meantime &rarr;
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="p-3.5 rounded-2xl bg-rose-50 border-[2.5px] border-[#DC2626] text-[#DC2626] text-xs font-bold flex items-start gap-2.5 shadow-[2px_2px_0px_#DC2626]"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 stroke-[2.5] shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed">
                    <span className="font-black">Authentication Error:</span> {errorMessage}
                  </div>
                </div>
              )
            )}

            {/* Navigation Tabs between Google, Campus Email, and Demo */}
            <div className="flex rounded-xl bg-[#FFF9E6] border-[2px] border-[#111111] p-1 gap-1 text-xs font-black">
              <button
                type="button"
                onClick={() => { setActiveTab("google"); setErrorMessage(null); }}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "google"
                    ? "bg-[#FFD60A] text-[#111111] shadow-[2px_2px_0px_#111]"
                    : "text-[#111111]/70 hover:text-[#111111]"
                }`}
              >
                <GoogleIcon className="w-3.5 h-3.5" />
                <span>Google</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("email"); setErrorMessage(null); }}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "email"
                    ? "bg-[#FFD60A] text-[#111111] shadow-[2px_2px_0px_#111]"
                    : "text-[#111111]/70 hover:text-[#111111]"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Campus Email</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("demo"); setErrorMessage(null); }}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === "demo"
                    ? "bg-[#FFD60A] text-[#111111] shadow-[2px_2px_0px_#111]"
                    : "text-[#111111]/70 hover:text-[#111111]"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Demo Accounts</span>
              </button>
            </div>

            {/* ─── TAB 1: Google Authentication (Hero) ──────────────────── */}
            {activeTab === "google" && (
              <div className="space-y-4 pt-1">
                <div className="bg-[#FFF9E6] rounded-2xl p-5 border-[2px] border-[#111111] text-xs font-medium text-[#111111]/85 space-y-2">
                  <div className="flex items-center gap-1.5 font-black text-[#111111] text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                    <span>Instant University Single Sign-On</span>
                  </div>
                  <p className="leading-relaxed">
                    Click below to authenticate using your university Google Workspace account. Your student profile, default credits, and eligibility status will be resolved automatically.
                  </p>
                </div>

                {/* PROMINENT GOOGLE SIGN IN BUTTON */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading || authLoading}
                  className="w-full min-h-[52px] px-6 py-3.5 rounded-2xl border-[3px] border-[#111111] bg-white text-[#111111] font-black text-sm flex items-center justify-center gap-3 shadow-[4px_4px_0px_0px_#111111] hover:bg-slate-50 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_0px_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#111111] transition-all disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
                >
                  {isGoogleLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
                      <span>Connecting to Google...</span>
                    </div>
                  ) : (
                    <>
                      <GoogleIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>

                <div className="text-[11px] text-center text-[#111111]/60 font-semibold">
                  By continuing, you agree to institutional resource guidelines &amp; safety requirements.
                </div>
              </div>
            )}

            {/* ─── TAB 2: Campus Email & Password Form ──────────────────── */}
            {activeTab === "email" && (
              <form onSubmit={handleEmailSignIn} className="space-y-4 pt-1" noValidate>
                <div>
                  <Input
                    label="Campus University Email"
                    type="email"
                    placeholder="student01@utilix.local"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={<Mail className="w-4 h-4 stroke-[2.5]" />}
                    helperText="Institutional or seeded account email"
                  />
                </div>

                <div>
                  <Input
                    label="Campus Password"
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4 stroke-[2.5]" />}
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isEmailLoading || authLoading}
                  className="w-full text-sm font-black min-h-[48px]"
                >
                  Sign In with Password
                </Button>
              </form>
            )}

            {/* ─── TAB 3: Pre-seeded Demo Personas ─────────────────────── */}
            {activeTab === "demo" && (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-[#111111]/70 font-semibold">
                  Instant one-click access using pre-seeded accounts in Firebase Auth &amp; Firestore:
                </p>

                {/* Student */}
                <button
                  type="button"
                  onClick={() => handleDemoSignIn("student")}
                  disabled={isEmailLoading || authLoading}
                  className="w-full p-3 rounded-2xl border-[2.5px] border-[#111111] bg-[#FFF9E6] shadow-[2.5px_2.5px_0px_#111] hover:bg-yellow-100/70 transition flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name="Aarav Sharma" role="student" size="sm" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-[#111111]">student01@utilix.local</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#22C55E] border border-black font-black">
                          Student
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-[#111111]/60">20 Credits • Certified</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#111111] group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Coordinator */}
                <button
                  type="button"
                  onClick={() => handleDemoSignIn("coordinator")}
                  disabled={isEmailLoading || authLoading}
                  className="w-full p-3 rounded-2xl border-[2.5px] border-[#111111] bg-[#FFF9E6] shadow-[2.5px_2.5px_0px_#111] hover:bg-yellow-100/70 transition flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name="Dr. Sarah Lin" role="coordinator" size="sm" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-[#111111]">coord-lab@utilix.local</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#38BDF8] border border-black font-black">
                          Coordinator
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-[#111111]/60">Lab Approvals • Checkouts</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#111111] group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Admin */}
                <button
                  type="button"
                  onClick={() => handleDemoSignIn("admin")}
                  disabled={isEmailLoading || authLoading}
                  className="w-full p-3 rounded-2xl border-[2.5px] border-[#111111] bg-[#FFF9E6] shadow-[2.5px_2.5px_0px_#111] hover:bg-yellow-100/70 transition flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name="Marcus Vance" role="admin" size="sm" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-[#111111]">admin-platform@utilix.local</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#C084FC] border border-black font-black">
                          Admin
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-[#111111]/60">Policy Control • Audit Trail</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#111111] group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}

            {/* Bottom Footer Info */}
            <div className="pt-4 border-t border-slate-200 text-center space-y-1">
              <p className="text-[11px] font-bold text-[#111111]/70">
                Questions about resource quotas or tie-breakers?{" "}
                <Link href="/rules" className="text-[#111111] font-black underline hover:text-black">
                  Read the 8 Fair Allocation Rules
                </Link>
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">
          <div className="flex items-center gap-3 text-sm font-black text-[#111111]">
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            <span>Loading Utilix Login...</span>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
