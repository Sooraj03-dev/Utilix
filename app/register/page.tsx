"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Lock,
  Building,
  GraduationCap,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import {
  Button,
  Card,
  Input,
  Select,
  UtilixWordmark,
} from "@/components";
import { useToast } from "@/components/ToastContext";

const DEPARTMENT_OPTIONS = [
  { value: "", label: "Select your department..." },
  { value: "dept_eng", label: "Electrical & Computer Engineering (ECE/CSE)" },
  { value: "dept_mech", label: "Mechanical & Mechatronics (MECH)" },
  { value: "dept_design", label: "Design, Architecture & Media" },
  { value: "dept_science", label: "Pure & Applied Sciences" },
  { value: "dept_general", label: "Interdisciplinary / Cross-Campus" },
];

const YEAR_OPTIONS = [
  { value: "1", label: "1st Year Undergraduate" },
  { value: "2", label: "2nd Year Undergraduate" },
  { value: "3", label: "3rd Year Undergraduate" },
  { value: "4", label: "4th Year / Final Year" },
  { value: "5", label: "Postgraduate / Master's / PhD" },
];

export default function RegisterPage() {
  const router = useRouter();
  const { error: toastError, success: toastSuccess } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [year, setYear] = useState("1");
  const [studentId, setStudentId] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Compute password score
  const getPasswordScore = () => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  };

  const passwordScore = getPasswordScore();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = "Full name is required.";
    if (!email.trim()) newErrors.email = "University email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid university email address.";
    }

    if (!password) newErrors.password = "Password is required.";
    else if (password.length < 8) newErrors.password = "Password must be at least 8 characters.";
    else if (!/[0-9]/.test(password) || !/[A-Za-z]/.test(password)) {
      newErrors.password = "Password must contain both letters and numbers.";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    if (!departmentId) {
      newErrors.department = "Please select your department.";
    }

    if (!termsAccepted) {
      newErrors.terms = "You must agree to the Utilix Fair Share Terms.";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
          department_id: departmentId,
          year: parseInt(year, 10),
          student_id: studentId.trim() || undefined,
          termsAccepted,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toastError(data.error || "Registration failed.", "Check Requirements");
        setErrors({ general: data.error || "Registration failed." });
        return;
      }

      toastSuccess(
        "Verification code dispatched! Please check your campus email.",
        "Check Your Inbox"
      );

      // Redirect to verification screen with email prefilled
      router.push(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}&type=registration`);
    } catch (err) {
      console.error(err);
      toastError("Could not connect to authentication service.", "Network Error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF8] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-block transform transition hover:scale-105">
            <UtilixWordmark className="h-10 text-[#111111] mx-auto" />
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFD026] border-[2px] border-[#111111] rounded-full shadow-[2px_2px_0px_#111111] text-xs font-black text-[#111111]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Campus Member Registration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
            Create Your Utilix Account
          </h1>
          <p className="text-xs sm:text-sm font-bold text-[#111111]/70 max-w-md mx-auto">
            Fair access to high-demand campus equipment, makerspaces, and recording studios.
          </p>
        </div>

        {/* Card Container */}
        <Card className="bg-[#FFFFFF] p-6 sm:p-8 border-[2px] border-[#111111] shadow-[6px_6px_0px_#111111] rounded-3xl">
          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border-[2px] border-red-500 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs font-bold text-red-800">{errors.general}</div>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            {/* Full Name */}
            <Input
              label="Full Name"
              type="text"
              placeholder="e.g. Aarav Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              leftIcon={<User className="w-4 h-4 text-[#111111]" />}
              required
            />

            {/* University Email */}
            <Input
              label="Campus Email Address"
              type="email"
              placeholder="yourname@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              helperText="We will send a 6-digit verification code to this address."
              leftIcon={<Mail className="w-4 h-4 text-[#111111]" />}
              required
            />

            {/* Department & Year */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Department"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                options={DEPARTMENT_OPTIONS}
                error={errors.department}
                required
              />

              <Select
                label="Year of Study"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                options={YEAR_OPTIONS}
                required
              />
            </div>

            {/* Student ID (Optional) */}
            <Input
              label="Student / Roll ID (Optional)"
              type="text"
              placeholder="e.g. CS2024-042"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              leftIcon={<GraduationCap className="w-4 h-4 text-[#111111]" />}
            />

            {/* Password */}
            <div className="space-y-2">
              <Input
                label="Password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                leftIcon={<Lock className="w-4 h-4 text-[#111111]" />}
                required
              />

              {/* Password Strength Meter */}
              {password && (
                <div className="space-y-1">
                  <div className="flex gap-1 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden p-0.5 border border-black/20">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        passwordScore <= 1
                          ? "w-1/4 bg-red-500"
                          : passwordScore === 2
                          ? "w-2/4 bg-amber-500"
                          : passwordScore === 3
                          ? "w-3/4 bg-blue-500"
                          : "w-full bg-emerald-500"
                      }`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-black text-[#111111]/60">
                    <span>Password Strength</span>
                    <span className="uppercase">
                      {passwordScore <= 1
                        ? "Weak"
                        : passwordScore === 2
                        ? "Fair"
                        : passwordScore === 3
                        ? "Good"
                        : "Strong"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              leftIcon={<Lock className="w-4 h-4 text-[#111111]" />}
              required
            />

            {/* Terms and Fair Rules Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-[2px] border-[#111111] text-[#FFD026] focus:ring-0 cursor-pointer"
                />
                <span className="text-xs font-bold text-[#111111]/80 leading-snug">
                  I agree to the{" "}
                  <Link href="/rules" target="_blank" className="text-[#111111] font-black underline hover:text-[#D97706]">
                    8 Fair Allocation Rules
                  </Link>
                  , return resources on time, and acknowledge deterministic campus scheduling.
                </span>
              </label>
              {errors.terms && (
                <p className="mt-1.5 text-xs font-bold text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.terms}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full text-sm font-black min-h-[48px] shadow-[4px_4px_0px_#111111]"
            >
              Send 6-Digit Email OTP
            </Button>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 pt-6 border-t-[2px] border-[#111111]/10 text-center">
            <p className="text-xs font-bold text-[#111111]/70">
              Already have an account?{" "}
              <Link href="/login" className="text-[#111111] font-black underline hover:text-[#D97706]">
                Sign In to Utilix
              </Link>
            </p>
          </div>
        </Card>

        {/* Security footnote */}
        <div className="text-center text-xs font-bold text-[#111111]/60 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#111111]" />
          <span>Campus directory verification • End-to-end cryptographic OTP</span>
        </div>
      </div>
    </div>
  );
}
