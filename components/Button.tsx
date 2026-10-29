"use client";

import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "./utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "destructive" | "ghost" | "accent";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref
  ) => {
    // Base Soft Neo-Brutalism styles: thick black border, rounded corners, hard shadow, physical click feel
    const baseStyles =
      "inline-flex items-center justify-center font-bold tracking-tight rounded-2xl select-none transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none border-[3px] border-[#111111]";

    const variantStyles = {
      // Primary: Bright saturated yellow with hard black shadow
      primary:
        "bg-[#FFD60A] text-[#111111] shadow-[4px_4px_0px_0px_#111111] hover:bg-[#FFE033] active:translate-x-[2.5px] active:translate-y-[2.5px] active:shadow-[1.5px_1.5px_0px_0px_#111111]",
      // Secondary: Warm cream surface with hard black shadow
      secondary:
        "bg-[#FFF8E7] text-[#111111] shadow-[4px_4px_0px_0px_#111111] hover:bg-[#FFFDF5] active:translate-x-[2.5px] active:translate-y-[2.5px] active:shadow-[1.5px_1.5px_0px_0px_#111111]",
      // Outline: Off-white with hard shadow
      outline:
        "bg-[#FFFEF2] text-[#111111] shadow-[3px_3px_0px_0px_#111111] hover:bg-[#FFF8E7] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#111111]",
      // Destructive: Bold red with hard shadow
      destructive:
        "bg-[#EF4444] text-white shadow-[4px_4px_0px_0px_#111111] hover:bg-[#DC2626] active:translate-x-[2.5px] active:translate-y-[2.5px] active:shadow-[1.5px_1.5px_0px_0px_#111111]",
      // Accent: Playful cyan / sky blue like the reference geometric accent
      accent:
        "bg-[#38BDF8] text-[#111111] shadow-[4px_4px_0px_0px_#111111] hover:bg-[#7DD3FC] active:translate-x-[2.5px] active:translate-y-[2.5px] active:shadow-[1.5px_1.5px_0px_0px_#111111]",
      // Ghost: Borderless default, soft hover
      ghost:
        "border-transparent bg-transparent text-[#111111] hover:bg-[#111111]/10 active:bg-[#111111]/20",
    }[variant];

    // Sizes with guaranteed touch target >= 44px
    const sizeStyles = {
      sm: "text-xs px-3.5 py-2 min-h-[44px] gap-1.5",
      md: "text-sm px-5 py-2.5 min-h-[44px] gap-2",
      lg: "text-base px-6 py-3.5 min-h-[48px] gap-2.5",
    }[size];

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles, sizeStyles, className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" aria-hidden="true" />
        ) : (
          leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
