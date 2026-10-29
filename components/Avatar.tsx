import React from "react";
import { cn } from "./utils";
import { Role } from "./types";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  role?: Role;
  src?: string;
  size?: "sm" | "md" | "lg";
}

export function Avatar({
  name,
  role,
  src,
  size = "md",
  className,
  ...props
}: AvatarProps) {
  const getInitials = (str: string) => {
    return str
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-11 h-11 text-sm",
    lg: "w-14 h-14 text-base",
  }[size];

  const roleIndicatorColor = {
    student: "bg-[#22C55E]",
    coordinator: "bg-[#38BDF8]",
    admin: "bg-[#C084FC]",
  }[role || "student"];

  return (
    <div className={cn("relative inline-block flex-shrink-0 select-none", className)} {...props}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn(
            "rounded-full object-cover border-[2.5px] border-[#111111] shadow-[2px_2px_0px_#111]",
            sizeClasses
          )}
        />
      ) : (
        <div
          className={cn(
            "rounded-full bg-[#FFD60A] text-[#111111] font-black flex items-center justify-center border-[2.5px] border-[#111111] shadow-[2.5px_2.5px_0px_#111]",
            sizeClasses
          )}
          aria-label={name}
        >
          {getInitials(name)}
        </div>
      )}

      {role && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block rounded-full border-[2px] border-[#111111] shadow-[1px_1px_0px_#111]",
            roleIndicatorColor,
            size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"
          )}
          title={`Role: ${role}`}
        />
      )}
    </div>
  );
}
