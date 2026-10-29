import React from "react";
import { Skeleton } from "@/components/Skeleton";

export default function PolicyLoading() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Skeleton className="lg:col-span-7 h-[600px] w-full rounded-2xl" />
        <Skeleton className="lg:col-span-5 h-[600px] w-full rounded-2xl" />
      </div>
    </div>
  );
}
