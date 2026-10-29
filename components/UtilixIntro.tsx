"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { UtilixMonogram, UtilixWordmark } from "./UtilixLogo";
import { cn } from "./utils";

export interface UtilixIntroProps {
  onComplete?: () => void;
  autoDismissMs?: number;
}

export function UtilixIntro({
  onComplete,
  autoDismissMs,
}: UtilixIntroProps) {
  // Always visible on browser entry / refresh
  const [isVisible, setIsVisible] = useState(true);
  const [isEntering, setIsEntering] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [progress, setProgress] = useState(15);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clean up any stale sessionStorage keys from previous builds
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("utilix_intro_seen");
    }

    // Smooth progress bar increment from 15% to 95%
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
          return 95;
        }
        return prev + 5;
      });
    }, 100);

    // Only auto-dismiss if autoDismissMs is explicitly passed
    let autoTimer: NodeJS.Timeout | null = null;
    if (autoDismissMs && autoDismissMs > 0) {
      autoTimer = setTimeout(() => {
        triggerEnterSequence();
      }, autoDismissMs);
    }

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (autoTimer) clearTimeout(autoTimer);
    };
  }, [autoDismissMs]);

  const triggerEnterSequence = () => {
    if (isEntering || isDismissing) return;
    
    // Stop continuous progress and jump to 100%
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setProgress(100);

    // 1. Trigger rapid blinking on the U logo
    setIsEntering(true);

    // 2. After rapid blinking sequence (600ms), smoothly dismiss
    setTimeout(() => {
      setIsDismissing(true);
      setTimeout(() => {
        setIsVisible(false);
        setIsEntering(false);
        setIsDismissing(false);
        onComplete?.();
      }, 400);
    }, 650);
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-[#FFD60A] select-none transition-all duration-400 overflow-hidden",
        isDismissing ? "opacity-0 -translate-y-8 pointer-events-none scale-105" : "opacity-100 translate-y-0"
      )}
      style={{
        backgroundImage: "radial-gradient(rgba(17, 17, 17, 0.22) 1.5px, transparent 1.5px)",
        backgroundSize: "20px 20px",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Utilix Brand Entry Animation"
    >
      {/* Top-Right "Enter Utilix" Action Button */}
      <div className="absolute top-6 right-6 z-30">
        <button
          type="button"
          onClick={triggerEnterSequence}
          disabled={isEntering}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#FFF9E6] border-[3px] border-[#000000] shadow-[3.5px_3.5px_0px_#000000] text-xs font-black text-[#111111] hover:bg-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1.5px_1.5px_0px_#000000] transition-all focus:outline-none focus:ring-4 focus:ring-black",
            isEntering && "bg-[#4ADE80] scale-105 shadow-[2px_2px_0px_#000]"
          )}
        >
          <span>{isEntering ? "Entering..." : "Enter Utilix"}</span>
          <ArrowRight className="w-4 h-4 stroke-[3]" />
        </button>
      </div>

      {/* Main Centered Brand Showcase */}
      <div className="relative flex flex-col items-center text-center max-w-lg w-full z-20">
        {/* Floating Memphis Accents */}
        <div className="absolute -top-12 -left-8 pointer-events-none">
          <div className="w-12 h-12 rounded-2xl bg-[#4ADE80] border-[3px] border-black shadow-[3px_3px_0px_#000] rotate-[-12deg]" />
        </div>
        <div className="absolute -top-6 -right-8 pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-[#38BDF8] border-[3px] border-black shadow-[3px_3px_0px_#000] rotate-[15deg]" />
        </div>
        <div className="absolute -bottom-8 -left-6 pointer-events-none">
          <div className="w-8 h-14 rounded-full bg-[#F43F5E] border-[3px] border-black shadow-[3px_3px_0px_#000] rotate-[8deg]" />
        </div>

        {/* 
          THE CENTRALLY VISIBLE, BLINKING U LOGO:
          - Recreated directly from Concept 2, 3 & 6 in reference image
          - Blinks visibly on website open (animate-brutal-blink)
          - Blinks rapidly when 'Enter Utilix' is clicked (animate-brutal-blink-rapid)
          - Never hidden behind background or loading bar
        */}
        <div className="relative p-3 flex items-center justify-center">
          <div className="relative">
            <UtilixMonogram
              size={150}
              hasSparkle={true}
              hasShadow={true}
              isBlinking={!isEntering}
              isRapidBlinking={isEntering}
              className="drop-shadow-[4px_4px_0px_#000000]"
            />
          </div>
        </div>

        {/* Utilix Wordmark */}
        <div className="mt-3">
          <UtilixWordmark height={54} />
        </div>

        {/* Tagline Badges: Share. Use. Build. */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="px-3.5 py-1.5 rounded-2xl bg-[#FFF9E6] border-[2.5px] border-[#000000] shadow-[3px_3px_0px_#000] text-xs sm:text-sm font-black text-[#000000] tracking-wider uppercase">
            Share.
          </span>
          <span className="px-3.5 py-1.5 rounded-2xl bg-[#38BDF8] border-[2.5px] border-[#000000] shadow-[3px_3px_0px_#000] text-xs sm:text-sm font-black text-[#000000] tracking-wider uppercase">
            Use.
          </span>
          <span className="px-3.5 py-1.5 rounded-2xl bg-[#4ADE80] border-[2.5px] border-[#000000] shadow-[3px_3px_0px_#000] text-xs sm:text-sm font-black text-[#000000] tracking-wider uppercase">
            Build.
          </span>
        </div>

        {/* Status text */}
        <p className="mt-3 text-xs font-black text-[#000000]/80 tracking-tight">
          {isEntering ? "✨ Welcome to Utilix!" : "Discover, Share & Borrow Campus Equipment"}
        </p>

        {/* Neo-Brutalist Loading Bar - Actively Filling */}
        <div className="mt-6 w-52 h-4 bg-[#FFF9E6] border-[2.5px] border-[#000000] rounded-full overflow-hidden p-0.5 shadow-[3px_3px_0px_#000]">
          <div
            className="h-full bg-[#000000] rounded-full transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Small Replay Button component for judges and users to re-trigger the brand intro anytime
 */
export function ReplayIntroButton({ onReplay }: { onReplay: () => void }) {
  return (
    <button
      type="button"
      onClick={onReplay}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF9E6] hover:bg-[#FFD60A] text-[#000000] border-[2px] border-[#000000] shadow-[2px_2px_0px_#000] text-xs font-black transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
      title="Replay the animated Utilix brand intro"
    >
      <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
      <span>Intro</span>
    </button>
  );
}
