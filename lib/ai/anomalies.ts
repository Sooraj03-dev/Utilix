export interface UserBookingRecord {
  userId: string;
  totalBookings: number;
  cancellations: number;
  noShows: number;
}

export interface AnomalyReport {
  userId: string;
  issue: string;
  cancellationRate?: number;
  noShows?: number;
}

export function detectAnomalies(
  records: UserBookingRecord[]
): AnomalyReport[] {
  const anomalies: AnomalyReport[] = [];

  for (const record of records) {
    const cancelRate =
      record.totalBookings > 0
        ? Math.round((record.cancellations / record.totalBookings) * 100) / 100
        : 0;

    if (record.noShows >= 2) {
      anomalies.push({
        userId: record.userId,
        issue: `Repeated no-shows (${record.noShows} unattended reservations)`,
        noShows: record.noShows,
      });
    } else if (record.totalBookings >= 3 && cancelRate > 0.5) {
      anomalies.push({
        userId: record.userId,
        issue: `High cancellation rate (${Math.round(cancelRate * 100)}% of bookings cancelled)`,
        cancellationRate: cancelRate,
      });
    }
  }

  return anomalies;
}
