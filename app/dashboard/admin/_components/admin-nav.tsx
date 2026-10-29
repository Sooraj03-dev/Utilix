"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Sliders,
  Sparkles,
  ScrollText,
} from "lucide-react";
import { cn } from "@/components/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "KPIs & Telemetry",
    href: "/dashboard/admin",
    icon: BarChart3,
    exact: true,
  },
  {
    label: "Allocation Policies",
    href: "/dashboard/admin/policy",
    icon: Sliders,
    exact: false,
  },
  {
    label: "AI Telemetry & Insights",
    href: "/dashboard/admin/insights",
    icon: Sparkles,
    exact: false,
  },
  {
    label: "Algorithmic Audit Log",
    href: "/dashboard/admin/audit",
    icon: ScrollText,
    exact: false,
  },
];

export function AdminNav() {
  const pathname = usePathname();

  const isActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <nav
      aria-label="Admin navigation tabs"
      className="flex flex-wrap items-center gap-2 sm:gap-3 py-3 px-1"
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm select-none transition-all duration-100 min-h-[44px]",
              "border-[2.5px] border-[#111111]",
              active
                ? "bg-[#FFD60A] text-[#111111] shadow-[3px_3px_0px_0px_#111111] translate-x-[-1px] translate-y-[-1px]"
                : "bg-white text-[#4A4A4A] hover:text-[#111111] hover:bg-[#FFF9E6] shadow-[2px_2px_0px_0px_#111111]"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

