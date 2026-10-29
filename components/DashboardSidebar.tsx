"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Layers,
  Calendar,
  Clock,
  ShieldCheck,
  HelpCircle,
  BookOpen,
  Award,
  Flame,
} from "lucide-react";
import { cn } from "./utils";
import { useRole } from "./RoleContext";
import { CreditPill } from "./CreditPill";
import { Avatar } from "./Avatar";

export interface DashboardSidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function DashboardSidebar({ className, onNavigate }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { role, user } = useRole();

  const getMenu = () => {
    switch (role) {
      case "coordinator":
        return [
          { label: "Review Queue", href: "/#queue", icon: Clock, count: 5 },
          { label: "Lab Resources", href: "/#resources", icon: Layers },
          { label: "Safety Certifications", href: "/#safety", icon: Award },
          { label: "Allocation Rules", href: "/rules", icon: BookOpen },
        ];
      case "admin":
        return [
          { label: "Campus Inventory", href: "/#resources", icon: Layers },
          { label: "Fair Quotas & Caps", href: "/#quotas", icon: ShieldCheck },
          { label: "Algorithmic Audit", href: "/#audit", icon: Flame },
          { label: "8 Allocation Rules", href: "/rules", icon: BookOpen },
        ];
      case "student":
      default:
        return [
          { label: "Browse Catalog", href: "/#resources", icon: Layers },
          { label: "My Requests", href: "/#requests", icon: Calendar, count: 2 },
          { label: "Team Collaborations", href: "/#teams", icon: Award },
          { label: "Fair Rules Explainer", href: "/rules", icon: BookOpen },
        ];
    }
  };

  const menuItems = getMenu();

  return (
    <aside
      className={cn(
        "w-64 bg-[#FFF8E7] border-r-[3.5px] border-[#111111] shadow-[4px_0px_0px_0px_#111111] flex flex-col justify-between py-6 px-4 h-full",
        className
      )}
    >
      <div className="space-y-6">
        {/* User Card */}
        <div className="p-4 bg-[#FFFEF2] rounded-2xl border-[3px] border-[#111111] shadow-[3px_3px_0px_#111] flex items-center gap-3">
          <Avatar name={user.name} role={role} size="md" />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-black text-[#111111] truncate">{user.name}</h4>
            <p className="text-[11px] font-bold text-[#111111]/70 capitalize">{role} Account</p>
            <div className="mt-1.5">
              <CreditPill className="text-[11px] py-0.5 px-2.5" />
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="space-y-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#111111]/70 px-3 block mb-2">
            Navigation ({role})
          </span>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all min-h-[44px] border-[2.5px]",
                  isActive
                    ? "bg-[#FFD60A] text-[#111111] border-[#111111] shadow-[3px_3px_0px_#111]"
                    : "bg-[#FFFEF2] border-[#111111]/40 hover:border-[#111111] text-[#111111] hover:bg-yellow-100/40"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 stroke-[2.5]" />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span className="text-[10px] font-black bg-[#FFD60A] border-[1.5px] border-[#111111] text-[#111111] px-2 py-0.5 rounded-full shadow-[1px_1px_0px_#111]">
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Trust & Policy link */}
      <div className="pt-4 border-t-[2.5px] border-[#111111] space-y-2">
        <Link
          href="/rules"
          onClick={onNavigate}
          className="flex items-center gap-2 text-xs font-black text-[#111111] p-2.5 rounded-2xl bg-[#FFFEF2] border-[2px] border-[#111111] shadow-[2px_2px_0px_#111] hover:bg-[#FFD60A] transition"
        >
          <HelpCircle className="w-4 h-4 stroke-[2.5]" />
          <span>Fair Allocation Guide</span>
        </Link>
      </div>
    </aside>
  );
}
