import type {
  ForecastBookingHistoryItem,
  ForecastData,
  ForecastRequest,
} from "./types.js";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function forecastDemand(input: ForecastRequest): ForecastData {
  const { history, resourceIds } = input;

  const targetResources =
    resourceIds && resourceIds.length > 0
      ? resourceIds
      : Array.from(new Set(history.map((h) => h.resourceId)));

  // Group by (resourceId, dayOfWeekIndex)
  const stats = new Map<string, { sum: number; count: number }>();
  let maxTime = 0;

  for (const item of history) {
    const d = new Date(item.date);
    const t = d.getTime();
    if (t > maxTime) maxTime = t;

    const dayIndex = d.getUTCDay();
    const key = `${item.resourceId}:${dayIndex}`;

    const current = stats.get(key) || { sum: 0, count: 0 };
    current.sum += item.slotsBooked;
    current.count += 1;
    stats.set(key, current);
  }

  const baseDate = maxTime > 0 ? new Date(maxTime) : new Date();
  const forecast: ForecastData["forecast"] = {};

  for (const resId of targetResources) {
    const series: Array<{ date: string; dayOfWeek: string; predictedDemand: number }> = [];

    for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
      const forecastDate = new Date(baseDate);
      forecastDate.setUTCDate(forecastDate.getUTCDate() + dayOffset);

      const dayOfWeekIndex = forecastDate.getUTCDay();
      const dayName = DAY_NAMES[dayOfWeekIndex];
      const key = `${resId}:${dayOfWeekIndex}`;

      const stat = stats.get(key);
      const predictedDemand =
        stat && stat.count > 0 ? Math.round((stat.sum / stat.count) * 10) / 10 : 1.0;

      series.push({
        date: forecastDate.toISOString().split("T")[0],
        dayOfWeek: dayName,
        predictedDemand,
      });
    }

    forecast[resId] = series;
  }

  return { forecast };
}
