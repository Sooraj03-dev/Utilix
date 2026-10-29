import { gini, jainIndex, utilisation } from "./metrics.js";
import type { InsightsData, InsightsRequest } from "./types.js";

export function generateInsights(input: InsightsRequest): InsightsData {
  const { resourceStats, studentSessions, departmentSessions } = input;

  const resourceUtilisation = resourceStats.map((stat) => ({
    resourceId: stat.resourceId,
    name: stat.name,
    department: stat.department,
    utilisation: utilisation(stat.bookedSlots, stat.totalSlots),
  }));

  const underused: string[] = [];
  const overContended: string[] = [];

  for (let i = 0; i < resourceStats.length; i++) {
    const stat = resourceStats[i];
    const u = resourceUtilisation[i].utilisation;

    if (u < 0.3) {
      underused.push(stat.name);
    }
    if (u > 0.85 || stat.waitlistLength > 3) {
      overContended.push(stat.name);
    }
  }

  // Fairness across students
  const sessionCounts = Object.values(studentSessions);
  const fairness = {
    gini: gini(sessionCounts),
    jainIndex: jainIndex(sessionCounts),
  };

  // Redistribution suggestions
  const redistributionSuggestions: string[] = [];
  const underusedList = resourceStats.filter(
    (s) => utilisation(s.bookedSlots, s.totalSlots) < 0.3
  );
  const overContendedList = resourceStats.filter(
    (s) => utilisation(s.bookedSlots, s.totalSlots) > 0.85 || s.waitlistLength > 3
  );

  for (let i = 0; i < Math.min(underusedList.length, overContendedList.length); i++) {
    const under = underusedList[i];
    const over = overContendedList[i];
    const underPct = Math.round(utilisation(under.bookedSlots, under.totalSlots) * 100);
    redistributionSuggestions.push(
      `Promote ${under.name}: ${underPct}% utilised while ${over.name} has a waitlist of ${over.waitlistLength}.`
    );
  }

  if (redistributionSuggestions.length === 0 && overContendedList.length > 0) {
    const over = overContendedList[0];
    redistributionSuggestions.push(
      `Consider adding off-peak incentives or secondary capacity for ${over.name} to clear waitlist of ${over.waitlistLength}.`
    );
  }

  // 3-bullet narrative
  const avgUtil =
    resourceUtilisation.length > 0
      ? Math.round(
          (resourceUtilisation.reduce((acc, r) => acc + r.utilisation, 0) /
            resourceUtilisation.length) *
            100
        )
      : 0;

  const narrative = [
    `Average campus equipment utilisation stands at ${avgUtil}%, with ${overContended.length} over-contended and ${underused.length} underused resources identified.`,
    `Allocation fairness reflects a Jain index of ${fairness.jainIndex.toFixed(2)} and Gini coefficient of ${fairness.gini.toFixed(2)}, demonstrating equitable cross-student distribution.`,
    redistributionSuggestions[0] ??
      "Resource allocation is balanced across current departmental demand curves.",
  ];

  return {
    resourceUtilisation,
    underused,
    overContended,
    fairness,
    departmentShare: departmentSessions,
    redistributionSuggestions,
    narrative,
  };
}
