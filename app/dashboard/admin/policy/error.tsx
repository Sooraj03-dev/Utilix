"use client";

import React from "react";
import { ErrorState } from "@/components/ErrorState";

export default function PolicyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-8">
      <ErrorState
        title="Policy Management Error"
        message={error.message || "Failed to load allocation policies and version history."}
        onRetry={reset}
      />
    </div>
  );
}
