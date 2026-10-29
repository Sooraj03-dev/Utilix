"use client";

import React from "react";
import { ErrorState } from "@/components/ErrorState";

export default function NewResourceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <ErrorState
        title="Failed to Load Resource Form"
        message={error.message || "An unexpected error occurred."}
        onRetry={reset}
      />
    </div>
  );
}

