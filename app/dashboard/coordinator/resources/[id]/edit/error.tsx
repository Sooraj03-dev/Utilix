"use client";

import React from "react";
import { ErrorState } from "@/components/ErrorState";

export default function EditResourceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-8">
      <ErrorState
        title="Resource Editor Error"
        message={error.message || "Failed to load resource configurations."}
        onRetry={reset}
      />
    </div>
  );
}

