"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  GraduationCap,
  Coins,
  Phone,
  Mail,
  Lock,
  Sparkles,
  ArrowRight,
  Save,
  Check,
} from "lucide-react";
import {
  Button,
  Input,
  Avatar,
  Card,
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

function ProfileContent() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();
  const { user: roleUser, refreshUser } = useRole();
  const { success, error: toastError } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [departmentId, setDepartmentId] = useState("dept_eng");
  const [year, setYear] = useState<number>(1);
  const [semester, setSemester] = useState<number>(1);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [campus, setCampus] = useState("Main Campus");

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const active = roleUser.uid ? roleUser : authUser;
    if (active) {
      setDisplayName(active.displayName || "");
      setStudentId(active.studentId || "");
      setDepartmentId(active.departmentId || "dept_eng");
      setYear(roleUser.year || authUser?.academicYear || 1);
      setSemester(active.semester || 1);
      setPhoneNumber(active.phoneNumber || "");
      setCampus(active.campus || "Main Campus");
    }
  }, [roleUser, authUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!displayName.trim() || displayName.trim().length < 2) {
      setErrorMessage("Please enter a valid display name.");
      return;
    }

    if (!phoneNumber.trim()) {
      setErrorMessage("Please enter a contact phone number.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          studentId: studentId.trim().toUpperCase(),
          departmentId,
          year,
          semester,
          phoneNumber: phoneNumber.trim(),
          campus: campus.trim() || "Main Campus",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      await refreshUser();
      success("Profile details updated successfully.", "Saved");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating profile.";
      setErrorMessage(msg);
      toastError(msg, "Save Failed");
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-black text-[#111111]">
          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <span>Loading Profile...</span>
        </div>
      </div>
    );
  }

  const activeUser = roleUser.uid ? roleUser : authUser;

  if (!activeUser || !activeUser.uid) {
    return (
      <div className="min-h-[calc(100vh-140px)] py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl border-[3.5px] border-black p-8 shadow-[6px_6px_0px_#111] text-center space-y-4">
          <h1 className="text-xl font-black text-[#111111]">Sign In Required</h1>
          <p className="text-xs text-[#111111]/70 font-semibold">
            Please log in to view your Utilix account profile.
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

  const currentName = roleUser.displayName || authUser?.displayName || "Utilix Member";
  const currentEmail = roleUser.email || authUser?.email || "";
  const currentRole = roleUser.role || authUser?.role || "student";
  const currentUid = roleUser.uid || authUser?.uid || "";
  const currentStudentId = roleUser.studentId || authUser?.studentId || "Recorded";
  const currentCampus = roleUser.campus || authUser?.campus || "Main Campus";
  const currentCredits = roleUser.creditBalance ?? 10;
  const currentReliability = roleUser.reliability ?? 100;
  const currentPhoto = roleUser.photoURL || authUser?.photoURL;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b-[3px] border-[#111111] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#FFD60A] border-[2px] border-black shadow-[2px_2px_0px_#111]">
            <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Profile &amp; Account Settings</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#111111] mt-2">
            Campus Member Profile
          </h1>
          <p className="text-xs sm:text-sm text-[#111111]/70 font-semibold mt-1">
            Manage your personal details, academic department, and view your quota status.
          </p>
        </div>

        <Link href="/dashboard">
          <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Identity & Immutable Stats (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Identity Card */}
          <div className="p-6 rounded-3xl bg-[#FFF9E6] border-[3.5px] border-[#111111] shadow-[6px_6px_0px_#111] space-y-5">
            <div className="flex items-center gap-4">
              <Avatar
                name={currentName}
                src={currentPhoto}
                size="lg"
              />
              <div className="space-y-1 min-w-0 flex-1">
                <h2 className="text-lg font-black text-[#111111] truncate">
                  {currentName}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-black text-[#FFD60A] border border-black">
                    {currentRole}
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 border border-emerald-600">
                    Active
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t-[2px] border-[#111111]/20 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-black/10">
                <span className="text-black/60 font-bold">Email:</span>
                <span className="font-mono font-black text-black truncate max-w-[200px]">
                  {currentEmail}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-black/10">
                <span className="text-black/60 font-bold">Student USN / ID:</span>
                <span className="font-mono font-black text-black">
                  {currentStudentId}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-black/10">
                <span className="text-black/60 font-bold">Firebase UID:</span>
                <span className="font-mono text-[10px] text-black/70 truncate max-w-[170px]">
                  {currentUid}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-black/60 font-bold">Campus:</span>
                <span className="font-bold text-black">{currentCampus}</span>
              </div>
            </div>
          </div>

          {/* Quota & Reliability Card */}
          <div className="p-6 rounded-3xl bg-[#FFFEF2] border-[3.5px] border-[#111111] shadow-[6px_6px_0px_#111] space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#111111] flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-500 stroke-[2.5]" />
              <span>Credit &amp; Reliability Status</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#FFF9E6] border-[2px] border-black text-center shadow-[2px_2px_0px_#111]">
                <span className="text-[10px] font-bold uppercase text-black/60 block">Available Balance</span>
                <span className="text-2xl font-black text-black mt-1 block">
                  {currentCredits}
                </span>
                <span className="text-[10px] font-bold text-black/70">Credits</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#E0F2FE] border-[2px] border-black text-center shadow-[2px_2px_0px_#111]">
                <span className="text-[10px] font-bold uppercase text-black/60 block">Trust Score</span>
                <span className="text-2xl font-black text-sky-950 mt-1 block">
                  {currentReliability}%
                </span>
                <span className="text-[10px] font-bold text-sky-900">On-Time Returns</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              Credits and trust scores are governed by automated return logs. They cannot be edited manually.
            </p>
          </div>

        </div>

        {/* RIGHT COLUMN: Editable Form (7 Cols) */}
        <div className="lg:col-span-7">
          <div className="p-6 sm:p-8 rounded-3xl bg-white border-[3.5px] border-[#111111] shadow-[8px_8px_0px_#111] space-y-6">
            
            <div>
              <h2 className="text-xl font-black text-[#111111]">Edit Personal Details</h2>
              <p className="text-xs text-[#111111]/70 font-semibold mt-0.5">
                Update your preferred name, phone number, and academic details.
              </p>
            </div>

            {errorMessage && (
              <div className="p-4 rounded-2xl bg-rose-50 border-[2.5px] border-red-600 text-red-600 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 stroke-[2.5]" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-5" noValidate>
              
              {/* Full Name */}
              <div>
                <Input
                  label="Display Full Name"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  helperText="Shown on booking requests and confirmation receipts"
                />
              </div>

              {/* Read-Only Email */}
              <div>
                <Input
                  label="Institutional Email (Verified)"
                  type="email"
                  disabled
                  value={activeUser.email}
                  leftIcon={<Mail className="w-4 h-4 stroke-[2.5]" />}
                  rightIcon={<Lock className="w-4 h-4 text-slate-400" />}
                  helperText="Email is bound to your authenticated Google account"
                />
              </div>

              {/* Student USN */}
              <div>
                <Input
                  label="Student USN / Registration Number"
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                  helperText="Official university roll number or USN"
                />
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111]">
                  Department
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full p-3 rounded-2xl border-[2.5px] border-black bg-white font-bold text-xs text-black shadow-[2px_2px_0px_#111] focus:outline-none focus:ring-2 focus:ring-black"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Year and Semester */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#111111] mb-1.5">
                    Academic Year
                  </label>
                  <select
                    value={year}
                    onChange={(e) => {
                      const y = Number(e.target.value);
                      setYear(y);
                      setSemester((y - 1) * 2 + 1);
                    }}
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
                    Semester
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

              {/* Phone Number */}
              <div>
                <Input
                  label="Contact Phone Number"
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  leftIcon={<Phone className="w-4 h-4 stroke-[2.5]" />}
                  helperText="Required for emergency notifications and return alerts"
                />
              </div>

              {/* Campus */}
              <div>
                <Input
                  label="Campus Location"
                  type="text"
                  value={campus}
                  onChange={(e) => setCampus(e.target.value)}
                  leftIcon={<Building2 className="w-4 h-4 stroke-[2.5]" />}
                />
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t-[2.5px] border-black flex items-center justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSaving}
                  leftIcon={<Save className="w-4 h-4 stroke-[2.5]" />}
                  className="min-w-[160px]"
                >
                  Save Changes
                </Button>
              </div>

            </form>

          </div>
        </div>

      </div>

    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">
          <div className="flex items-center gap-3 text-sm font-black text-[#111111]">
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            <span>Loading Profile...</span>
          </div>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
