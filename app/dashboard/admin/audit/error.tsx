"use client";

import React from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";

export default function AuditError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-2xl border-[3px] border-[#111111] bg-white p-8 text-center shadow-[4px_4px_0px_0px_#111111]">
      <div className="w-14 h-14 rounded-2xl bg-[#FFE5E5] border-[2px] border-[#111111] flex items-center justify-center mx-auto mb-4 shadow-[2px_2px_0px_0px_#111111]">
        <AlertTriangle className="w-7 h-7 text-[#D90429]" />
      </div>
      <h2 className="text-xl font-black text-[#111111]">Failed to Load Audit Logs</h2>
      <p className="mt-2 text-sm text-[#555555] max-w-md mx-auto">
        {error.message || "An unexpected error occurred while querying the audit trail."}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-[2px] border-[#111111] bg-[#FFD60A] text-sm font-black shadow-[2px_2px_0px_0px_#111111] hover:bg-[#FFE047] min-h-[44px]"
      >
        <RotateCcw className="w-4 h-4" />
        Retry Query
      </button>
    </div>
  );
}
