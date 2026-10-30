import React from "react";
import Link from "next/link";
import {
  Plus,
  Edit3,
  Lock,
  GraduationCap,
  MapPin,
  Clock,
  Layers,
  Calendar,
  Coins,
} from "lucide-react";
import { requireRoleOrRedirect } from "@/lib/auth/guards";
import { listResources, availabilityWindowsCol } from "@/lib/db";
import type { Resource } from "@/lib/types";
import {
  StatusChip,
  EmptyState,
} from "@/components";
import type { ResourceStatus as ComponentResourceStatus } from "@/components/types";

export default async function CoordinatorResourcesPage() {
  const sessionUser = await requireRoleOrRedirect(["coordinator", "admin"], "/dashboard/coordinator/resources");
  const allResources = await listResources();

  // Filter for coordinator's managed resources (or all if admin)
  const managedResources = allResources.filter((res) => {
    if (sessionUser.role === "admin") return true;
    return (
      res.coordinator_id === sessionUser.uid ||
      Boolean(sessionUser.assignedResourceIds?.includes(res.id))
    );
  });

  // Query availability windows to show count per resource
  const windowsSnap = await availabilityWindowsCol().get();
  const windowsCountMap = new Map<string, number>();
  for (const doc of windowsSnap.docs) {
    const data = doc.data();
    const resId = data?.resource_id;
    if (resId) {
      windowsCountMap.set(resId, (windowsCountMap.get(resId) || 0) + 1);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#111111] tracking-tight">
            Managed Resources & Labs
          </h2>
          <p className="text-sm text-[#4A4A4A] font-medium mt-1">
            Configure technical equipment, adjust credit costs, and schedule availability windows.
          </p>
        </div>
        <Link
          href="/dashboard/coordinator/resources/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border-[3px] border-[#111111] bg-[#FFD60A] text-[#111111] font-black text-sm shadow-[4px_4px_0px_0px_#111111] hover:bg-[#FFE047] transition-all min-h-[44px] shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>Add New Resource</span>
        </Link>
      </div>

      {managedResources.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No Managed Resources Found"
          description="You currently have no equipment or labs assigned to your coordinator profile. Add a new resource to begin sharing on Utilix."
          actionLabel="Create First Resource"
          onAction={undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {managedResources.map((resource) => {
            const windowsCount = windowsCountMap.get(resource.id) || 0;
            const chipStatus: ComponentResourceStatus =
              resource.status === "retired" ? "blocked" : resource.status;

            return (
              <div
                key={resource.id}
                className="flex flex-col justify-between p-5 rounded-2xl border-[3px] border-[#111111] bg-white shadow-[4px_4px_0px_0px_#111111] transition-all"
              >
                <div>
                  {/* Top status bar */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <StatusChip status={chipStatus} />
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border-[2px] border-[#111111] bg-[#FFD60A] text-[#111111] shadow-[2px_2px_0px_0px_#111111]">
                      <Coins className="w-3.5 h-3.5" />
                      {resource.credit_cost} Credit{resource.credit_cost === 1 ? "" : "s"}
                    </span>
                  </div>

                  {/* Resource name & Category */}
                  <h3 className="text-lg font-black text-[#111111] tracking-tight line-clamp-1">
                    {resource.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-[#4A4A4A] font-bold uppercase tracking-wider mt-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{resource.type.replace(/_/g, " ")}</span>
                  </div>

                  {/* Metadata tags */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#111111]">
                      <MapPin className="w-4 h-4 text-[#4A4A4A] shrink-0" />
                      <span className="truncate">{resource.location || "Campus Lab"}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-[#111111]">
                      <Clock className="w-4 h-4 text-[#4A4A4A] shrink-0" />
                      <span>{resource.max_session_minutes} min max session</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-[#111111]">
                      <Calendar className="w-4 h-4 text-[#4A4A4A] shrink-0" />
                      <span>{windowsCount} availability window{windowsCount === 1 ? "" : "s"}</span>
                    </div>
                  </div>

                  {/* Badges for restricted / training */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {resource.restricted && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border-[1.5px] border-[#111111] bg-[#FFF9E6] text-[#111111] text-xs font-bold">
                        <Lock className="w-3 h-3 text-[#111111]" />
                        Approval Required
                      </span>
                    )}
                    {resource.requires_training && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border-[1.5px] border-[#111111] bg-[#E0F2FE] text-[#0369A1] text-xs font-bold">
                        <GraduationCap className="w-3 h-3 text-[#0369A1]" />
                        {resource.requires_training}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer action link */}
                <div className="mt-5 pt-4 border-t-[2px] border-[#111111]/10 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#4A4A4A]">ID: {resource.id}</span>
                  <Link
                    href={`/dashboard/coordinator/resources/${resource.id}/edit`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-[2px] border-[#111111] bg-[#FFF9E6] hover:bg-[#FFD60A] text-[#111111] text-xs font-black shadow-[2px_2px_0px_0px_#111111] transition-all min-h-[44px]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit & Availability</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
