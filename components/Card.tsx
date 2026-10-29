import React from "react";
import { cn } from "./utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
  variant?: "cream" | "white" | "yellow" | "accent";
}

export function Card({
  className,
  hoverEffect = false,
  variant = "cream",
  children,
  ...props
}: CardProps) {
  const bgStyles = {
    cream: "bg-[#FFF8E7]",
    white: "bg-[#FFFEF2]",
    yellow: "bg-[#FFD60A]",
    accent: "bg-[#38BDF8]",
  }[variant];

  return (
    <div
      className={cn(
        "rounded-3xl border-[3.5px] border-[#111111] text-[#111111] shadow-[5px_5px_0px_0px_#111111] transition-all duration-150 overflow-hidden",
        bgStyles,
        hoverEffect && "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0px_0px_#111111]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-5 sm:p-6 pb-3", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg sm:text-xl font-black text-[#111111] tracking-tight leading-snug", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-xs sm:text-sm text-[#111111]/80 mt-1 font-medium leading-relaxed", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-5 sm:p-6 pt-1", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "p-5 sm:p-6 pt-3 border-t-[3px] border-[#111111] bg-[#FFF8E7]/90 flex items-center justify-between",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
