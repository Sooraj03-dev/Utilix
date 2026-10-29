"use client";

import React, { useState, useEffect, useRef } from "react";
import { UtilixMonogram, UtilixWordmark } from "./UtilixLogo";
import { cn } from "./utils";

export interface StartupScreenProps {
  onComplete?: () => void;
  durationMs?: number; // Defaults to 1900ms (within the 1.5-2.5s requirement)
  className?: string;
}

export function StartupScreen({
  onComplete,
  durationMs = 1900,
  className,
}: StartupScreenProps) {
  const [progress, setProgress] = useState(10);
  const [isDismissing, setIsDismissing] = useState(false);
  const hasTriggeredRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const startTime = Date.now();
    const intervalMs = 40;

    // Smoothly increment progress bar up to 100%
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const calculatedProgress = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setProgress(calculatedProgress);

      if (calculatedProgress >= 100) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, intervalMs);

    // Auto-transition once duration has elapsed
    timerRef.current = setTimeout(() => {
      if (hasTriggeredRef.current) return;
      hasTriggeredRef.current = true;

      setIsDismissing(true);

      // Allow 300ms for smooth exit fade-out before notifying parent
      setTimeout(() => {
        try {
          onComplete?.();
        } catch (err) {
          console.warn("StartupScreen onComplete error:", err);
        }
      }, 300);
    }, durationMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [durationMs, onComplete]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-[#FFD60A] select-none transition-all duration-300 overflow-hidden",
        isDismissing ? "opacity-0 scale-[1.02] pointer-events-none" : "opacity-100 scale-100",
        className
      )}
      style={{
        backgroundImage: "radial-gradient(rgba(17, 17, 17, 0.22) 1.5px, transparent 1.5px)",
        backgroundSize: "20px 20px",
      }}
      role="status"
      aria-live="polite"
      aria-label="Utilix Startup Screen"
    >
      {/* Floating Memphis Geometric Accents (Utilix Visual Identity) */}
      <div className="absolute top-1/4 left-8 sm:left-24 pointer-events-none hidden sm:block">
        <div className="w-12 h-12 rounded-2xl bg-[#4ADE80] border-[3px] border-black shadow-[3px_3px_0px_#000] rotate-[-12deg]" />
      </div>
      <div className="absolute top-1/5 right-8 sm:right-24 pointer-events-none hidden sm:block">
        <div className="w-10 h-10 rounded-full bg-[#38BDF8] border-[3px] border-black shadow-[3px_3px_0px_#000] rotate-[15deg]" />
      </div>
      <div className="absolute bottom-1/4 left-10 sm:left-28 pointer-events-none hidden sm:block">
        <div className="w-8 h-14 rounded-full bg-[#F43F5E] border-[3px] border-black shadow-[3px_3px_0px_#000] rotate-[8deg]" />
      </div>

      {/* Centered Brand Showcase */}
      <div className="relative flex flex-col items-center text-center max-w-sm sm:max-w-md w-full z-20 space-y-6">
        {/* Animated U Monogram Logo with Gentle Opacity/Glow Pulse */}
        <div className="relative p-2 flex items-center justify-center">
          <div className="animate-gentle-pulse">
            <UtilixMonogram
              size={135}
              hasSparkle={true}
              hasShadow={true}
              className="drop-shadow-[4px_4px_0px_#000000]"
            />
          </div>
        </div>

        {/* Wordmark and Tagline */}
        <div className="flex flex-col items-center space-y-2.5">
          <UtilixWordmark height={40} hasShadow={true} />
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFEF2] border-[2px] border-[#111111] shadow-[2px_2px_0px_#111] text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[#111111]">
            <span>SHARE.</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#111111]" />
            <span>USE.</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#111111]" />
            <span>BUILD.</span>
          </div>
        </div>

        {/* Loading Progress Bar & Message (No Enter button) */}
        <div className="w-full max-w-[260px] sm:max-w-[280px] space-y-2 pt-2">
          {/* Progress bar track */}
          <div className="w-full h-3 rounded-full bg-[#FFFEF2] border-[2.5px] border-[#111111] shadow-[2px_2px_0px_#111] p-0.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#111111] transition-all duration-75 ease-out"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>

          {/* Subtext */}
          <p className="text-xs font-black text-[#111111] tracking-tight animate-pulse">
            Preparing your campus experience...
          </p>
        </div>
      </div>
    </div>
  );
}
