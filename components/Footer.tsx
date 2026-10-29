"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Sparkles, Globe } from "lucide-react";
import { UtilixLogo } from "./UtilixLogo";

export function Footer() {
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  return (
    <footer className="border-t-[3.5px] border-[#111111] bg-[#FFF8E7] text-[#111111] mt-24 shadow-[0px_-4px_0px_0px_#111111]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand & Mission */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="inline-block">
              <UtilixLogo variant="horizontal" size="md" showTagline={true} />
            </Link>
            <p className="text-sm text-[#111111]/85 font-bold max-w-md leading-relaxed mt-2">
              Utilix is the modern resource-sharing platform that makes it simple for students, researchers, and campus communities to discover, share, borrow, and utilize underutilized equipment, creative studios, and technical labs.
            </p>
            <div className="flex items-center gap-2 text-xs font-black text-[#111111] bg-[#22C55E] border-[2.5px] border-[#111111] shadow-[2.5px_2.5px_0px_#111] px-3.5 py-1.5 rounded-full w-fit">
              <span className="w-2.5 h-2.5 rounded-full bg-black animate-pulse" />
              <span>Utilix Fairness Engine Operational • Share. Use. Build.</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-black text-[#111111] uppercase tracking-wider mb-4 bg-[#FFD60A] border-[2px] border-[#111111] px-2.5 py-1 rounded-xl w-fit shadow-[2px_2px_0px_#111]">
              Platform & Rules
            </h4>
            <ul className="space-y-2.5 text-sm font-bold">
              <li>
                <Link href="/rules" className="text-[#111111] hover:underline transition">
                  8 Fair Allocation Rules
                </Link>
              </li>
              <li>
                <Link href="/#resources" className="text-[#111111] hover:underline transition">
                  Browse Shared Equipment
                </Link>
              </li>
              <li>
                <Link href="/#hybrid-model" className="text-[#111111] hover:underline transition">
                  Hybrid Access & Credits
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-[#111111] hover:underline transition">
                  Demo Role Switcher
                </Link>
              </li>
            </ul>
          </div>

          {/* University Trust & Standards */}
          <div>
            <h4 className="text-xs font-black text-[#111111] uppercase tracking-wider mb-4 bg-[#38BDF8] border-[2px] border-[#111111] px-2.5 py-1 rounded-xl w-fit shadow-[2px_2px_0px_#111]">
              Governance
            </h4>
            <ul className="space-y-2.5 text-sm font-bold">
              <li className="flex items-center gap-2 text-[#111111]">
                <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                <span>Zero Out-of-Pocket Cost</span>
              </li>
              <li className="flex items-center gap-2 text-[#111111]">
                <Sparkles className="w-4 h-4 stroke-[2.5]" />
                <span>Cross-Faculty Team Boost</span>
              </li>
              <li className="flex items-center gap-2 text-[#111111]">
                <Globe className="w-4 h-4 stroke-[2.5]" />
                <span>Open Community Standards</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 mt-8 border-t-[2.5px] border-[#111111] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-[#111111]/70">
          <p>© {new Date().getFullYear()} Utilix Platform. All rights reserved. Share. Use. Build.</p>
          <p className="flex items-center gap-1 text-[#111111]">
            Utilix Soft Neo-Brutalism Design System
          </p>
        </div>
      </div>
    </footer>
  );
}
