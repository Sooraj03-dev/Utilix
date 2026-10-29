"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Mail,
  RefreshCw,
  ArrowRight,
  AlertCircle,
  Clock,
  Sparkles,
  Terminal,
} from "lucide-react";
import {
  Button,
  Card,
  UtilixWordmark,
} from "@/components";
import { useToast } from "@/components/ToastContext";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { error: toastError, success: toastSuccess, info: toastInfo } = useToast();

  const emailParam = searchParams.get("email") || "";
  const flowType = searchParams.get("type") || "registration";

  const [email, setEmail] = useState(emailParam);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 5-minute expiry countdown (300 seconds)
  const [secondsRemaining, setSecondsRemaining] = useState(300);
  // 60-second resend cooldown
  const [resendCooldown, setResendCooldown] = useState(60);

  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  // Expiry countdown timer
  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsRemaining]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // In local dev, fetch dev OTP for easy testing
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
  }, [email, resendCooldown]);

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    // Handle single digit
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);
    setErrorMessage(null);

    // Auto-advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setOtpDigits(newDigits);
    setErrorMessage(null);

    const targetIndex = Math.min(pasted.length, 5);
    inputRefs.current[targetIndex]?.focus();
  };

  const handleFillDevOtp = () => {
    if (!devOtpHint) return;
    const digits = devOtpHint.split("").slice(0, 6);
    setOtpDigits(digits);
    setErrorMessage(null);
    toastInfo(`Auto-filled development OTP: ${devOtpHint}`);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpDigits.join("");

    if (fullOtp.length !== 6) {
      setErrorMessage("Please enter all 6 digits of the verification code.");
      return;
    }

    if (secondsRemaining <= 0) {
      setErrorMessage("Verification code expired. Please click 'Resend Code'.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: fullOtp,
          type: flowType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Verification failed.");
        toastError(data.error || "Verification failed.", "Code Verification");
        return;
      }

      toastSuccess(
        "Account verified and created successfully! You can now sign in.",
        "Verification Complete"
      );

      // Redirect to login with confirmation
      router.push(`/login?verified=true&email=${encodeURIComponent(email)}`);
    } catch (err) {
      console.error(err);
      setErrorMessage("Network error during verification. Please try again.");
      toastError("Could not connect to server.", "Network Error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          type: flowType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Failed to resend code.");
        toastError(data.error || "Resend failed.");
        return;
      }

      toastSuccess("A new 6-digit verification code has been dispatched to your email.", "Code Sent");
      setOtpDigits(["", "", "", "", "", ""]);
      setSecondsRemaining(300); // Reset 5m timer
      setResendCooldown(60); // Reset 60s cooldown
      inputRefs.current[0]?.focus();
    } catch (err) {
      console.error(err);
      toastError("Network error attempting to resend code.");
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
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
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Email OTP Verification</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
            Check Your Email
          </h1>
          <p className="text-xs sm:text-sm font-bold text-[#111111]/70 max-w-sm mx-auto">
            We sent a 6-digit security code to:
          </p>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#FFF9D2] border-[1.5px] border-[#111111] rounded-xl text-xs font-black text-[#111111]">
            <Mail className="w-3.5 h-3.5 text-[#111111]" />
            <span>{email || "your campus email"}</span>
          </div>
        </div>

        {/* Card Container */}
        <Card className="bg-[#FFFFFF] p-6 sm:p-8 border-[2px] border-[#111111] shadow-[6px_6px_0px_#111111] rounded-3xl">
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border-[2px] border-red-500 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs font-bold text-red-800">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            {/* 6 Digit Input Group */}
            <div>
              <label className="block text-center text-xs font-black uppercase text-[#111111] tracking-wider mb-3">
                Enter 6-Digit Verification Code
              </label>
              <div className="flex justify-between gap-2 sm:gap-2.5" onPaste={handlePaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-black text-[#111111] bg-[#FFFEF9] border-[2px] border-[#111111] rounded-2xl shadow-[2px_2px_0px_#111111] focus:bg-[#FFF9D2] focus:border-[#111111] focus:ring-2 focus:ring-[#FFD026] focus:outline-none transition-all"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>
            </div>

            {/* Countdown / Expiry Timer */}
            <div className="flex items-center justify-between text-xs font-bold text-[#111111]/70 px-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#111111]" />
                <span>Expires in:</span>
                <span className={`font-black ${secondsRemaining < 60 ? "text-red-600" : "text-[#111111]"}`}>
                  {formatTime(secondsRemaining)}
                </span>
              </div>

              {/* Resend Action */}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || isResending}
                className="text-[#111111] font-black underline hover:text-[#D97706] disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isResending ? "animate-spin" : ""}`} />
                <span>
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                </span>
              </button>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              disabled={otpDigits.join("").length !== 6 || secondsRemaining <= 0}
              className="w-full text-sm font-black min-h-[48px] shadow-[4px_4px_0px_#111111]"
            >
              Verify & Complete Registration
            </Button>
          </form>

          {/* Local Development Mode Helper */}
          {devOtpHint && (
            <div className="mt-6 p-3 bg-amber-50 border-[2px] border-amber-400 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-900">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Dev Mode OTP Available</span>
                </div>
                <button
                  type="button"
                  onClick={handleFillDevOtp}
                  className="px-2 py-0.5 bg-[#FFD026] border-[1px] border-[#111111] rounded text-[10px] font-black text-[#111111] hover:bg-[#F59E0B]"
                >
                  Quick Fill ({devOtpHint})
                </button>
              </div>
              <p className="text-[11px] font-medium text-amber-800 leading-snug">
                Local dev adapter captured OTP <strong>{devOtpHint}</strong>. Click Quick Fill to test instantly without email setup.
              </p>
            </div>
          )}

          {/* Return to Registration */}
          <div className="mt-6 pt-6 border-t-[2px] border-[#111111]/10 text-center">
            <Link
              href="/register"
              className="text-xs font-bold text-[#111111]/70 hover:text-[#111111] hover:underline"
            >
              ← Back to Registration
            </Link>
          </div>
        </Card>

        {/* Security footnote */}
        <div className="text-center text-xs font-bold text-[#111111]/60 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#111111]" />
          <span>Single-use OTP • 5-minute expiry • 5 max attempts</span>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FFFDF8] flex items-center justify-center font-bold">Loading verification...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
