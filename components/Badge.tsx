import React from "react";
import { Sparkles, Coins, GraduationCap, Flame, ShieldAlert } from "lucide-react";
import { cn } from "./utils";

export type BadgeVariant =
  | "free"
  | "credits"
  | "training_required"
  | "high_demand"
  | "neutral";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: BadgeVariant;
  cost?: number;
  label?: string;
  size?: "sm" | "md";
}

export function Badge({
  variant,
  cost,
  label,
  size = "md",
  className,
  ...props
}: BadgeProps) {
  const getBadgeDetails = () => {
    switch (variant) {
      case "free":
        return {
          text: label || "Free Baseline",
          icon: Sparkles,
          bgClass: "bg-[#4ADE80] text-[#111111]",
        };
      case "credits":
        return {
          text: label || (cost ? `${cost} Credits` : "Credits Required"),
          icon: Coins,
          bgClass: "bg-[#FFD60A] text-[#111111]",
        };
      case "training_required":
        return {
          text: label || "Safety Training Required",
          icon: GraduationCap,
          bgClass: "bg-[#C084FC] text-[#111111]",
        };
      case "high_demand":
        return {
          text: label || "High Demand",
          icon: Flame,
          bgClass: "bg-[#F43F5E] text-white",
        };
      case "neutral":
      default:
        return {
          text: label || "Standard",
          icon: ShieldAlert,
          bgClass: "bg-[#FFF8E7] text-[#111111]",
        };
    }
  };

  const { text, icon: Icon, bgClass } = getBadgeDetails();

  const sizeClasses =
    size === "sm"
      ? "text-[10px] px-2.5 py-0.5 gap-1"
      : "text-xs px-3 py-1 gap-1.5";

  return (
    <span
      className={cn(
        "inline-flex items-center font-black rounded-xl border-[2.5px] border-[#111111] shadow-[2px_2px_0px_#111111] tracking-wider uppercase font-mono select-none",
        bgClass,
        sizeClasses,
        className
      )}
      {...props}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0 stroke-[2.5]" />
      <span>{text}</span>
    </span>
  );
}
