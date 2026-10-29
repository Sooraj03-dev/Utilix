"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { StartupScreen } from "@/components/StartupScreen";

export default function RootPage() {
  const router = useRouter();
  const navigatedRef = useRef(false);

  const navigateToLogin = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    router.replace("/login");
  }, [router]);

  // Safety fallback: guarantee redirect to /login even if animations or tabs freeze
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      navigateToLogin();
    }, 2600);

    return () => clearTimeout(safetyTimer);
  }, [navigateToLogin]);

  return <StartupScreen onComplete={navigateToLogin} durationMs={1900} />;
}
