import {
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Slash,
  Wrench,
  CalendarCheck,
  PackageCheck,
  CheckCheck,
  Sparkles,
  ShieldAlert,
  Send,
  FileCheck2,
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
  approved: {
    label: "Approved",
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
  pending_approval: {
    label: "Awaiting Coordinator",
    icon: ShieldAlert,
    bgClass: "bg-[#F59E0B] text-[#111111]",
    iconClass: "text-[#111111]",
  },
  waitlisted: {
    label: "Waitlisted",
    icon: Clock,
    bgClass: "bg-[#F59E0B] text-[#111111]",
    iconClass: "text-[#111111]",
  },
  allocated: {
    label: "Allocated",
    icon: Sparkles,
    bgClass: "bg-[#4ADE80] text-[#111111]",
    iconClass: "text-[#111111]",
  },
  eligibility_passed: {
    label: "Eligible",
    icon: FileCheck2,
    bgClass: "bg-[#38BDF8] text-[#111111]",
    iconClass: "text-[#111111]",
  },
  submitted: {
    label: "Submitted",
    icon: Send,
    bgClass: "bg-[#FFD60A] text-[#111111]",
    iconClass: "text-[#111111]",
  },
  checked_out: {
    label: "Checked Out",
    icon: PackageCheck,
    bgClass: "bg-[#38BDF8] text-[#111111]",
    iconClass: "text-[#111111]",
  },
  returned: {
    label: "Returned",
    icon: CheckCheck,
    bgClass: "bg-[#22C55E] text-[#111111]",
    iconClass: "text-[#111111]",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    bgClass: "bg-[#9CA3AF] text-white",
    iconClass: "text-white",
  },
  no_show: {
    label: "No Show",
    icon: AlertTriangle,
    bgClass: "bg-[#EF4444] text-white",
    iconClass: "text-white",
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
