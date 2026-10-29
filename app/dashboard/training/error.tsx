"use client";

// Utilix — training page error boundary (client)
// Owner: A
import { AlertTriangle } from "lucide-react";
import { Button, EmptyState } from "@/components";

export default function TrainingError({ reset }: { reset: () => void }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <EmptyState
        icon={AlertTriangle}
        title="Could not load training"
        description=" Your certifications and requests are safe — retry in a moment."
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
