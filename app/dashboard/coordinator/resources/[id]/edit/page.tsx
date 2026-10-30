import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Sliders,
  Calendar,
  Wrench,
  Coins,
} from "lucide-react";
import { requireRoleOrRedirect } from "@/lib/auth/guards";
import {
  getResourceById,
  listAvailabilityWindowsByResource,
} from "@/lib/db";
import { canCoordinatorManageResource } from "@/lib/db/coordinator-helpers";
import { ResourceForm } from "../../_components/resource-form";
import { AvailabilityEditor } from "../../_components/availability-editor";
import { MaintenanceForm } from "../../_components/maintenance-form";
import { StatusChip } from "@/components";
import type { ResourceStatus as ComponentResourceStatus } from "@/components/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditResourcePage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireRoleOrRedirect(["coordinator", "admin"], `/dashboard/coordinator/resources/${id}/edit`);

  const resource = await getResourceById(id);
  if (!resource) {
    notFound();
  }

  if (!canCoordinatorManageResource(resource, user)) {
    redirect("/dashboard/coordinator/resources");
  }

  const windows = await listAvailabilityWindowsByResource(id);

  // Map "retired" to "blocked" for component StatusChip if needed
  const chipStatus: ComponentResourceStatus =
    resource.status === "retired" ? "blocked" : resource.status;

  return (
    <div className="space-y-8">
      {/* Top breadcrumb & title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b-[2px] border-[#111111]/10">
        <div>
          <Link
            href="/dashboard/coordinator/resources"
            className="inline-flex items-center gap-1 text-xs font-black text-[#4A4A4A] hover:text-[#111111] mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Managed Resources
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
              {resource.name}
            </h2>
            <StatusChip status={chipStatus} />
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border-[2px] border-[#111111] bg-[#FFD60A] text-[#111111] shadow-[2px_2px_0px_0px_#111111]">
              <Coins className="w-3.5 h-3.5" />
              {resource.credit_cost} Credit{resource.credit_cost === 1 ? "" : "s"}
            </span>
          </div>
          <p className="text-xs text-[#4A4A4A] font-semibold mt-1">
            Resource ID: <code className="bg-[#FFF9E6] px-1.5 py-0.5 rounded border border-[#111111]/30">{resource.id}</code> • Department: {resource.department_id}
          </p>
        </div>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (5 cols): Resource Details Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center gap-2 text-[#111111]">
            <Sliders className="w-5 h-5" />
            <h3 className="text-xl font-black tracking-tight">Specifications & Rules</h3>
          </div>
          <ResourceForm isEdit initialData={resource} resourceId={resource.id} />
        </div>

        {/* Right Column (7 cols): Availability Windows & Maintenance Blocks */}
        <div className="lg:col-span-7 space-y-8">
          <div>
            <div className="flex items-center gap-2 text-[#111111] mb-4">
              <Calendar className="w-5 h-5" />
              <h3 className="text-xl font-black tracking-tight">Availability Windows</h3>
            </div>
            <AvailabilityEditor resourceId={resource.id} initialWindows={windows} />
          </div>

          <div>
            <div className="flex items-center gap-2 text-[#111111] mb-4">
              <Wrench className="w-5 h-5" />
              <h3 className="text-xl font-black tracking-tight">Maintenance & Downtime</h3>
            </div>
            <MaintenanceForm resourceId={resource.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
