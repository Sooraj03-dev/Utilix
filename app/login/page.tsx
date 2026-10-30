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
  UtilixMonogram,
  UtilixWordmark,
} from "@/components";
import { useRole, DEMO_USERS } from "@/components/RoleContext";
import { useToast } from "@/components/ToastContext";
import { Role } from "@/components/types";
import { useAuth } from "@/lib/auth/context";
import { getFirebaseClientAuth } from "@/lib/firebase/client";
import { signInWithEmailAndPassword } from "firebase/auth";

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

function getSafeRedirectUrl(userRole: string, candidate?: string | null): string {
  if (
    candidate &&
    candidate.startsWith("/") &&
    !candidate.startsWith("//") &&
    !candidate.includes(":") &&
    candidate !== "/" &&
    candidate !== "/login"
  ) {
    return candidate;
  }
  if (userRole === "admin") {
    return "/dashboard/admin";
  }
  if (userRole === "coordinator") {
    return "/dashboard/coordinator";
  }
  return "/dashboard";
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
  const [activeTab, setActiveTab] = useState<"roles" | "email">("roles");
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
        const resolvedRole = (signedInUser.role as Role) || "student";
        if (typeof document !== "undefined") {
          document.cookie = `utilix_active_role=${resolvedRole}; path=/; max-age=86400; SameSite=Lax`;
        }
        setRole(resolvedRole);
        success(
          `Welcome, ${signedInUser.displayName}! Signed in with Google.`,
          "Authentication Success"
        );
        const destination = getSafeRedirectUrl(resolvedRole, redirectParam);
        router.push(destination);
        router.refresh();
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
      const resolvedRole = (json?.user?.role as Role) || "student";
      if (typeof document !== "undefined") {
        document.cookie = `utilix_active_role=${resolvedRole}; path=/; max-age=86400; SameSite=Lax`;
      }
      setRole(resolvedRole);

      success("Signed in successfully to Utilix.", "Welcome Back");
      const destination = getSafeRedirectUrl(resolvedRole, redirectParam);
      router.push(destination);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid credentials or user not found.";
      setErrorMessage(msg);
      toastError(msg, "Sign-In Failed");
    } finally {
      setIsEmailLoading(false);
    }
  };

  // 3. One-Click Demo Persona Handler (Firebase Authentication)
  const handleDemoSignIn = async (targetRole: Role) => {
    setErrorMessage(null);
    const persona = DEMO_USERS[targetRole];
    setIsEmailLoading(true);

    try {
      // Step 1: Fetch demo credentials securely from server (no passwords in client bundle)
      const credsRes = await fetch("/api/auth/demo-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole }),
      });

      if (!credsRes.ok) {
        const errorData = (await credsRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error || "Demo accounts are temporarily unavailable.");
      }

      const { email, password } = (await credsRes.json()) as { email: string; password: string };

      // Step 2: Authenticate through Firebase signInWithEmailAndPassword
      const auth = getFirebaseClientAuth();
      if (!auth) {
        throw new Error("Firebase Authentication is not configured.");
      }

      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (authErr: unknown) {
        const errorCode =
          typeof authErr === "object" && authErr !== null && "code" in authErr
            ? String((authErr as { code: unknown }).code)
            : "";

        if (errorCode === "auth/user-not-found") {
          throw new Error(
            `Demo account for ${targetRole} (${email}) was not found in Firebase Authentication. Please seed the database.`
          );
        }
        if (errorCode === "auth/wrong-password" || errorCode === "auth/invalid-credential") {
          throw new Error(`Invalid credentials for ${email}. Please ensure demo passwords match.`);
        }
        if (errorCode === "auth/too-many-requests") {
          throw new Error(
            "Access to this demo account has been temporarily disabled due to many failed login attempts. Please try again later."
          );
        }
        if (errorCode === "auth/network-request-failed") {
          throw new Error("Network error connecting to Firebase Authentication. Check your connection.");
        }
        throw authErr;
      }

      // Step 3: Exchange Firebase ID token through existing /api/auth/session endpoint
      const idToken = await userCredential.user.getIdToken(true);
      const sessionRes = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!sessionRes.ok) {
        const sessionErr = (await sessionRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(sessionErr.error || "Failed to establish server session.");
      }

      const sessionData = (await sessionRes.json().catch(() => ({}))) as {
        user?: { role?: string; displayName?: string };
      };
      const resolvedRole = (sessionData?.user?.role as Role) || targetRole;

      if (typeof document !== "undefined") {
        document.cookie = `utilix_active_role=${resolvedRole}; path=/; max-age=86400; SameSite=Lax`;
      }
      setRole(resolvedRole);

      success(
        `Active session: ${persona.name} (${targetRole.toUpperCase()}).`,
        "Demo Persona Loaded"
      );

      // Step 4: Redirect to the correct role dashboard
      const destination = getSafeRedirectUrl(resolvedRole, redirectParam);
      router.push(destination);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Demo sign-in failed.";
      setErrorMessage(msg);
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
        <div className="lg:col-span-5 bg-[#0B132B] text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle ambient lighting */}
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#38BDF8]/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#FFD60A]/10 blur-3xl pointer-events-none" />

          {/* Top Brand Header */}
          <div className="relative z-10 space-y-6">
            <Link
              href="/"
              className="inline-flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-[#FFD60A] rounded-2xl p-1 -ml-1 transition-all"
              aria-label="Utilix Home"
            >
              <div className="w-11 h-11 rounded-2xl bg-[#FFD60A] border-[2.5px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)] group-hover:scale-105 group-hover:rotate-[-2deg] transition-all shrink-0">
                <UtilixMonogram size={30} hasSparkle={true} hasShadow={false} />
              </div>
              <UtilixWordmark height={32} theme="dark" />
            </Link>

            <div className="space-y-3 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#FFD60A]/15 text-[#FFD60A] border border-[#FFD60A]/35">
                <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Institutional Resource Sharing</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-4xl font-black tracking-tight leading-[1.15] text-white">
                Your Campus.<br />Shared Smarter.
              </h1>
              <p className="text-sm font-medium text-slate-300 leading-relaxed max-w-md">
                Discover resources, book equipment, and make the most of your campus with fair algorithmic allocation.
              </p>
            </div>

            {/* 3 Concise Benefit Points */}
            <div className="space-y-4 pt-1">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center shrink-0 mt-0.5 text-[#38BDF8] shadow-sm">
                  <Boxes className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">Discover Available Resources</h2>
                  <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                    Access 3D printers, media equipment, hardware labs, and studios with real-time schedule visibility.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center shrink-0 mt-0.5 text-[#FFD60A] shadow-sm">
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">Book Equipment &amp; Spaces</h2>
                  <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                    Transparent reservation queues backed by policy fairness algorithms.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center shrink-0 mt-0.5 text-[#4ADE80] shadow-sm">
                  <Layers className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">Manage Everything in One Place</h2>
                  <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                    Track requests, physical check-ins, return inspections, and credit history.
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
                      onClick={() => { setActiveTab("roles"); setErrorMessage(null); }}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-amber-900 font-bold text-xs text-center border border-amber-300 transition"
                    >
                      Use Demo Portals in meantime &rarr;
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

            {/* Navigation Tabs between Role Portals & Campus Email */}
            <div className="flex rounded-2xl bg-[#FFF9E6] border-[2px] border-[#111111] p-1.5 gap-1.5 text-xs font-black shadow-[2px_2px_0px_#111]">
              <button
                type="button"
                onClick={() => { setActiveTab("roles"); setErrorMessage(null); }}
                className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-black ${
                  activeTab === "roles"
                    ? "bg-[#FFD60A] text-[#111111] shadow-[2px_2px_0px_#111]"
                    : "text-[#111111]/70 hover:text-[#111111]"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Role Portals (Student / Coord / Admin)</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("email"); setErrorMessage(null); }}
                className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-black ${
                  activeTab === "email"
                    ? "bg-[#FFD60A] text-[#111111] shadow-[2px_2px_0px_#111]"
                    : "text-[#111111]/70 hover:text-[#111111]"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Campus Email</span>
              </button>
            </div>

            {/* ─── TAB 1: Role Portals (Upfront & Prominent) ─────────────── */}
            {activeTab === "roles" && (
              <div className="space-y-4 pt-1">
                {/* 1. Student Portal */}
                <div className="p-4 rounded-2xl border-[3px] border-[#111111] bg-[#FFFEF2] shadow-[4px_4px_0px_0px_#111111] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-[#111111]">🎓 Student & Campus User Portal</span>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#22C55E] text-black border border-black shadow-[1px_1px_0px_#111]">
                      Student
                    </span>
                  </div>
                  <p className="text-xs text-[#111111]/75 font-medium leading-relaxed">
                    Browse equipment, submit booking requests, manage monthly credits, and verify lab certifications.
                  </p>

                  <div className="space-y-2 pt-1">
                    {/* Primary Google SSO Button */}
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isGoogleLoading || authLoading}
                      className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border-[2.5px] border-[#111111] bg-white text-[#111111] font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-[3px_3px_0px_0px_#111111] hover:bg-yellow-50 hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
                    >
                      {isGoogleLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
                          <span>Connecting to Google...</span>
                        </div>
                      ) : (
                        <>
                          <GoogleIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          <span>Continue with Google (SSO)</span>
                        </>
                      )}
                    </button>

                    {/* Quick 1-Click Student Demo */}
                    <button
                      type="button"
                      onClick={() => handleDemoSignIn("student")}
                      disabled={isEmailLoading || authLoading}
                      className="w-full py-2 px-3 rounded-xl border-[2px] border-[#111111]/60 bg-[#FFF9E6] hover:bg-[#FFD60A] hover:border-[#111111] text-[#111111] font-bold text-xs flex items-center justify-between transition group"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar name="Aarav Sharma" role="student" size="sm" />
                        <span className="font-black">1-Click Student Demo: Aarav Sharma</span>
                      </div>
                      <span className="text-[10px] font-bold text-[#111111]/60 group-hover:text-black flex items-center">
                        Login &rarr;
                      </span>
                    </button>
                  </div>
                </div>

                {/* 2. Coordinator Portal */}
                <div className="p-4 rounded-2xl border-[3px] border-[#111111] bg-[#FFFEF2] shadow-[4px_4px_0px_0px_#111111] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-[#111111]">🔬 Lab Coordinator Portal</span>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#38BDF8] text-black border border-black shadow-[1px_1px_0px_#111]">
                      Coordinator
                    </span>
                  </div>
                  <p className="text-xs text-[#111111]/75 font-medium leading-relaxed">
                    Review and approve reservation requests, grant training certifications, and log equipment checkouts.
                  </p>

                  <button
                    type="button"
                    onClick={() => handleDemoSignIn("coordinator")}
                    disabled={isEmailLoading || authLoading}
                    className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border-[2.5px] border-[#111111] bg-[#38BDF8] hover:bg-[#0284C7] hover:text-white text-[#111111] font-black text-xs sm:text-sm flex items-center justify-between shadow-[3px_3px_0px_0px_#111111] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar name="Dr. Sarah Lin" role="coordinator" size="sm" />
                      <div className="text-left">
                        <p className="font-black text-xs sm:text-sm">Sign In as Coordinator</p>
                        <p className="text-[10px] font-bold opacity-80">Dr. Sarah Lin • Facility Lead</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-xs">
                      <span>Go to Queue</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                </div>

                {/* 3. Platform Admin Portal */}
                <div className="p-4 rounded-2xl border-[3px] border-[#111111] bg-[#FFFEF2] shadow-[4px_4px_0px_0px_#111111] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-[#111111]">🛡️ Campus Administrator Portal</span>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#C084FC] text-black border border-black shadow-[1px_1px_0px_#111]">
                      Admin
                    </span>
                  </div>
                  <p className="text-xs text-[#111111]/75 font-medium leading-relaxed">
                    Algorithmic fairness telemetry (Gini parity index), quota policy management, and campus audit trail.
                  </p>

                  <button
                    type="button"
                    onClick={() => handleDemoSignIn("admin")}
                    disabled={isEmailLoading || authLoading}
                    className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border-[2.5px] border-[#111111] bg-[#C084FC] hover:bg-[#9333EA] hover:text-white text-[#111111] font-black text-xs sm:text-sm flex items-center justify-between shadow-[3px_3px_0px_0px_#111111] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar name="Marcus Vance" role="admin" size="sm" />
                      <div className="text-left">
                        <p className="font-black text-xs sm:text-sm">Sign In as Campus Admin</p>
                        <p className="text-[10px] font-bold opacity-80">Marcus Vance • Dean of Facilities</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-xs">
                      <span>Go to Admin</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
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
