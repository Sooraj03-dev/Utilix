"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "warning" | "error" | "info";

export interface ToastItem {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (options: Omit<ToastItem, "id">) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, message, type, duration = 4000 }: Omit<ToastItem, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, title, message, type, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title: string = "Success!") => toast({ message, title, type: "success" }),
    [toast]
  );

  const error = useCallback(
    (message: string, title: string = "Attention") => toast({ message, title, type: "error" }),
    [toast]
  );

  const warning = useCallback(
    (message: string, title: string = "Notice") => toast({ message, title, type: "warning" }),
    [toast]
  );

  const info = useCallback(
    (message: string, title: string = "Update") => toast({ message, title, type: "info" }),
    [toast]
  );

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      {/* Toast viewport */}
      <div
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => {
          const typeStyles = {
            success: "bg-[#22C55E] text-[#111111]",
            warning: "bg-[#F59E0B] text-[#111111]",
            error: "bg-[#EF4444] text-white",
            info: "bg-[#38BDF8] text-[#111111]",
          }[t.type];

          const IconComponent = {
            success: CheckCircle2,
            warning: AlertTriangle,
            error: AlertCircle,
            info: Info,
          }[t.type];

          return (
            <div
              key={t.id}
              role="alert"
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border-[3.5px] border-[#111111] shadow-[5px_5px_0px_0px_#111111] transition-all transform translate-y-0 duration-150 ${typeStyles}`}
            >
              <IconComponent className="w-5 h-5 flex-shrink-0 mt-0.5 stroke-[2.5]" />
              <div className="flex-1 min-w-0">
                {t.title && <h4 className="text-sm font-black tracking-tight mb-0.5">{t.title}</h4>}
                <p className="text-xs font-semibold leading-relaxed opacity-95">{t.message}</p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="w-7 h-7 rounded-lg bg-black/20 hover:bg-black/30 border-[1.5px] border-[#111111] flex items-center justify-center transition focus:outline-none focus:ring-2 focus:ring-black"
                aria-label="Close notification"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
