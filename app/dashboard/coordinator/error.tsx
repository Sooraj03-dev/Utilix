"use client";

import React from "react";
import { ErrorState } from "@/components/ErrorState";

export default function CoordinatorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-8">
      <ErrorState
        title="Coordinator Dashboard Error"
        message={error.message || "An unexpected error occurred while loading coordinator operations."}
        onRetry={reset}
      />
    </div>
  );
}

