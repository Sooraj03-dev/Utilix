"use client";

// Utilix — notifications error boundary (client)
// Owner: A
import { AlertTriangle } from "lucide-react";
import { Button, EmptyState } from "@/components";

export default function NotificationsError({ reset }: { reset: () => void }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <EmptyState
        icon={AlertTriangle}
        title="Could not load notifications"
        description="Nothing was lost — give it another try."
        className="shadow-[6px_6px_0px_0px_#111111]"
      />
      <div className="flex justify-center mt-4">
        <Button variant="primary" size="md" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
