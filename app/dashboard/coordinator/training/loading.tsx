import React from "react";
import { Skeleton } from "@/components/Skeleton";

export default function TrainingLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}

