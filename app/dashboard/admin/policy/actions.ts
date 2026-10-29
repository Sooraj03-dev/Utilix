"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/pages";
import {
  getActivePolicy,
  createPolicyVersion,
  getPolicyByVersion,
  writeAudit,
} from "@/lib/db";
import {
  diffPolicies,
  isPolicyEqual,
  normalizeWeights,
} from "@/lib/policy-diff";
import type {
  AuditAction,
  Policy,
  PolicyWeights,
  PeakDefinition,
  TiebreakMethod,
  Weekday,
} from "@/lib/types";

export const peakSlotSchema = z.object({
  weekday: z.coerce.number().min(0).max(6) as z.ZodType<Weekday>,
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Start time must be HH:mm."),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "End time must be HH:mm."),
}).refine((data) => data.start < data.end, {
  message: "Peak start time must be before end time.",
  path: ["end"],
});

export const policyFormSchema = z.object({
  // Section 1: Credits & Free access
  monthly_credits: z.coerce.number().min(0, "Monthly credits must be 0 or more."),
  free_sessions_per_week: z.coerce.number().min(0, "Free sessions per week must be 0 or more."),

  // Section 2: Session limits
  max_active_bookings: z.coerce.number().min(1, "Max active bookings must be at least 1."),
  slot_minutes: z.coerce.number().min(15, "Slot duration must be at least 15 minutes."),
  cancel_refund_hours: z.coerce.number().min(0, "Cancellation window must be 0 or more hours."),
  deadline_window_days: z.coerce.number().min(1, "Deadline window must be at least 1 day."),

  // Section 3: Priority weights (0 to 100)
  weights: z.object({
    usage_fairness: z.coerce.number().min(0).max(100),
    waiting_time: z.coerce.number().min(0).max(100),
    declared_need: z.coerce.number().min(0).max(100),
    interdisciplinary_bonus: z.coerce.number().min(0).max(100),
  }),

  // Section 4: Tiebreak order
  tiebreak_order: z.array(
    z.enum(["fewest_sessions_month", "earliest_request", "seeded_lottery"])
  ).min(1, "At least one tiebreaker method is required."),

  // Section 5: Peak slots
  peak_definition: z.array(peakSlotSchema).default([]),
});

export type PolicyFormData = z.infer<typeof policyFormSchema>;

export async function savePolicyAction(rawInput: unknown) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return { success: false, error: "Forbidden: Platform administrator permissions required." };
  }

  const parsed = policyFormSchema.safeParse(rawInput);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
    return { success: false, error: errorMsg };
  }

  const data = parsed.data;
  const currentActive = await getActivePolicy();

  // Normalize weights so the proportions are cleanly represented
  const norm = normalizeWeights(data.weights);
  const normalizedWeights: PolicyWeights = {
    usage_fairness: norm.usage_fairness / 100,
    waiting_time: norm.waiting_time / 100,
    declared_need: norm.declared_need / 100,
    interdisciplinary_bonus: norm.interdisciplinary_bonus / 100,
  };

  const candidatePolicy = {
    monthly_credits: data.monthly_credits,
    free_sessions_per_week: data.free_sessions_per_week,
    max_active_bookings: data.max_active_bookings,
    slot_minutes: data.slot_minutes,
    cancel_refund_hours: data.cancel_refund_hours,
    deadline_window_days: data.deadline_window_days,
    weights: normalizedWeights,
    tiebreak_order: data.tiebreak_order as TiebreakMethod[],
    peak_definition: data.peak_definition as PeakDefinition[],
  };

  // Block saving if nothing changed
  const diffs = diffPolicies(currentActive, candidatePolicy);
  if (diffs.length === 0) {
    return {
      success: false,
      error: "No changes detected. You must modify at least one policy parameter to create a new version.",
    };
  }

  try {
    const newVersion = await createPolicyVersion(candidatePolicy, user.uid);

    await writeAudit(undefined, {
      actor_id: user.uid,
      action: "policy_created" as AuditAction,
      entity_type: "policies",
      entity_id: newVersion.id,
      reason: `Policy updated to ${newVersion.id}: ${diffs.join("; ")}`,
    });

    revalidatePath("/dashboard/admin/policy");
    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard");
    return {
      success: true,
      version: newVersion.version,
      diffSummary: diffs.join("; "),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create policy version.";
    return { success: false, error: msg };
  }
}

export async function restorePolicyAction(versionNumber: number) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return { success: false, error: "Forbidden: Platform administrator permissions required." };
  }

  const historical = await getPolicyByVersion(versionNumber);
  if (!historical) {
    return { success: false, error: `Policy version v${versionNumber} not found.` };
  }

  const currentActive = await getActivePolicy();
  const diffs = diffPolicies(currentActive, historical);

  if (diffs.length === 0) {
    return {
      success: false,
      error: `The current active policy already matches version v${versionNumber}.`,
    };
  }

  try {
    const restoredVersion = await createPolicyVersion(
      {
        monthly_credits: historical.monthly_credits,
        free_sessions_per_week: historical.free_sessions_per_week,
        max_active_bookings: historical.max_active_bookings,
        slot_minutes: historical.slot_minutes,
        cancel_refund_hours: historical.cancel_refund_hours,
        deadline_window_days: historical.deadline_window_days,
        weights: historical.weights,
        tiebreak_order: historical.tiebreak_order,
        peak_definition: historical.peak_definition,
      },
      user.uid
    );

    await writeAudit(undefined, {
      actor_id: user.uid,
      action: "policy_created" as AuditAction,
      entity_type: "policies",
      entity_id: restoredVersion.id,
      reason: `Restored configuration from v${versionNumber} as new version ${restoredVersion.id}: ${diffs.join("; ")}`,
    });

    revalidatePath("/dashboard/admin/policy");
    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard");
    return {
      success: true,
      restoredFrom: versionNumber,
      newVersion: restoredVersion.version,
      diffSummary: diffs.join("; "),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to restore policy version.";
    return { success: false, error: msg };
  }
}
