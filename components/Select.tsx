"use client";

import React, { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "./utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      options,
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
          <select
            ref={ref}
            id={generatedId}
            disabled={disabled}
            className={cn(
              "w-full appearance-none rounded-2xl border-[3px] border-[#111111] bg-[#FFFEF2] px-3.5 py-2.5 pr-10 text-sm font-bold text-[#111111] shadow-[3px_3px_0px_0px_#111111] min-h-[44px] transition-all duration-100 focus:outline-none focus:shadow-[4px_4px_0px_0px_#111111] disabled:opacity-50 disabled:bg-[#E5DCC5]",
              error && "border-[#EF4444] bg-[#EF4444]/10 text-[#EF4444]",
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#111111]">
            <ChevronDown className="w-5 h-5 stroke-[3]" />
          </div>
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

Select.displayName = "Select";
