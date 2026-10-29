import React from "react";
import { Skeleton } from "@/components/Skeleton";

export default function NewResourceLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Skeleton className="h-8 w-64 rounded-xl" />
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}

