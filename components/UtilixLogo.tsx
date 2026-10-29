"use client";

import React from "react";
import { cn } from "./utils";

export interface UtilixIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  hasSparkle?: boolean;
  hasShadow?: boolean;
  isBlinking?: boolean;
  isRapidBlinking?: boolean;
  className?: string;
}

/**
 * Geometric "U" Monogram from Utilix Logo Concept 2, 3 & 6:
 * - Bold geometric 3D-styled letter U
 * - Warm cream body (#FFF9E6)
 * - Bright yellow upper accent (#FFD60A)
 * - 4px solid black outline (#000000)
 * - Deep 3D black offset extrusion/shadow (#000000)
 * - Top-right 4-point sparkle star
 * - Interactive blinking animation states
 */
export function UtilixMonogram({
  size = 64,
  hasSparkle = false,
  hasShadow = true,
  isBlinking = false,
  isRapidBlinking = false,
  className,
  ...props
}: UtilixIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "select-none overflow-visible",
        isRapidBlinking && "animate-brutal-blink-rapid",
        isBlinking && !isRapidBlinking && "animate-brutal-blink",
        className
      )}
      aria-label="Utilix U Logo"
      {...props}
    >
      {/* 3D Deep Black Extrusion / Drop Shadow */}
      {hasShadow && (
        <g transform="translate(8, 10)">
          {/* Outer shadow silhouette */}
          <path
            d="M30 22 C30 16 35 12 42 12 L56 12 C62 12 66 16 66 22 L66 66 C66 75 72 82 80 82 C88 82 94 75 94 66 L94 22 C94 16 99 12 106 12 L120 12 C126 12 131 16 131 22 L131 70 C131 98 108 120 80 120 C52 120 30 98 30 70 Z"
            fill="#000000"
          />
          {/* Shadow connecting facet for inner counter */}
          <path
            d="M66 66 C66 77 74 84 80 84 C86 84 94 77 94 66 L94 50 L66 50 Z"
            fill="#000000"
          />
        </g>
      )}

      {/* Main Front Face Container */}
      <g>
        {/* Solid Black Base Outline for Entire U */}
        <path
          d="M26 18 C26 12 31 8 38 8 L54 8 C60 8 65 12 65 18 L65 66 C65 74 72 80 80 80 C88 80 95 74 95 66 L95 18 C95 12 100 8 107 8 L123 8 C129 8 134 12 134 18 L134 68 C134 98 110 122 80 122 C50 122 26 98 26 68 Z"
          fill="#000000"
        />

        {/* Cream Body of the 'U' (#FFF9E6) */}
        <path
          d="M30 20 C30 16 33 13 38 13 L50 13 C55 13 59 16 59 20 L59 66 C59 78 68 87 80 87 C92 87 101 78 101 66 L101 50 L128 50 L128 68 C128 94 107 116 80 116 C53 116 30 94 30 68 Z"
          fill="#FFF9E6"
        />

        {/* Left Arm Upper Cream Facet */}
        <path
          d="M30 20 L59 20 L59 50 L30 50 Z"
          fill="#FFF9E6"
        />

        {/* Right Arm Upper Bright Yellow Accent (#FFD60A) */}
        <path
          d="M101 20 C101 16 104 13 109 13 L121 13 C125 13 128 16 128 20 L128 50 L101 50 Z"
          fill="#FFD60A"
          className="animate-accent-pulse"
        />

        {/* Crisp Black Division Line separating Yellow accent from Cream body */}
        <line
          x1="100"
          y1="50"
          x2="130"
          y2="50"
          stroke="#000000"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Inner Counter Outline */}
        <path
          d="M59 20 L59 66 C59 78 68 87 80 87 C92 87 101 78 101 66 L101 20"
          fill="none"
          stroke="#000000"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Left and Right Stem Inner Division Outlines */}
        <line x1="59" y1="13" x2="59" y2="20" stroke="#000000" strokeWidth="4" />
        <line x1="101" y1="13" x2="101" y2="20" stroke="#000000" strokeWidth="4" />
      </g>

      {/* 4-Point Sparkle Star at Top Right (Design 6 & Master brand) */}
      {hasSparkle && (
        <g transform="translate(122, 6)">
          {/* Sparkle Black Drop Shadow */}
          <path
            d="M14 0 C14 7.7 20.3 14 28 14 C20.3 14 14 20.3 14 28 C14 20.3 7.7 14 0 14 C7.7 14 14 7.7 14 0 Z"
            fill="#000000"
            transform="translate(3, 3)"
          />
          {/* Sparkle Front Star (Yellow with Black border) */}
          <path
            d="M14 0 C14 7.7 20.3 14 28 14 C20.3 14 14 20.3 14 28 C14 20.3 7.7 14 0 14 C7.7 14 14 7.7 14 0 Z"
            fill="#FFD60A"
            stroke="#000000"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
        </g>
      )}
    </svg>
  );
}

/**
 * Custom SVG Wordmark for "Utilix":
 * - Rendered in bold, rounded, heavy geometric sans style matching reference
 * - Cream face (#FFF9E6)
 * - Solid black border (#000000)
 * - Deep black 3D extrusion/drop shadow (#000000)
 */
