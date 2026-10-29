// Utilix — Utilization CSV Export Route Handler (Server-only, Admin-only)
// Owner: A
import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/pages";
import {
  resourcesCol,
  bookingsCol,
  departmentsCol,
  availabilityWindowsCol,
} from "@/lib/db/collections";
import { docToEntity } from "@/lib/db/converters";
import { calculateUtilisationRate } from "@/lib/kpis";
import type { Resource, Booking, Department, AvailabilityWindow } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Escape string for CSV field */
function escapeCsv(field: string | number | undefined | null): string {
  if (field === null || field === undefined) return '""';
  const str = String(field);
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  // 1. Role verification: Admin only
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return new Response(
      JSON.stringify({
        error: "Forbidden: Admin authorization required to export telemetry data.",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 2. Date range evaluation
  const searchParams = request.nextUrl.searchParams;
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const fromParam = searchParams.get("from") || searchParams.get("start_date");
  const toParam = searchParams.get("to") || searchParams.get("end_date");

  const fromDate = fromParam ? new Date(fromParam) : defaultFrom;
  const toDate = toParam ? new Date(toParam) : now;

  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();
  const todayStr = now.toISOString().slice(0, 10);

  // 3. Parallel fetch of resources, bookings, departments, availability
  const [resourcesSnap, bookingsSnap, deptsSnap, windowsSnap] = await Promise.all([
    resourcesCol().get(),
    bookingsCol().get(),
    departmentsCol().get(),
    availabilityWindowsCol().get(),
  ]);

  const resources = resourcesSnap.docs
    .map((d) => docToEntity<Resource>(d.id, d.data()))
    .filter((r): r is Resource => r !== null);

  const bookings = bookingsSnap.docs
    .map((d) => docToEntity<Booking>(d.id, d.data()))
    .filter((b): b is Booking => b !== null);

  const departments = deptsSnap.docs
    .map((d) => docToEntity<Department>(d.id, d.data()))
    .filter((d): d is Department => d !== null);

  const deptMap = new Map<string, string>();
  for (const d of departments) {
    deptMap.set(d.id, d.name);
  }

  // Filter bookings within date range
  const rangeBookings = bookings.filter((b) => {
    const bookingStart = b.slot_start || b.created_at;
    return bookingStart >= fromIso && bookingStart <= toIso;
  });

  // Calculate booked hours and session counts per resource
  const bookedHoursByRes: Record<string, number> = {};
  const sessionsByRes: Record<string, number> = {};
  const completedStatuses = new Set(["confirmed", "checked_out", "returned"]);

  for (const b of rangeBookings) {
    if (completedStatuses.has(b.status)) {
      sessionsByRes[b.resource_id] = (sessionsByRes[b.resource_id] || 0) + 1;

      const start = new Date(b.slot_start).getTime();
      const end = new Date(b.slot_end).getTime();
      let hours = (end - start) / (1000 * 60 * 60);
      if (hours <= 0 || isNaN(hours)) hours = 1;

      bookedHoursByRes[b.resource_id] = (bookedHoursByRes[b.resource_id] || 0) + hours;
    }
  }

  // Approximate available hours per resource across evaluation window (default 8 hrs/day * 22 days)
  const daysDiff = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)));
  const defaultWorkingDays = Math.max(1, Math.round(daysDiff * (5 / 7)));

  // 4. Build CSV Rows
  const csvHeaders = [
    "Resource ID",
    "Resource Name",
    "Department",
    "Resource Type",
    "Location",
    "Credit Cost/hr",
    "Booked Hours",
    "Available Hours",
    "Utilisation Rate (%)",
    "Confirmed Sessions",
    "Status",
  ];

  const rows: string[] = [csvHeaders.join(",")];

  for (const res of resources) {
    const deptName = deptMap.get(res.department_id) || res.department_id || "Unassigned";
    const bookedHours = Math.round((bookedHoursByRes[res.id] || 0) * 10) / 10;
    const availableHours = defaultWorkingDays * 8; // 8 hrs daily working capacity
    const utilisationRate = calculateUtilisationRate(bookedHours, availableHours);
    const confirmedCount = sessionsByRes[res.id] || 0;

    const row = [
      escapeCsv(res.id),
      escapeCsv(res.name),
      escapeCsv(deptName),
      escapeCsv(res.type),
      escapeCsv(res.location),
      escapeCsv(res.credit_cost),
      escapeCsv(bookedHours),
      escapeCsv(availableHours),
      escapeCsv(utilisationRate),
      escapeCsv(confirmedCount),
      escapeCsv(res.status),
    ];

    rows.push(row.join(","));
  }

  const csvContent = rows.join("\r\n");

  // 5. Stream response with appropriate download headers
  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="utilix-utilisation-${todayStr}.csv"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
