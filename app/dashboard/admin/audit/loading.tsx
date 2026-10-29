import React from "react";
import { Skeleton } from "@/components/Skeleton";

export default function AuditLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-2xl border-[3px] border-[#111111] bg-white p-6 shadow-[4px_4px_0px_0px_#111111]">
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-8 w-80 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="rounded-2xl border-[3px] border-[#111111] bg-white p-6 shadow-[4px_4px_0px_0px_#111111]">
        <Skeleton className="h-6 w-64 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      <div className="rounded-2xl border-[3px] border-[#111111] bg-white p-6 shadow-[4px_4px_0px_0px_#111111] space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
