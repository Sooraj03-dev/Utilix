"use client";

import React from "react";
import { ErrorState } from "@/components/ErrorState";

export default function ResourcesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-8">
      <ErrorState
        title="Resources Catalog Error"
        message={error.message || "Failed to load managed lab resources."}
        onRetry={reset}
      />
    </div>
  );
}

