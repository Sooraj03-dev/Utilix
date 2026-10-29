/* ═══════════════════════════════════════════════════════════════════════════
 * Form Validation — Owner B
 *
 * Pure functions for validating booking form inputs. Used by both the
 * client-side form and the API route for server-side validation.
 * ═══════════════════════════════════════════════════════════════════════════ */

import type { BookingFormData, ValidationResult, Resource } from "./types";

/**
 * Parse an "HH:mm" time string into total minutes since midnight.
 * Returns NaN for invalid formats.
 */
export function timeToMinutes(time: string): number {
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) return NaN;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return NaN;
  return h * 60 + m;
}

/**
 * Validate a booking form submission.
 */
export function validateBookingForm(
  data: BookingFormData,
  resource?: Resource | null,
): ValidationResult {
  const errors: { field: string; message: string }[] = [];

  // ── Required fields ──
  if (!data.resourceId) {
    errors.push({ field: "resourceId", message: "Resource is required." });
  }
  if (!data.purpose || data.purpose.trim().length < 5) {
    errors.push({
      field: "purpose",
      message: "Purpose must be at least 5 characters.",
    });
  }
  if (!data.date) {
    errors.push({ field: "date", message: "Date is required." });
  }
  if (!data.startTime) {
    errors.push({ field: "startTime", message: "Start time is required." });
  }
  if (!data.endTime) {
    errors.push({ field: "endTime", message: "End time is required." });
  }

  // ── Date validation ──
  if (data.date) {
    const bookingDate = new Date(data.date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(bookingDate.getTime())) {
      errors.push({ field: "date", message: "Invalid date format." });
    } else if (bookingDate < today) {
      errors.push({
        field: "date",
        message: "Cannot book a date in the past.",
      });
    }
  }

  // ── Time range validation ──
  if (data.startTime && data.endTime) {
    const startMins = timeToMinutes(data.startTime);
    const endMins = timeToMinutes(data.endTime);

    if (isNaN(startMins)) {
      errors.push({
        field: "startTime",
        message: "Invalid start time format (use HH:mm).",
      });
    }
    if (isNaN(endMins)) {
      errors.push({
        field: "endTime",
        message: "Invalid end time format (use HH:mm).",
      });
    }

    if (!isNaN(startMins) && !isNaN(endMins)) {
      if (endMins <= startMins) {
        errors.push({
          field: "endTime",
          message: "End time must be after start time.",
        });
      } else {
        const durationMins = endMins - startMins;

        if (resource) {
          if (durationMins < resource.minDurationMinutes) {
            errors.push({
              field: "endTime",
              message: `Minimum booking duration is ${resource.minDurationMinutes} minutes.`,
            });
          }
          if (durationMins > resource.maxDurationMinutes) {
            errors.push({
              field: "endTime",
              message: `Maximum booking duration is ${resource.maxDurationMinutes} minutes (${Math.floor(resource.maxDurationMinutes / 60)}h).`,
            });
          }
        }
      }
    }
  }

  // ── Space-specific: headcount ──
  if (resource?.category === "space") {
    if (!data.headcount || data.headcount < 1) {
      errors.push({
        field: "headcount",
        message: "Number of people is required for space bookings.",
      });
    } else if (resource && data.headcount > resource.capacity) {
      errors.push({
        field: "headcount",
        message: `Maximum capacity is ${resource.capacity} people.`,
      });
    }
  }

  // ── Resource status ──
  if (resource && resource.status !== "available") {
    errors.push({
      field: "resourceId",
      message: `This resource is currently ${resource.status} and cannot be booked.`,
    });
  }

  return { valid: errors.length === 0, errors };
}

