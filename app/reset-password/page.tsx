"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, KeyRound, ShieldCheck, AlertCircle, ArrowLeft, Terminal } from "lucide-react";
import { Button, Card, Input, UtilixWordmark } from "@/components";
import { useToast } from "@/components/ToastContext";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { error: toastError, success: toastSuccess, info: toastInfo } = useToast();

  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  // Dev helper: check if dev OTP is available
  useEffect(() => {
    if (email && process.env.NODE_ENV !== "production") {
      fetch(`/api/auth/dev-otp?email=${encodeURIComponent(email)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.otp) {
            setDevOtpHint(data.otp);
          }
        })
        .catch(() => {});
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }

    if (!otp.trim() || otp.trim().length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError("New password must contain both letters and numbers.");
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Password reset failed.");
        toastError(data.error || "Password reset failed.");
        return;
      }

      toastSuccess(
        "Your password has been reset successfully! Please sign in.",
        "Password Updated"
      );

      router.push(`/login?reset=true&email=${encodeURIComponent(email)}`);
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
      toastError("Could not connect to server.", "Network Error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF8] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-block transform transition hover:scale-105">
            <UtilixWordmark className="h-10 text-[#111111] mx-auto" />
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFD026] border-[2px] border-[#111111] rounded-full shadow-[2px_2px_0px_#111111] text-xs font-black text-[#111111]">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Reset Password</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
            Create New Password
          </h1>
          <p className="text-xs sm:text-sm font-bold text-[#111111]/70 max-w-sm mx-auto">
            Enter the 6-digit code sent to your campus email and choose your new password.
          </p>
        </div>

        {/* Card */}
        <Card className="bg-[#FFFFFF] p-6 sm:p-8 border-[2px] border-[#111111] shadow-[6px_6px_0px_#111111] rounded-3xl">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-[2px] border-red-500 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs font-bold text-red-800">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Campus Email Address"
              type="email"
              placeholder="yourname@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4 text-[#111111]" />}
              required
            />

            <div>
              <Input
                label="6-Digit Reset Code"
                type="text"
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                leftIcon={<KeyRound className="w-4 h-4 text-[#111111]" />}
                required
              />
              {devOtpHint && (
                <div className="mt-2 flex items-center justify-between p-2 bg-amber-50 border border-amber-300 rounded-xl text-[11px] font-bold text-amber-900">
                  <span className="flex items-center gap-1">
                    <Terminal className="w-3 h-3" />
                    Dev OTP: {devOtpHint}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setOtp(devOtpHint);
                      toastInfo(`Filled dev code: ${devOtpHint}`);
                    }}
                    className="px-2 py-0.5 bg-[#FFD026] border border-[#111111] rounded text-[10px] font-black"
                  >
                    Quick Fill
                  </button>
                </div>
              )}
            </div>

            <Input
              label="New Password"
              type="password"
              placeholder="At least 8 characters (letters & numbers)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4 text-[#111111]" />}
              required
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4 text-[#111111]" />}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full text-sm font-black min-h-[48px] shadow-[4px_4px_0px_#111111]"
            >
              Update Password & Sign In
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t-[2px] border-[#111111]/10 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#111111]/70 hover:text-[#111111] hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </Card>

        {/* Security footnote */}
        <div className="text-center text-xs font-bold text-[#111111]/60 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#111111]" />
          <span>Secure password update • All active sessions safely refreshed</span>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FFFDF8] flex items-center justify-center font-bold">Loading reset form...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
