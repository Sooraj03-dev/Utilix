import React from "react";
import { cn } from "./utils";

export interface GeometricDecoProps {
  className?: string;
}

/**
 * Geometric decorative shape cluster matching the reference image's Memphis/Soft Brutalist art:
 * - Green square with thick border
 * - Blue triangle
 * - Coral vertical bar & half circle
 * - Dotted 3x3 grid matrix
 * - Vector pen-tool inspired curves & starbursts
 */
export function GeometricDeco({ className }: GeometricDecoProps) {
  return (
    <div
      className={cn(
        "relative pointer-events-none select-none flex items-center justify-center",
        className
      )}
      aria-hidden="true"
    >
      {/* Green square with thick black border */}
      <div className="w-10 h-10 bg-[#4ADE80] border-[3px] border-black rounded-lg shadow-[3px_3px_0px_#111] rotate-6" />

      {/* Blue triangle */}
      <div
        className="w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-b-[30px] border-b-[#38BDF8] drop-shadow-[2px_2px_0px_#111] -ml-2 -mt-4 -rotate-12"
      />

      {/* Coral pill / bar */}
      <div className="w-4 h-12 bg-[#F43F5E] border-[2.5px] border-black rounded-full shadow-[2px_2px_0px_#111] ml-2 rotate-12" />

      {/* Red crosshair / starburst */}
      <div className="relative w-5 h-5 ml-1">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] bg-[#EF4444]" />
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] bg-[#EF4444]" />
      </div>

      {/* Mini dotted grid block (3x3) */}
      <div className="grid grid-cols-3 gap-1.5 ml-2 p-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-black" />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual subtle accent badges/shapes to sprinkle in corners
 */
export function DecoPlus({ className, color = "#111111" }: { className?: string; color?: string }) {
  return (
    <div className={cn("relative w-4 h-4 pointer-events-none select-none", className)} aria-hidden="true">
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px]" style={{ backgroundColor: color }} />
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px]" style={{ backgroundColor: color }} />
    </div>
  );
}

export function DecoCircle({ className, color = "#FFD60A" }: { className?: string; color?: string }) {
  return (
    <div
      className={cn("w-4 h-4 rounded-full border-[2.5px] border-black shadow-[2px_2px_0px_#000]", className)}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

export function FloatingAddButton({
  onClick,
  label = "Quick Action",
  className,
}: {
  onClick?: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "w-14 h-14 rounded-full bg-[#FFD60A] border-[3.5px] border-black shadow-[4px_4px_0px_0px_#111] flex items-center justify-center text-black font-black text-3xl hover:bg-yellow-300 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#111] transition-all duration-100 z-30 focus:outline-none focus:ring-4 focus:ring-black",
        className
      )}
    >
      +
    </button>
  );
}
