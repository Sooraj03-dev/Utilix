import React from "react";
import { Skeleton } from "@/components/Skeleton";

export default function EditResourceLoading() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-64 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Skeleton className="h-96 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    </div>
  );
}

