"use client";

// Utilix — request-training button with duplicate/permission errors (client)
// Owner: A
import { useActionState } from "react";
import { GraduationCap, Send } from "lucide-react";

import { Button } from "@/components";
import {
  requestTrainingAction,
  type TrainingRequestActionState,
} from "../actions";

const initialState: TrainingRequestActionState = { ok: false, error: null };

export function RequestTrainingButton({ trainingType }: { trainingType: string }) {
  const [state, formAction, pending] = useActionState(
    requestTrainingAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <input type="hidden" name="training_type" value={trainingType} />
      {state.error && !state.ok && (
        <p role="alert" className="text-[11px] font-black text-[#B91C1C]">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="text-[11px] font-black text-[#15803D]">
          Request sent — coordinators have been notified.
        </p>
      )}
      <Button
        type="submit"
        variant="primary"
        size="sm"
        isLoading={pending}
        leftIcon={
          state.ok ? <GraduationCap className="w-4 h-4" /> : <Send className="w-4 h-4" />
        }
      >
        {state.ok ? "Requested" : "Request training"}
      </Button>
    </form>
  );
}
