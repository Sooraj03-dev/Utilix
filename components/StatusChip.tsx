import React from "react";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Slash,
  Wrench,
  CalendarCheck,
} from "lucide-react";
import { cn } from "./utils";
import { ResourceStatus } from "./types";

interface StatusConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  bgClass: string;
  iconClass: string;
}

const STATUS_CONFIGS: Record<ResourceStatus, StatusConfig> = {
  available: {
    label: "Available",
    icon: CheckCircle,
    bgClass: "bg-[#22C55E] text-[#111111]",
    iconClass: "text-[#111111]",
  },
  confirmed: {
    label: "Confirmed",
    icon: CheckCircle,
    bgClass: "bg-[#22C55E] text-[#111111]",
    iconClass: "text-[#111111]",
  },
  pending: {
    label: "Pending Review",
    icon: Clock,
    bgClass: "bg-[#F59E0B] text-[#111111]",
    iconClass: "text-[#111111]",
  },
  waitlisted: {
    label: "Waitlisted",
    icon: Clock,
    bgClass: "bg-[#F59E0B] text-[#111111]",
    iconClass: "text-[#111111]",
  },
  blocked: {
    label: "Blocked",
    icon: Slash,
    bgClass: "bg-[#EF4444] text-white",
    iconClass: "text-white",
  },
  maintenance: {
    label: "Under Maintenance",
    icon: Wrench,
    bgClass: "bg-[#EF4444] text-white",
    iconClass: "text-white",
  },
  rejected: {
    label: "Declined",
    icon: XCircle,
    bgClass: "bg-[#EF4444] text-white",
    iconClass: "text-white",
  },
  booked: {
    label: "Booked",
    icon: CalendarCheck,
    bgClass: "bg-[#D1D5DB] text-[#111111]",
    iconClass: "text-[#111111]",
  },
};

export interface StatusChipProps {
  status: ResourceStatus;
  customLabel?: string;
  size?: "sm" | "md";
  className?: string;
}

export function StatusChip({
  status,
  customLabel,
  size = "md",
  className,
}: StatusChipProps) {
  const config = STATUS_CONFIGS[status] || STATUS_CONFIGS.available;
  const Icon = config.icon;
  const displayText = customLabel || config.label;

  const sizeClasses =
    size === "sm"
      ? "text-[11px] px-2.5 py-1 gap-1.5"
      : "text-xs sm:text-sm px-3.5 py-1.5 gap-2";

  return (
    <span
      className={cn(
        "inline-flex items-center font-black rounded-full border-[2.5px] border-[#111111] shadow-[2.5px_2.5px_0px_#111111] select-none tracking-tight",
        config.bgClass,
        sizeClasses,
        className
      )}
      role="status"
      aria-label={`Status: ${displayText}`}
    >
      <Icon className={cn("w-3.5 h-3.5 flex-shrink-0 stroke-[2.5]", config.iconClass)} />
      <span className="truncate">{displayText}</span>
    </span>
  );
}
