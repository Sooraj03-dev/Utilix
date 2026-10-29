"use client";

import React from "react";
import { ErrorState } from "@/components/ErrorState";

export default function TrainingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-8">
      <ErrorState
        title="Training Management Error"
        message={error.message || "Failed to load training requests and certifications."}
        onRetry={reset}
      />
    </div>
  );
}