export function UtilixWordmark({
  height = 36,
  hasShadow = true,
  className,
}: {
  height?: number | string;
  hasShadow?: boolean;
  className?: string;
}) {
  return (
    <svg
      height={height}
      viewBox="0 0 320 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("select-none", className)}
      aria-label="Utilix Wordmark"
    >
      {/* 3D Black Extrusion Shadow Layer */}
      {hasShadow && (
        <g transform="translate(4, 5)">
          <text
            x="4"
            y="54"
            fontFamily="var(--font-sans), 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
            fontSize="58"
            fontWeight="900"
            letterSpacing="-1.5px"
            fill="#000000"
            stroke="#000000"
            strokeWidth="10"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            Utilix
          </text>
        </g>
      )}

      {/* Solid Black Outline Base */}
      <text
        x="4"
        y="54"
        fontFamily="var(--font-sans), 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
        fontSize="58"
        fontWeight="900"
        letterSpacing="-1.5px"
        fill="#000000"
        stroke="#000000"
        strokeWidth="9"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        Utilix
      </text>

      {/* Main Cream Face of the Lettering (#FFF9E6) */}
      <text
        x="4"
        y="54"
        fontFamily="var(--font-sans), 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
        fontSize="58"
        fontWeight="900"
        letterSpacing="-1.5px"
        fill="#FFF9E6"
      >
        Utilix
      </text>

      {/* Playful Yellow Dot on the first 'i' */}
      <circle cx="152" cy="19" r="6" fill="#FFD60A" stroke="#000000" strokeWidth="2.5" />
    </svg>
  );
}

/**
 * Primary Brand Logo: Combination Mark (Design 3)
 * Stylized geometric U + Utilix wordmark
 */
export function UtilixLogo({
  variant = "horizontal",
  size = "md",
  showTagline = false,
  isBlinking = false,
  isRapidBlinking = false,
  className,
}: {
  variant?: "horizontal" | "vertical" | "icon-only" | "wordmark-only";
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  isBlinking?: boolean;
  isRapidBlinking?: boolean;
  className?: string;
}) {
  const iconSizes = {
    sm: 38,
    md: 52,
    lg: 68,
    xl: 96,
  }[size];

  const wordmarkHeights = {
    sm: 26,
    md: 36,
    lg: 48,
    xl: 64,
  }[size];

  if (variant === "icon-only") {
    return (
      <UtilixMonogram
        size={iconSizes}
        hasSparkle
        isBlinking={isBlinking}
        isRapidBlinking={isRapidBlinking}
        className={className}
      />
    );
  }

  if (variant === "wordmark-only") {
    return <UtilixWordmark height={wordmarkHeights} className={className} />;
  }

  if (variant === "vertical") {
    return (
      <div className={cn("inline-flex flex-col items-center gap-1", className)}>
        <UtilixMonogram
          size={iconSizes * 1.3}
          hasSparkle
          isBlinking={isBlinking}
          isRapidBlinking={isRapidBlinking}
        />
        <UtilixWordmark height={wordmarkHeights} />
        {showTagline && (
          <span className="text-xs sm:text-sm font-black tracking-widest uppercase bg-[#FFD60A] text-[#000000] px-2.5 py-0.5 rounded-full border-[2px] border-black shadow-[2px_2px_0px_#000] mt-1">
            Share. Use. Build.
          </span>
        )}
      </div>
    );
  }

  // Default: Horizontal Combination Mark (Design 3 from Reference)
  return (
    <div className={cn("inline-flex items-center gap-2 sm:gap-2.5 group", className)}>
      <div className="flex-shrink-0 transition-transform duration-150 group-hover:scale-105 group-hover:rotate-[-2deg]">
        <UtilixMonogram
          size={iconSizes}
          hasSparkle={false}
          isBlinking={isBlinking}
          isRapidBlinking={isRapidBlinking}
        />
      </div>
      <div className="flex flex-col justify-center">
        <UtilixWordmark height={wordmarkHeights} />
        {showTagline && (
          <span className="text-[10px] sm:text-[11px] font-black tracking-wider uppercase text-[#111111] flex items-center gap-1.5 -mt-1 pl-1">
            <span>Share</span>
            <span className="w-1 h-1 rounded-full bg-black inline-block" />
            <span>Use</span>
            <span className="w-1 h-1 rounded-full bg-black inline-block" />
            <span>Build</span>
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * App Icon: Yellow Square (Design 6)
 * - Bright yellow rounded-square background (#FFD60A)
 * - Centered geometric U symbol with cream body & yellow accent
 * - Solid black border (#000000, 3.5px)
 * - Hard black offset shadow
 * - Top-right 4-point sparkle star
 */
export function UtilixAppIcon({
  size = 64,
  hasShadow = true,
  isBlinking = false,
  isRapidBlinking = false,
  className,
}: {
  size?: number;
  hasShadow?: boolean;
  isBlinking?: boolean;
  isRapidBlinking?: boolean;
  className?: string;
}) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "relative rounded-3xl bg-[#FFD60A] border-[4px] border-[#000000] flex items-center justify-center p-2 select-none flex-shrink-0",
        hasShadow && "shadow-[6px_6px_0px_0px_#000000]",
        className
      )}
    >
      <UtilixMonogram
        size={size * 0.82}
        hasSparkle
        hasShadow={true}
        isBlinking={isBlinking}
        isRapidBlinking={isRapidBlinking}
        className="w-full h-full"
      />
    </div>
  );
}
