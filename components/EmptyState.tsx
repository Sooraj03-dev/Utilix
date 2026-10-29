import React from "react";
import { FolderSearch, Plus, LucideIcon } from "lucide-react";
import { cn } from "./utils";
import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = FolderSearch,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl border-[3.5px] border-[#111111] bg-[#FFF9E6] shadow-[6px_6px_0px_0px_#111111]",
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-[#FFD60A] border-[3px] border-[#111111] shadow-[3px_3px_0px_#111] flex items-center justify-center text-[#111111] mb-4">
        <Icon className="w-8 h-8 stroke-[2.5]" aria-hidden="true" />
      </div>

      <h3 className="text-lg sm:text-xl font-black text-[#111111] tracking-tight">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-[#111111]/80 max-w-sm mt-1.5 font-medium leading-relaxed">
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction && (
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4 stroke-[3]" />}
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="secondary" size="md" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
