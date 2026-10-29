import { describe, expect, it } from "vitest";
import { planBundle } from "../bundle.js";
import type { BundleRequest } from "../types.js";

describe("bundle.ts", () => {
  it("finds full bundle when common time window exists for all resources", () => {
    const input: BundleRequest = {
      teamId: "team-a",
      creditsAvailable: 10,
      wantedResources: [
        {
          resourceId: "printer-1",
          resourceName: "3D Printer",
          resourceType: "3d-printer",
          candidateWindows: [
            {
              slotId: "slot-p1",
              startsAt: "2026-11-02T10:00:00Z",
              endsAt: "2026-11-02T12:00:00Z",
              creditCost: 1,
            },
          ],
        },
        {
          resourceId: "arduino-1",
          resourceName: "Arduino Kit",
          resourceType: "electronics",
          candidateWindows: [
            {
              slotId: "slot-a1",
              startsAt: "2026-11-02T10:00:00Z",
              endsAt: "2026-11-02T12:00:00Z",
              creditCost: 1,
            },
          ],
        },
      ],
    };

    const res = planBundle(input);
    expect(res.plan.length).toBe(2);
    expect(res.unmet.length).toBe(0);
    expect(res.totalCreditCost).toBe(2);
    expect(res.explanation).toContain("all 2 requested resources");
  });

  it("schedules partial bundle when a resource has no matching window and reports unmet resource", () => {
    const input: BundleRequest = {
      teamId: "team-partial",
      creditsAvailable: 10,
      wantedResources: [
        {
          resourceId: "printer-1",
          resourceName: "3D Printer",
          resourceType: "3d-printer",
          candidateWindows: [
            {
              slotId: "slot-p1",
              startsAt: "2026-11-02T10:00:00Z",
              endsAt: "2026-11-02T12:00:00Z",
              creditCost: 0,
            },
          ],
        },
        {
          resourceId: "dslr-1",
          resourceName: "DSLR Camera",
          resourceType: "camera",
          candidateWindows: [], // no windows available
        },
      ],
    };

    const res = planBundle(input);
    expect(res.plan.length).toBe(1);
    expect(res.plan[0].resourceId).toBe("printer-1");
    expect(res.unmet.length).toBe(1);
    expect(res.unmet[0].resourceId).toBe("dslr-1");
    expect(res.unmet[0].reason).toContain("No available slots");
  });
});
