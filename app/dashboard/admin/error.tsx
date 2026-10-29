"use client";

import React from "react";
import { ErrorState } from "@/components/ErrorState";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-8">
      <ErrorState
        title="Admin Telemetry Error"
        message={error.message || "Failed to load campus allocation telemetry and KPIs."}
        onRetry={reset}
      />
    </div>
  );
}

