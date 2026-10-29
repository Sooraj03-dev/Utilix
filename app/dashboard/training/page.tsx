// Utilix — student training page (Server Component)
// Owner: A
import { Award, Clock4, ShieldCheck, XCircle } from "lucide-react";

import { Card, EmptyState } from "@/components";
import { requireSessionUser } from "@/lib/auth";
import {
  listResources,
  listTrainingCertificationsByUser,
  listTrainingRequestsByUser,
} from "@/lib/db";
import type { TrainingCertification, TrainingRequest } from "@/lib/types";
import { RequestTrainingButton } from "./_components/request-training-button";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function titleCase(value: string): string {
  return value
    .split(/[-_ ]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function TrainingPage() {
  const sessionUser = await requireSessionUser();

  const [resources, certs, requests] = await Promise.all([
    listResources().catch(() => []),
    listTrainingCertificationsByUser(sessionUser.uid).catch(
      () => [] as TrainingCertification[]
    ),
    listTrainingRequestsByUser(sessionUser.uid).catch(
      () => [] as TrainingRequest[]
    ),
  ]);

  // Training types come straight from the resource catalogue.
  const trainingTypes = [
    ...new Set(
      resources
        .map((r) => r.requires_training)
        .filter((t): t is string => Boolean(t))
    ),
  ].sort();

  const certByType = new Map(certs.map((c) => [c.training_type, c]));
  const pendingTypes = new Set(
    requests.filter((r) => r.status === "pending").map((r) => r.training_type)
  );

  if (trainingTypes.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-6">
          Training
        </h1>
        <EmptyState
          icon={Award}
          title="No training required right now"
          description="None of the registered resources need a safety training. When they do, you can request it here."
          className="shadow-[6px_6px_0px_0px_#111111]"
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header>
        <p className="text-xs font-black uppercase tracking-wider text-black/60">
          Utilix · Safety training
        </p>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Training</h1>
        <p className="text-sm font-bold text-black/70 mt-1">
          Certifications unlock resources that require them. One request per training type.
        </p>
      </header>

      <ul className="space-y-3">
        {trainingTypes.map((type) => {
          const cert = certByType.get(type);
          const pending = pendingTypes.has(type);

          return (
            <li key={type}>
              <Card className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-black text-base">{titleCase(type)}</h2>
                    <div className="mt-2 flex items-start gap-2">
                      {cert ? (
                        <>
                          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-[#15803D]" aria-hidden="true" />
                          <p className="text-xs font-bold text-black/75">
                            Certified on {formatDate(cert.certified_at)} · certified
                            by {cert.certified_by}
                          </p>
                        </>
                      ) : pending ? (
                        <>
                          <Clock4 className="w-4 h-4 mt-0.5 shrink-0 text-[#B45309]" aria-hidden="true" />
                          <p className="text-xs font-bold text-black/75">
                            Request pending — a coordinator will schedule you.
                          </p>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#B91C1C]" aria-hidden="true" />
                          <p className="text-xs font-bold text-black/75">
                            Not certified yet — request training to get started.
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {!cert && !pending && sessionUser.role === "student" && (
                    <RequestTrainingButton trainingType={type} />
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
