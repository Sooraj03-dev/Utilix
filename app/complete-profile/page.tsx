"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  GraduationCap,
  Calendar,
  Phone,
  ArrowRight,
  UserCheck,
  Lock,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  Button,
  Input,
  Avatar,
  Card,
  UtilixMonogram,
  UtilixWordmark,
} from "@/components";
import { useAuth } from "@/lib/auth/context";
import { useRole } from "@/components/RoleContext";
import { useToast } from "@/components/ToastContext";

const DEPARTMENTS = [
  { id: "dept_eng", name: "Engineering & Robotics", code: "ENG" },
  { id: "dept_design", name: "Design & Media Architecture", code: "DSN" },
  { id: "dept_science", name: "Applied Sciences & Computing", code: "SCI" },
];

const ACADEMIC_YEARS = [
  { value: 1, label: "1st Year (Freshman)" },
  { value: 2, label: "2nd Year (Sophomore)" },
  { value: 3, label: "3rd Year (Junior)" },
  { value: 4, label: "4th Year (Senior)" },
];

function CompleteProfileContent() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();
  const { refreshUser } = useRole();
  const { success, error: toastError } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [departmentId, setDepartmentId] = useState("dept_eng");
  const [year, setYear] = useState<number>(1);
  const [semester, setSemester] = useState<number>(1);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [campus, setCampus] = useState("Main Campus");
  const [applyForCoordinator, setApplyForCoordinator] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-populate from Google Authentication & existing profile data
  useEffect(() => {
    if (authUser) {
      if (authUser.displayName && !displayName) {
        setDisplayName(authUser.displayName);
      }
      if (authUser.studentId && !studentId) {
        setStudentId(authUser.studentId);
      }
      if (authUser.departmentId) {
        setDepartmentId(authUser.departmentId);
      }
      if (authUser.academicYear) {
        setYear(authUser.academicYear);
      }
      if (authUser.semester) {
        setSemester(authUser.semester);
      }
      if (authUser.phoneNumber && !phoneNumber) {
        setPhoneNumber(authUser.phoneNumber);
      }
      if (authUser.campus && !campus) {
        setCampus(authUser.campus);
      }
    }
  }, [authUser]);

  // When year changes, set a sensible default semester
  const handleYearChange = (newYear: number) => {
    setYear(newYear);
    const minSem = (newYear - 1) * 2 + 1;
    setSemester(minSem);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!displayName.trim() || displayName.trim().length < 2) {
      errors.displayName = "Please enter your full name (at least 2 characters).";
    }

    const cleanStudentId = studentId.trim().toUpperCase();
    if (!cleanStudentId) {
      errors.studentId = "Student USN / Registration Number is required.";
    } else if (cleanStudentId.length < 3 || cleanStudentId.length > 25) {
      errors.studentId = "Registration Number must be between 3 and 25 characters.";
    } else if (!/^[A-Za-z0-9\-_]+$/.test(cleanStudentId)) {
      errors.studentId = "Only alphanumeric characters and hyphens are allowed.";
    }

    if (!departmentId) {
      errors.departmentId = "Please select your department.";
    }

    const cleanPhone = phoneNumber.trim();
    if (!cleanPhone) {
      errors.phoneNumber = "Phone number is required for equipment check-in verification.";
    } else if (!/^[+]?[\d\s\-()]{10,18}$/.test(cleanPhone)) {
      errors.phoneNumber = "Please enter a valid 10-digit phone number.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          studentId: studentId.trim().toUpperCase(),
          departmentId,
          year,
          semester,
          phoneNumber: phoneNumber.trim(),
          campus: campus.trim() || "Main Campus",
          photoURL: authUser?.photoURL,
          roleRequest: applyForCoordinator ? "coordinator" : "student",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save profile. Please try again.");
      }

      await refreshUser();

      success(
        applyForCoordinator
          ? "Profile saved! Your coordinator access request is pending approval."
          : "Your Utilix student profile is ready! Welcome to campus sharing.",
        "Profile Completed"
      );

      // Redirect to student home
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred while saving your profile.";
      setGeneralError(msg);
      toastError(msg, "Submission Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-black text-[#111111]">
          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <span>Verifying authentication state...</span>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!authUser) {
    return (
      <div className="min-h-[calc(100vh-140px)] py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl border-[3.5px] border-black p-8 shadow-[6px_6px_0px_#111] text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FFD60A] border-[2.5px] border-black mx-auto flex items-center justify-center shadow-[2.5px_2.5px_0px_#111]">
            <ShieldCheck className="w-6 h-6 text-black stroke-[2.5]" />
          </div>
          <h1 className="text-xl font-black text-[#111111]">Authentication Required</h1>
          <p className="text-xs text-[#111111]/70 font-semibold leading-relaxed">
            Please sign in with your Google account first to complete your campus profile.
          </p>
          <Link href="/login" className="block pt-2">
            <Button variant="primary" size="md" className="w-full">
              Go to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Returning user with already completed profile visiting this page
  if (authUser.profileCompleted === true) {
    return (
      <div className="min-h-[calc(100vh-140px)] py-12 px-4 flex items-center justify-center">
        <div className="max-w-lg w-full bg-[#FFF9E6] rounded-3xl border-[3.5px] border-black p-8 shadow-[8px_8px_0px_#111] text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-[#22C55E] border-[2.5px] border-black mx-auto flex items-center justify-center shadow-[3px_3px_0px_#111]">
            <CheckCircle2 className="w-8 h-8 text-white stroke-[3]" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-[#111111]">Profile Already Completed</h1>
            <p className="text-xs text-[#111111]/70 font-semibold">
              You are signed in as <strong>{authUser.displayName}</strong> ({authUser.email}).
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white border-[2px] border-black text-left text-xs space-y-1.5 shadow-[2px_2px_0px_#111]">
            <div className="flex justify-between">
              <span className="text-black/60 font-bold">Registration / USN:</span>
              <span className="font-mono font-black">{authUser.studentId || "Recorded"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/60 font-bold">Role:</span>
              <span className="font-black uppercase text-[#22C55E]">{authUser.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/60 font-bold">Campus:</span>
              <span className="font-bold">{authUser.campus || "Main Campus"}</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link href="/dashboard" className="flex-1">
              <Button variant="primary" size="md" className="w-full">
                Go to Dashboard →
              </Button>
            </Link>
            <Link href="/profile" className="flex-1">
              <Button variant="secondary" size="md" className="w-full">
                Edit Profile Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-100px)] py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center bg-[#FFF9E6]/30">
      <div className="w-full max-w-4xl rounded-3xl border-[3.5px] border-[#111111] shadow-[8px_8px_0px_0px_#111111] overflow-hidden bg-[#FFFEF2]">
        
        {/* Header Banner */}
        <div className="bg-[#0B132B] text-white p-6 sm:p-8 border-b-[3.5px] border-[#111111] relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#FFD60A]/15 blur-2xl pointer-events-none" />
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#FFD60A]/15 text-[#FFD60A] border border-[#FFD60A]/35">
              <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Step 2 of 2 — Identity Onboarding</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Complete Your Utilix Profile
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-2xl">
              Just a few more details to personalize your campus resource-sharing experience.
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="p-6 sm:p-10">
          <form onSubmit={handleSubmit} className="space-y-8" noValidate>
            
            {/* General Error Alert */}
            {generalError && (
              <div
                className="p-4 rounded-2xl bg-rose-50 border-[2.5px] border-[#DC2626] text-[#DC2626] text-xs font-bold flex items-start gap-2.5 shadow-[3px_3px_0px_#DC2626]"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 stroke-[2.5] shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">
                  <span className="font-black">Submission Error:</span> {generalError}
                </div>
              </div>
            )}

            {/* ─── SECTION 1: Google Account Verification (Auto-Populated) ──── */}
            <div className="p-5 rounded-2xl bg-[#FFF9E6] border-[2.5px] border-[#111111] shadow-[3px_3px_0px_#111] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#111111]/70 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                  <span>Google Account Auto-Populated</span>
                </span>
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-400">
                  Verified Identity
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
                <Avatar
                  name={authUser.displayName || "Google User"}
                  src={authUser.photoURL}
                  size="lg"
                />
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-[#111111] truncate">
                      {authUser.displayName || "Utilix Member"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#111111]/70 font-semibold">
                    <span className="font-mono text-xs">{authUser.email}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-300">
                      <Lock className="w-2.5 h-2.5" /> Read-Only
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── SECTION 2: Academic & Institutional Information ─────────── */}
            <div className="space-y-4">
              <h2 className="text-sm font-black uppercase tracking-wider text-[#111111] flex items-center gap-2 border-b-[2px] border-[#111111]/20 pb-2">
                <GraduationCap className="w-4 h-4 text-black stroke-[2.5]" />
                <span>Academic &amp; Student Credentials</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <Input
                    label="Preferred Full Name"
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      if (fieldErrors.displayName) {
                        setFieldErrors((prev) => ({ ...prev, displayName: "" }));
                      }
                    }}
                    error={fieldErrors.displayName}
                    helperText="As it should appear on equipment check-out receipts"
                  />
                </div>

                {/* Student USN / ID */}
                <div>
                  <Input
                    label="Student USN / Registration Number"
                    type="text"
                    required
                    placeholder="e.g. 1MS21CS001"
                    value={studentId}
                    onChange={(e) => {
                      setStudentId(e.target.value.toUpperCase());
                      if (fieldErrors.studentId) {
                        setFieldErrors((prev) => ({ ...prev, studentId: "" }));
                      }
                    }}
                    error={fieldErrors.studentId}
                    helperText="Official university roll number or USN"
                  />
                </div>
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111]">
                  Academic Department <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {DEPARTMENTS.map((dept) => {
                    const isSelected = departmentId === dept.id;
                    return (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => {
                          setDepartmentId(dept.id);
                          if (fieldErrors.departmentId) {
                            setFieldErrors((prev) => ({ ...prev, departmentId: "" }));
                          }
                        }}
                        className={`p-3 rounded-2xl border-[2.5px] text-left transition flex flex-col justify-between min-h-[72px] ${
                          isSelected
                            ? "bg-[#FFD60A] text-black border-black shadow-[3px_3px_0px_#111] font-black"
                            : "bg-white border-black/40 hover:border-black text-black/80 hover:bg-yellow-50"
                        }`}
                      >
                        <span className="text-[10px] font-mono uppercase font-black text-black/60">
                          {dept.code}
                        </span>
                        <span className="text-xs font-bold leading-tight mt-1">{dept.name}</span>
                      </button>
                    );
                  })}
                </div>
                {fieldErrors.departmentId && (
                  <p className="text-xs text-[#DC2626] font-bold mt-1">{fieldErrors.departmentId}</p>
                )}
              </div>

              {/* Year and Semester */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                    Academic Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={year}
                    onChange={(e) => handleYearChange(Number(e.target.value))}
                    className="w-full p-3 rounded-2xl border-[2.5px] border-black bg-white font-bold text-xs text-black shadow-[2px_2px_0px_#111] focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    {ACADEMIC_YEARS.map((y) => (
                      <option key={y.value} value={y.value}>
                        {y.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                    Semester <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value))}
                    className="w-full p-3 rounded-2xl border-[2.5px] border-black bg-white font-bold text-xs text-black shadow-[2px_2px_0px_#111] focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    {Array.from({ length: 8 }, (_, i) => i + 1).map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ─── SECTION 3: Contact & Campus Location ─────────────────────── */}
            <div className="space-y-4">
              <h2 className="text-sm font-black uppercase tracking-wider text-[#111111] flex items-center gap-2 border-b-[2px] border-[#111111]/20 pb-2">
                <Building2 className="w-4 h-4 text-black stroke-[2.5]" />
                <span>Contact &amp; Campus Verification</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Phone Number"
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      if (fieldErrors.phoneNumber) {
                        setFieldErrors((prev) => ({ ...prev, phoneNumber: "" }));
                      }
                    }}
                    error={fieldErrors.phoneNumber}
                    leftIcon={<Phone className="w-4 h-4 stroke-[2.5]" />}
                    helperText="Required for SMS equipment return reminders"
                  />
                </div>

                <div>
                  <Input
                    label="Campus Location"
                    type="text"
                    value={campus}
                    onChange={(e) => setCampus(e.target.value)}
                    leftIcon={<Building2 className="w-4 h-4 stroke-[2.5]" />}
                    helperText="Default: Main University Campus"
                  />
                </div>
              </div>
            </div>

            {/* ─── SECTION 4: Role Policy & Coordinator Request ────────────── */}
            <div className="p-4 rounded-2xl bg-slate-50 border-[2px] border-slate-300 space-y-3">
              <div className="flex items-start gap-2.5 text-xs text-slate-800">
                <Info className="w-4 h-4 stroke-[2.5] text-slate-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">
                    <strong>Default Campus Role:</strong> You are registering as a <strong>Student</strong> with 10 free monthly session credits.
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Administrator permissions require direct backend institutional configuration.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={applyForCoordinator}
                    onChange={(e) => setApplyForCoordinator(e.target.checked)}
                    className="w-4 h-4 text-black rounded border-2 border-black focus:ring-black accent-black cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-900">
                    Applying for Lab Coordinator / Teaching Assistant permissions (Requires Admin Approval)
                  </span>
                </label>
                {applyForCoordinator && (
                  <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-300 mt-2">
                    Note: Submitting as Coordinator sets your account to pending administrator verification. Once verified, you will manage laboratory reservations.
                  </p>
                )}
              </div>
            </div>

            {/* ─── SECTION 5: Submit Action ─────────────────────────────────── */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t-[2.5px] border-[#111111]">
              <p className="text-[11px] text-slate-600 font-medium">
                By submitting, you agree to Utilix fair allocation policies and equipment return rules.
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto min-w-[200px] min-h-[50px] px-8 py-3 rounded-2xl bg-[#FFD60A] text-black font-black text-sm border-[3px] border-black shadow-[4px_4px_0px_0px_#111] hover:bg-yellow-400 hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Saving Profile...</span>
                  </div>
                ) : (
                  <>
                    <span>Complete &amp; Enter Utilix</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}

export default function CompleteProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">
          <div className="flex items-center gap-3 text-sm font-black text-[#111111]">
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            <span>Loading Profile Form...</span>
          </div>
        </div>
      }
    >
      <CompleteProfileContent />
    </Suspense>
  );
}
