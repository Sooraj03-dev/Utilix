"use client";

import React, { forwardRef } from "react";
import { cn } from "./utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={generatedId}
            className="block text-xs sm:text-sm font-black text-[#111111] uppercase tracking-wide"
          >
            {label}
          </label>
        )}
        <div className="relative rounded-2xl">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#111111]">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={generatedId}
            disabled={disabled}
            className={cn(
              "w-full rounded-2xl border-[3px] border-[#111111] bg-[#FFFEF2] px-3.5 py-2.5 text-sm font-semibold text-[#111111] placeholder:text-[#111111]/40 shadow-[3px_3px_0px_0px_#111111] min-h-[44px] transition-all duration-100 focus:outline-none focus:shadow-[4px_4px_0px_0px_#111111] disabled:opacity-50 disabled:bg-[#E5DCC5]",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error && "border-[#EF4444] bg-[#EF4444]/10 text-[#EF4444]",
              className
            )}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error
                ? `${generatedId}-error`
                : helperText
                ? `${generatedId}-desc`
                : undefined
            }
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#111111]">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p id={`${generatedId}-error`} className="text-xs text-[#EF4444] font-black">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${generatedId}-desc`} className="text-xs text-[#111111]/70 font-medium">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
