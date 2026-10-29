"use client";

import React, { useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "./utils";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  errorCode?: string;
  onRetry?: () => void | Promise<void>;
  className?: string;
}

export function ErrorState({
  title = "Connection Interrupted",
  message = "We could not reach the campus allocation registry. Your credits and reservations are completely safe.",
  errorCode,
  onRetry,
  className,
}: ErrorStateProps) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl border-[3.5px] border-[#111111] bg-[#FFF9E6] shadow-[6px_6px_0px_0px_#111111]",
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-[#EF4444] border-[3px] border-[#111111] shadow-[3px_3px_0px_#111] flex items-center justify-center text-white mb-4">
        <AlertCircle className="w-8 h-8 stroke-[2.5]" aria-hidden="true" />
      </div>

      <h3 className="text-lg sm:text-xl font-black text-[#111111] tracking-tight">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-[#111111]/80 max-w-md mt-1.5 font-medium leading-relaxed">
        {message}
      </p>

      {errorCode && (
        <span className="mt-2 text-[11px] font-mono font-bold bg-[#EF4444]/15 border-[1.5px] border-[#111111] px-2.5 py-0.5 rounded-full text-[#111111] uppercase">
          Ref: {errorCode}
        </span>
      )}

      {onRetry && (
        <div className="mt-6">
          <Button
            variant="primary"
            size="md"
            isLoading={retrying}
            leftIcon={<RefreshCw className="w-4 h-4 stroke-[3]" />}
            onClick={handleRetry}
          >
            Retry Connection
          </Button>
        </div>
      )}
    </div>
  );
}
