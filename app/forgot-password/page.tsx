"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft, ShieldCheck, AlertCircle, KeyRound } from "lucide-react";
import { Button, Card, Input, UtilixWordmark } from "@/components";
import { useToast } from "@/components/ToastContext";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { error: toastError, success: toastSuccess } = useToast();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your registered university email.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to process request.");
        toastError(data.error || "Failed to process request.");
        return;
      }

      toastSuccess(
        "Verification code sent! Please check your campus email.",
        "Recovery Code Sent"
      );

      router.push(`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`);
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
            <span>Account Recovery</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
            Forgot Your Password?
          </h1>
          <p className="text-xs sm:text-sm font-bold text-[#111111]/70 max-w-sm mx-auto">
            Enter your university email address. We will send a 6-digit verification code to reset your password.
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

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Campus Email Address"
              type="email"
              placeholder="yourname@university.edu"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              leftIcon={<Mail className="w-4 h-4 text-[#111111]" />}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full text-sm font-black min-h-[48px] shadow-[4px_4px_0px_#111111]"
            >
              Send Password Reset Code
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
          <span>Secure single-use OTP reset • Anti-enumeration protection</span>
        </div>
      </div>
    </div>
  );
}
