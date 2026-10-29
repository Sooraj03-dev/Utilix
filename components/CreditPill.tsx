"use client";

import React, { useState } from "react";
import { Coins, Info, Sparkles, AlertCircle } from "lucide-react";
import { cn } from "./utils";
import { useRole } from "./RoleContext";

export interface CreditPillProps {
  className?: string;
  showModalOnClick?: boolean;
}

export function CreditPill({
  className,
  showModalOnClick = true,
}: CreditPillProps) {
  const { user, role } = useRole();
  const [showTooltip, setShowTooltip] = useState(false);

  const isPrivileged = role === "coordinator" || role === "admin";

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => showModalOnClick && setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={cn(
          "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-black transition-all duration-100 border-[2.5px] border-[#111111] shadow-[3px_3px_0px_#111111] min-h-[44px] sm:min-h-0 focus:outline-none focus:ring-2 focus:ring-black active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-[1.5px_1.5px_0px_#111111]",
          user.credits <= 2
            ? "bg-[#F59E0B] text-[#111111]"
            : "bg-[#FFF8E7] text-[#111111] hover:bg-[#FFFEF2]",
          className
        )}
        aria-label={`Current balance: ${isPrivileged ? "Unlimited" : `${user.credits} credits`}`}
      >
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#FFD60A] border-[2px] border-[#111111] text-[#111111] flex-shrink-0">
          <Coins className="w-3.5 h-3.5 stroke-[2.5]" />
        </span>
        <span className="tabular-nums font-mono font-bold tracking-tight">
          {isPrivileged ? "Staff Pass" : `${user.credits} credits`}
        </span>
        <Info className="w-3.5 h-3.5 text-[#111111] stroke-[2.5]" />
      </button>

      {/* Popover Card in Neo-Brutalism */}
      {showTooltip && (
        <div
          role="tooltip"
          className="absolute right-0 top-full mt-2 w-72 p-4 bg-[#FFF8E7] rounded-3xl border-[3.5px] border-[#111111] shadow-[6px_6px_0px_0px_#111111] z-50 text-left animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between pb-2 border-b-[2.5px] border-[#111111]">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#111111]">
              Campus Fair Quota
            </span>
            <span className="text-[10px] bg-[#FFD60A] text-[#111111] border-[1.5px] border-[#111111] px-2 py-0.5 rounded-full font-bold">
              {isPrivileged ? "Staff" : `${user.credits}/${user.maxCredits} Max`}
            </span>
          </div>

          <p className="text-xs text-[#111111] font-medium mt-2 leading-relaxed">
            Credits allocate high-demand gear fairly. Every student gets a free Monday refill, plus bonuses for on-time returns.
          </p>

          <div className="mt-3 space-y-2 text-xs font-semibold text-[#111111]">
            <div className="flex items-center gap-2 p-1.5 bg-[#4ADE80] rounded-xl border-[2px] border-[#111111]">
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0 stroke-[2.5]" />
              <span>+3 credits replenish every Monday</span>
            </div>
            <div className="flex items-center gap-2 p-1.5 bg-[#38BDF8] rounded-xl border-[2px] border-[#111111]">
              <Coins className="w-3.5 h-3.5 flex-shrink-0 stroke-[2.5]" />
              <span>Full credit refund on early cancel</span>
            </div>
          </div>

          {user.credits <= 2 && (
            <div className="mt-3 p-2 bg-[#EF4444] text-white rounded-xl border-[2px] border-[#111111] flex items-start gap-2 text-[11px] font-bold">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 stroke-[2.5]" />
              <span>Low balance. Free baseline tools remain available at 0 credits!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
