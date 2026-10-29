import React from "react";
import { cn } from "./utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-[#E5DCC5] border-[2.5px] border-[#111111]",
        className
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

export function ResourceCardSkeleton() {
  return (
    <div className="bg-[#FFF8E7] rounded-3xl border-[3.5px] border-[#111111] p-5 shadow-[5px_5px_0px_#111] space-y-4">
      <Skeleton className="h-44 w-full rounded-2xl" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24 rounded-lg" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
      <Skeleton className="h-7 w-3/4 rounded-lg" />
      <Skeleton className="h-4 w-full rounded-md" />
      <Skeleton className="h-4 w-5/6 rounded-md" />
      <div className="pt-3 flex items-center justify-between border-t-[2.5px] border-[#111111]">
        <Skeleton className="h-6 w-16 rounded-md" />
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
    </div>
  );
}

export function RequestRowSkeleton() {
  return (
    <div className="p-4 bg-[#FFF8E7] rounded-2xl border-[3px] border-[#111111] shadow-[3px_3px_0px_#111] flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-3 w-24 rounded-md" />
        </div>
      </div>
      <Skeleton className="h-8 w-24 rounded-full" />
    </div>
  );
}
