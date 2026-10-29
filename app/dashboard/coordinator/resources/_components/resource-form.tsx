"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Save,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Loader2,
  Lock,
} from "lucide-react";
import {
  Input,
  Select,
  Button,
} from "@/components";
import type { Resource, ResourceType, ResourceStatus } from "@/lib/types";
import {
  createResourceAction,
  updateResourceAction,
  type ResourceFormData,
} from "../actions";

interface ResourceFormProps {
  initialData?: Resource;
  resourceId?: string;
  isEdit?: boolean;
}

const TYPE_OPTIONS = [
  { value: "printer_3d", label: "3D Fabrication / Printer" },
  { value: "arduino_kit", label: "IoT & Embedded Prototyping (Arduino/ESP32)" },
  { value: "camera", label: "Media Studio Camera / DSLR" },
  { value: "studio", label: "Podcast / Audio Studio" },
  { value: "project_room", label: "Team Project Collaboration Room" },
  { value: "lab_instrument", label: "Specialized Lab Instrument" },
];

const DEPARTMENT_OPTIONS = [
  { value: "dept_eng", label: "Engineering & Robotics (ENG)" },
  { value: "dept_cs", label: "Computer Science (CSE)" },
  { value: "dept_media", label: "Media & Journalism (MED)" },
  { value: "dept_arts", label: "Design & Arts (ART)" },
];

const STATUS_OPTIONS = [
  { value: "available", label: "Available — Ready for booking" },
  { value: "maintenance", label: "Under Maintenance — Temporarily blocked" },
  { value: "retired", label: "Retired — Out of service" },
];

export function ResourceForm({ initialData, resourceId, isEdit = false }: ResourceFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<ResourceFormData>({
    name: initialData?.name || "",
    type: initialData?.type || "printer_3d",
    department_id: initialData?.department_id || "dept_eng",
    location: initialData?.location || "",
    photo_url: initialData?.photo_url || "",
    restricted: initialData?.restricted ?? false,
    requires_training: initialData?.requires_training || "",
    credit_cost: initialData?.credit_cost ?? 2,
    max_session_minutes: initialData?.max_session_minutes ?? 180,
    status: initialData?.status || "available",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (isEdit && resourceId) {
        const res = await updateResourceAction(resourceId, formData);
        if (!res.success) {
          setErrorMessage(res.error || "Failed to update resource.");
        } else {
          setSuccessMessage("Resource details successfully updated.");
          router.refresh();
        }
      } else {
        const res = await createResourceAction(formData);
        if (!res.success) {
          setErrorMessage(res.error || "Failed to create resource.");
        } else {
          setSuccessMessage("Resource successfully registered!");
          router.push(`/dashboard/coordinator/resources/${res.resourceId}/edit`);
          router.refresh();
        }
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-xl border-[2.5px] border-[#111111] bg-[#FEE2E2] text-[#EF4444] text-sm font-bold flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl border-[2.5px] border-[#111111] bg-[#DCFCE7] text-[#166534] text-sm font-bold flex items-start gap-3">
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="p-6 rounded-2xl border-[3px] border-[#111111] bg-white shadow-[4px_4px_0px_0px_#111111] space-y-5">
        {/* Name */}
        <div>
          <Input
            label="Resource Name *"
            placeholder="e.g. Prusa XL 5-Toolhead 3D Printer"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Type & Department */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Category / Resource Type *"
            options={TYPE_OPTIONS}
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as ResourceType })}
            disabled={isSubmitting}
          />

          <Select
            label="Department / Lab Division *"
            options={DEPARTMENT_OPTIONS}
            value={formData.department_id}
            onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
            disabled={isSubmitting}
          />
        </div>

        {/* Location & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Campus Location *"
            placeholder="e.g. Engineering Hall B, Lab 104"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            required
            disabled={isSubmitting}
          />

          <Select
            label="Operational Status *"
            options={STATUS_OPTIONS}
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as ResourceStatus })}
            disabled={isSubmitting}
          />
        </div>

        {/* Credit Cost & Max Session Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="number"
            min={0}
            step={1}
            label="Credit Cost (per booking session) *"
            helperText="Fairness cost deducted from student ledger"
            value={formData.credit_cost}
            onChange={(e) => setFormData({ ...formData, credit_cost: Number(e.target.value) })}
            required
            disabled={isSubmitting}
          />

          <Input
            type="number"
            min={15}
            step={15}
            label="Max Session Minutes *"
            helperText="Maximum continuous booking time permitted"
            value={formData.max_session_minutes}
            onChange={(e) => setFormData({ ...formData, max_session_minutes: Number(e.target.value) })}
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Training Prerequisite */}
        <div>
          <Input
            label="Training Prerequisite (Optional)"
            placeholder="e.g. 3d_printer or laser_cutter"
            helperText="Students must hold this safety certification to reserve"
            value={formData.requires_training || ""}
            onChange={(e) => setFormData({ ...formData, requires_training: e.target.value })}
            disabled={isSubmitting}
          />
        </div>

        {/* Photo URL */}
        <div>
          <Input
            type="url"
            label="Equipment Photo URL (Optional)"
            placeholder="https://images.unsplash.com/..."
            value={formData.photo_url || ""}
            onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
            disabled={isSubmitting}
          />
        </div>

        {/* Restricted Checkbox */}
        <div className="pt-2">
          <label className="flex items-start gap-3 p-3.5 rounded-xl border-[2px] border-[#111111] bg-[#FFF9E6] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formData.restricted}
              onChange={(e) => setFormData({ ...formData, restricted: e.target.checked })}
              disabled={isSubmitting}
              className="w-5 h-5 mt-0.5 rounded border-[2px] border-[#111111] text-[#FFD60A] focus:ring-0 cursor-pointer"
            />
            <div>
              <div className="flex items-center gap-1.5 font-black text-sm text-[#111111]">
                <Lock className="w-4 h-4 text-[#111111]" />
                Restricted Resource — Requires Coordinator Approval
              </div>
              <p className="text-xs text-[#4A4A4A] font-medium mt-0.5">
                When enabled, algorithmic allocations place bookings in &quot;Pending Approval&quot; status until you verify the student project plan.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard/coordinator/resources"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-[2.5px] border-[#111111] bg-white font-bold text-sm text-[#111111] hover:bg-[#FFF9E6] shadow-[2px_2px_0px_0px_#111111] min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Resources</span>
        </Link>

        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          leftIcon={<Save className="w-4 h-4" />}
          className="min-h-[44px]"
        >
          {isEdit ? "Save Resource Changes" : "Register Resource"}
        </Button>
      </div>
    </form>
  );
}

