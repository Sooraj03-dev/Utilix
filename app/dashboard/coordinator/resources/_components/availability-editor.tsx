"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Slash,
  Coins,
  Sparkles,
} from "lucide-react";
import {
  Input,
  Select,
  Button,
} from "@/components";
import type { AvailabilityWindow, Weekday, SlotType } from "@/lib/types";
import {
  addAvailabilityWindowAction,
  deleteAvailabilityWindowAction,
  type AvailabilityWindowFormData,
} from "../actions";

const WEEKDAY_OPTIONS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const SLOT_TYPE_OPTIONS = [
  { value: "credit", label: "Credit Required (Standard Fair Use)" },
  { value: "free", label: "Free Open Session (No Credits Deducted)" },
  { value: "blocked", label: "Blocked / Reserved for Lab Prep" },
];

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface AvailabilityEditorProps {
  resourceId: string;
  initialWindows: AvailabilityWindow[];
}

export function AvailabilityEditor({
  resourceId,
  initialWindows,
}: AvailabilityEditorProps) {
  const router = useRouter();

  const [mode, setMode] = useState<"recurring" | "specific_date">("recurring");
  const [weekday, setWeekday] = useState<number>(1); // Monday default
  const [specificDate, setSpecificDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("17:00");
  const [slotType, setSlotType] = useState<SlotType>("credit");
  const [note, setNote] = useState<string>("");

  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAddWindow = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload: AvailabilityWindowFormData = {
      resource_id: resourceId,
      mode,
      weekday: mode === "recurring" ? weekday : null,
      date: mode === "specific_date" ? specificDate : null,
      start: startTime,
      end: endTime,
      slot_type: slotType,
      note: note.trim() || null,
    };

    try {
      const res = await addAvailabilityWindowAction(payload);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to add availability window.");
      } else {
        setSuccessMessage("Availability window added successfully.");
        // Reset note
        setNote("");
        router.refresh();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteWindow = async (windowId: string) => {
    if (!confirm("Are you sure you want to remove this availability window?")) return;
    setDeletingId(windowId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await deleteAvailabilityWindowAction(windowId, resourceId);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to delete window.");
      } else {
        setSuccessMessage("Availability window removed.");
        router.refresh();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to delete window.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
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

      {/* Existing windows list */}
      <div className="p-6 rounded-2xl border-[3px] border-[#111111] bg-white shadow-[4px_4px_0px_0px_#111111]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-black text-[#111111] tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#111111]" />
              Configured Availability Windows
            </h3>
            <p className="text-xs text-[#4A4A4A] font-medium mt-0.5">
              Active time intervals when this resource can be allocated or used.
            </p>
          </div>
          <span className="text-xs font-black px-2.5 py-1 rounded-full border-[2px] border-[#111111] bg-[#FFF9E6]">
            {initialWindows.length} Active
          </span>
        </div>

        {initialWindows.length === 0 ? (
          <div className="p-6 text-center rounded-xl border-[2px] border-dashed border-[#111111]/30 bg-[#FAF8F5]">
            <p className="text-sm font-bold text-[#4A4A4A]">
              No availability windows set yet. Use the form below to configure recurring or date-specific hours.
            </p>
          </div>
        ) : (
          <div className="divide-y-[2px] divide-[#111111]/10">
            {initialWindows.map((win) => {
              const dayLabel =
                win.weekday !== null && win.weekday !== undefined
                  ? `Every ${WEEKDAY_NAMES[win.weekday]}`
                  : `Date: ${win.date}`;

              return (
                <div
                  key={win.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="p-2 rounded-xl bg-[#FFF9E6] border-[2px] border-[#111111] shrink-0">
                      <Clock className="w-4 h-4 text-[#111111]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-[#111111]">{dayLabel}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md border-[1.5px] border-[#111111] bg-[#FFD60A]">
                          {win.start} – {win.end} UTC
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md border-[1.5px] border-[#111111]/40 bg-[#FAF8F5] text-[#4A4A4A]">
                          {win.slot_type}
                        </span>
                      </div>
                      {win.note && (
                        <p className="text-xs text-[#4A4A4A] font-medium mt-0.5">
                          Note: {win.note}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    isLoading={deletingId === win.id}
                    onClick={() => handleDeleteWindow(win.id)}
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                    className="self-end sm:self-center min-h-[44px]"
                  >
                    Remove
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add new window form */}
      <form onSubmit={handleAddWindow} className="p-6 rounded-2xl border-[3px] border-[#111111] bg-[#FFF9E6] shadow-[4px_4px_0px_0px_#111111] space-y-4">
        <div>
          <h3 className="text-lg font-black text-[#111111] tracking-tight flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#111111]" />
            Add Availability Window
          </h3>
          <p className="text-xs text-[#4A4A4A] font-medium mt-0.5">
            Define open hours. Overlapping windows for the same day are strictly rejected.
          </p>
        </div>

        {/* Mode selector */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 font-bold text-xs cursor-pointer">
            <input
              type="radio"
              name="mode"
              checked={mode === "recurring"}
              onChange={() => setMode("recurring")}
              className="text-[#111111] focus:ring-0 cursor-pointer"
            />
            <span>Weekly Recurring Day</span>
          </label>
          <label className="flex items-center gap-2 font-bold text-xs cursor-pointer">
            <input
              type="radio"
              name="mode"
              checked={mode === "specific_date"}
              onChange={() => setMode("specific_date")}
              className="text-[#111111] focus:ring-0 cursor-pointer"
            />
            <span>Single Specific Date</span>
          </label>
        </div>

        {/* Day / Date input */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {mode === "recurring" ? (
            <Select
              label="Select Day of Week *"
              options={WEEKDAY_OPTIONS}
              value={String(weekday)}
              onChange={(e) => setWeekday(Number(e.target.value))}
              disabled={isAdding}
            />
          ) : (
            <Input
              type="date"
              label="Select Date (YYYY-MM-DD) *"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              required
              disabled={isAdding}
            />
          )}

          <Select
            label="Slot Allocation Type *"
            options={SLOT_TYPE_OPTIONS}
            value={slotType}
            onChange={(e) => setSlotType(e.target.value as SlotType)}
            disabled={isAdding}
          />
        </div>

        {/* Time range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="time"
            label="Start Time (HH:mm) *"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            disabled={isAdding}
          />

          <Input
            type="time"
            label="End Time (HH:mm) *"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            disabled={isAdding}
          />
        </div>

        {/* Note */}
        <div>
          <Input
            label="Schedule Note (Optional)"
            placeholder="e.g. Open lab hours with TA present"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isAdding}
          />
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            type="submit"
            variant="primary"
            isLoading={isAdding}
            leftIcon={<Plus className="w-4 h-4" />}
            className="min-h-[44px]"
          >
            Add Window
          </Button>
        </div>
      </form>
    </div>
  );
}

