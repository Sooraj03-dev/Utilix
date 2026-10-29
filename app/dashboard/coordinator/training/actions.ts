"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/pages";
import {
  getTrainingCertification,
  createTrainingCertification,
  revokeTrainingCertification,
  listResources,
  createNotification,
  writeAudit,
  trainingRequestsCol,
  updateTrainingRequestStatus,
} from "@/lib/db";
import { isAlreadyCertified } from "@/lib/db/coordinator-helpers";
import type { AuditAction } from "@/lib/types";

export async function certifyStudentAction(
  userId: string,
  trainingType: string,
  requestId?: string
) {
  const user = await getSessionUser();
  if (!user || (user.role !== "coordinator" && user.role !== "admin")) {
    return { success: false, error: "Forbidden: Coordinator or Admin role required." };
  }

  if (!userId || !trainingType) {
    return { success: false, error: "Student ID and training type are required." };
  }

  // Ownership check: Coordinators can only certify training types for resources they manage
  if (user.role === "coordinator") {
    const allResources = await listResources();
    const managedTypes = new Set(
      allResources
        .filter((r) => r.coordinator_id === user.uid || user.assignedResourceIds?.includes(r.id))
        .map((r) => r.requires_training)
        .filter(Boolean)
    );

    if (!managedTypes.has(trainingType)) {
      return {
        success: false,
        error: `Forbidden: You do not manage resources requiring "${trainingType}" training.`,
      };
    }
  }

  try {
    // Idempotency check: if already certified and not revoked, return success cleanly
    const existing = await getTrainingCertification(userId, trainingType);
    if (isAlreadyCertified(existing)) {
      return { success: true, message: "Student is already certified for this training." };
    }

    // Create certification record (doc ID: `${userId}_${trainingType}`)
    const cert = await createTrainingCertification({
      user_id: userId,
      training_type: trainingType,
      certified_by: user.uid,
    });

    // Mark specific training request as completed if provided
    if (requestId) {
      await updateTrainingRequestStatus(requestId, "completed", user.uid, "Certified by coordinator");
    }

    // Also close any other pending training requests for this user and type
    const pendingSnap = await trainingRequestsCol()
      .where("user_id", "==", userId)
      .where("training_type", "==", trainingType)
      .where("status", "==", "pending")
      .get();

    for (const doc of pendingSnap.docs) {
      await updateTrainingRequestStatus(doc.id, "completed", user.uid, "Certified by coordinator");
    }

    // Send notification to student
    try {
      await createNotification({
        user_id: userId,
        type: "general",
        title: "Training Certification Approved! 🎓",
        body: `You are now certified for "${trainingType}". You can now reserve equipment requiring this credential.`,
        link: "/dashboard",
        read: false,
      });
    } catch {
      // Non-critical notification failure
    }

    // Write audit log
    await writeAudit(undefined, {
      actor_id: user.uid,
      action: "training_certified" as AuditAction,
      entity_type: "training_certifications",
      entity_id: cert.id,
      reason: `Student ${userId} certified for "${trainingType}" by ${user.role} ${user.email || user.uid}`,
    });

    revalidatePath("/dashboard/coordinator/training");
    revalidatePath("/dashboard/coordinator");
    return { success: true, certificationId: cert.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to certify student.";
    return { success: false, error: msg };
  }
}

export async function revokeTrainingAction(userId: string, trainingType: string) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return { success: false, error: "Forbidden: Only platform administrators can revoke training certifications." };
  }

  if (!userId || !trainingType) {
    return { success: false, error: "Student ID and training type are required." };
  }

  try {
    await revokeTrainingCertification(userId, trainingType);

    await writeAudit(undefined, {
      actor_id: user.uid,
      action: "training_revoked" as AuditAction,
      entity_type: "training_certifications",
      entity_id: `${userId}_${trainingType}`,
      reason: `Certification for "${trainingType}" revoked for student ${userId} by admin ${user.email || user.uid}`,
    });

    revalidatePath("/dashboard/coordinator/training");
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to revoke certification.";
    return { success: false, error: msg };
  }
}

