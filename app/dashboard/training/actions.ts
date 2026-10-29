// Utilix — request training Server Actions (server-side)
// Owner: A
"use server";

import { revalidatePath } from "next/cache";

import { requireSessionUser } from "@/lib/auth";
import {
  createTrainingRequest,
  DuplicateTrainingRequestError,
} from "@/lib/db";

export interface TrainingRequestActionState {
  ok?: boolean;
  error?: string | null;
}

export async function requestTrainingAction(
  _prev: TrainingRequestActionState,
  formData: FormData
): Promise<TrainingRequestActionState> {
  const user = await requireSessionUser();

  if (user.role !== "student") {
    return { error: "Only students can request training." };
  }

  const trainingType = String(formData.get("training_type") ?? "").trim();
  if (!trainingType) {
    return { error: "Please pick a training to request." };
  }

  try {
    await createTrainingRequest({ user_id: user.uid, training_type: trainingType });
    revalidatePath("/dashboard/training");
    return { ok: true, error: null };
  } catch (error) {
    if (error instanceof DuplicateTrainingRequestError) {
      return { error: "You already have a pending request for this training." };
    }
    console.error("Training request failed:", error);
    return { error: "Could not submit your request. Please try again." };
  }
}
