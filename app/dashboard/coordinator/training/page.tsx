import React from "react";
import { redirect } from "next/navigation";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { getSessionUser } from "@/lib/auth/pages";
import {
  listResources,
  listTrainingRequestsForTypes,
  trainingCertsCol,
  usersCol,
  docToEntity,
} from "@/lib/db";
import type {
  TrainingRequest,
  TrainingCertification,
  User as UserEntity,
} from "@/lib/types";
import { TrainingManager } from "./_components/training-manager";

export default async function CoordinatorTrainingPage() {
  const sessionUser = await getSessionUser();
  if (sessionUser && sessionUser.role !== "coordinator" && sessionUser.role !== "admin") {
    redirect("/dashboard");
  }

  const allResources = await listResources();
  const isAdmin = sessionUser?.role === "admin";

  // Identify training types relevant to this coordinator
  const managedTrainingTypes = [
    ...new Set(
      allResources
        .filter((r) => {
          if (isAdmin || !sessionUser) return true;
          return (
            r.coordinator_id === sessionUser.uid ||
            Boolean(sessionUser.assignedResourceIds?.includes(r.id))
          );
        })
        .map((r) => r.requires_training)
        .filter((t): t is string => Boolean(t))
    ),
  ];

  // Fetch pending training requests
  const requests = await listTrainingRequestsForTypes(
    isAdmin ? undefined : managedTrainingTypes
  );

  // Fetch certifications
  const certsSnap = await trainingCertsCol().get();
  const allCerts = certsSnap.docs
    .map((d) => docToEntity<TrainingCertification>(d.id, d.data()))
    .filter((c): c is TrainingCertification => c !== null);

  const relevantCerts = isAdmin
    ? allCerts
    : allCerts.filter((c) => managedTrainingTypes.includes(c.training_type));

  // Collect all unique user IDs to fetch profile data
  const userIds = [
    ...new Set([
      ...requests.map((r) => r.user_id),
      ...relevantCerts.map((c) => c.user_id),
    ]),
  ];

  const userMap: Record<string, UserEntity> = {};
  if (userIds.length > 0) {
    // Fetch in parallel chunks
    await Promise.all(
      userIds.map(async (uid) => {
        try {
          const snap = await usersCol().doc(uid).get();
          if (snap.exists) {
            const u = docToEntity<UserEntity>(snap.id, snap.data());
            if (u) userMap[uid] = u;
          }
        } catch {
          // Graceful fallback
        }
      })
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border-[2px] border-[#111111] bg-[#FFD60A] text-xs font-black uppercase shadow-[2px_2px_0px_0px_#111111]">
          <GraduationCap className="w-3.5 h-3.5" />
          Safety & Operational Prerequisites
        </div>
        <h2 className="mt-2 text-2xl font-black text-[#111111] tracking-tight">
          Student Training & Certifications
        </h2>
        <p className="mt-1 text-sm text-[#4A4A4A] font-medium">
          Review student prerequisite requests, grant equipment licenses, and audit active lab certifications.
        </p>
      </div>

      <TrainingManager
        requests={requests}
        certifications={relevantCerts}
        users={userMap}
        currentUserRole={sessionUser?.role || "coordinator"}
      />
    </div>
  );
}
