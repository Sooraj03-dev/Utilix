"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Wrench,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Clock,
  Calendar,
} from "lucide-react";
import {
  Input,
  Button,
} from "@/components";
import {
  scheduleMaintenanceBlockAction,
  type MaintenanceBlockData,
} from "../actions";

interface MaintenanceFormProps {
  resourceId: string;
}

interface ConflictItem {
  id: string;
  user_id: string;
  slot_start: string;
  slot_end: string;
  status: string;
}

export function MaintenanceForm({ resourceId }: MaintenanceFormProps) {
  const router = useRouter();

  const [startDate, setStartDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("08:00");
  const [endDate, setEndDate] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("18:00");
  const [reason, setReason] = useState<string>("");
  const [setResourceMaintenance, setSetResourceMaintenance] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ConflictItem[] | null>(null);

  const handleSubmit = async (e: React.FormEvent, forceConfirm: boolean = false) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload: MaintenanceBlockData = {
      resource_id: resourceId,
      start_date: startDate,
      start_time: startTime,
      end_date: endDate || startDate,
      end_time: endTime,
      reason,
      set_resource_maintenance: setResourceMaintenance,
      confirmed_with_conflicts: forceConfirm,
    };

    try {
      const res = await scheduleMaintenanceBlockAction(payload);
      if (!res.success) {
        if (res.hasConflicts && res.conflicts) {
          setConflicts(res.conflicts);
          setErrorMessage(res.error || "Conflicts detected.");
        } else {
          setErrorMessage(res.error || "Failed to schedule maintenance block.");
        }
      } else {
        setConflicts(null);
        setSuccessMessage("Maintenance block scheduled successfully and audit entry recorded.");
        setReason("");
        router.refresh();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl border-[3px] border-[#111111] bg-white shadow-[4px_4px_0px_0px_#111111] space-y-5">
      <div>
        <h3 className="text-lg font-black text-[#111111] tracking-tight flex items-center gap-2">
          <Wrench className="w-5 h-5 text-[#111111]" />
          Schedule Maintenance Block
        </h3>
        <p className="text-xs text-[#4A4A4A] font-medium mt-0.5">
          Reserve downtime for servicing, recalibration, or equipment repair. Conflicting student bookings are flagged for review.
        </p>
      </div>

      {/* Notifications */}
      {errorMessage && !conflicts && (
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

      {/* Conflicting bookings alert */}
      {conflicts && conflicts.length > 0 && (
        <div className="p-5 rounded-2xl border-[3px] border-[#111111] bg-[#FEF2F2] shadow-[4px_4px_0px_0px_#111111] space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-[#FEE2E2] border-[2px] border-[#111111] shrink-0">
              <AlertTriangle className="w-6 h-6 text-[#EF4444]" />
            </div>
            <div>
              <h4 className="font-black text-base text-[#111111]">
                Booking Conflict Warning: {conflicts.length} reservation{conflicts.length === 1 ? "" : "s"} affected
              </h4>
              <p className="text-xs text-[#4A4A4A] font-medium mt-0.5">
                The requested maintenance period overlaps with active student bookings. You may notify the students or proceed with the outage.
              </p>
            </div>
          </div>

          <div className="divide-y-[1.5px] divide-[#111111]/15 max-h-48 overflow-y-auto">
            {conflicts.map((c) => (
              <div key={c.id} className="py-2.5 text-xs font-semibold flex items-center justify-between">
                <div>
                  <span className="font-black text-[#111111]">Booking #{c.id.slice(0, 10)}</span>
                  <span className="text-[#4A4A4A] ml-2">Student: {c.user_id}</span>
                </div>
                <div className="text-[#4A4A4A]">
                  {c.slot_start.slice(0, 16).replace("T", " ")} UTC
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              type="button"
              variant="destructive"
              isLoading={isSubmitting}
              onClick={() => handleSubmit(undefined as any, true)}
              className="min-h-[44px]"
            >
              Confirm Maintenance Despite Conflicts
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConflicts(null)}
              className="min-h-[44px]"
            >
              Cancel & Adjust Dates
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="date"
            label="Maintenance Start Date *"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            disabled={isSubmitting}
          />

          <Input
            type="time"
            label="Start Time (HH:mm) *"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="date"
            label="Maintenance End Date *"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            disabled={isSubmitting}
          />

          <Input
            type="time"
            label="End Time (HH:mm) *"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <Input
            label="Maintenance Reason / Action Plan *"
            placeholder="e.g. Firmware upgrade, bed leveling, sensor recalibration"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="pt-1">
          <label className="flex items-center gap-2.5 font-bold text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={setResourceMaintenance}
              onChange={(e) => setSetResourceMaintenance(e.target.checked)}
              disabled={isSubmitting}
              className="w-4 h-4 rounded border-[2px] border-[#111111] text-[#FFD60A] focus:ring-0 cursor-pointer"
            />
            <span>Set resource status to &quot;Under Maintenance&quot; immediately</span>
          </label>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            leftIcon={<Wrench className="w-4 h-4" />}
            className="min-h-[44px]"
          >
            Apply Maintenance Block
          </Button>
        </div>
      </form>
    </div>
  );
}

