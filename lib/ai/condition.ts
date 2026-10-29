import type { ConditionData, ConditionRequest } from "./types.js";

const MAJOR_KEYWORDS = [
  "broken",
  "shattered",
  "cracked",
  "smoke",
  "burnt",
  "damage",
  "malfunction",
  "unusable",
  "hazard",
  "spark",
  "jammed",
  "failed",
];

const MINOR_KEYWORDS = [
  "scratch",
  "smudge",
  "dirty",
  "loose",
  "wear",
  "fingerprint",
  "scuff",
  "dusty",
  "stain",
];

export function assessCondition(input: ConditionRequest): ConditionData {
  const combinedText = `${input.conditionBefore} ${input.conditionAfter} ${input.notes}`.toLowerCase();

  const isMajor = MAJOR_KEYWORDS.some((kw) => combinedText.includes(kw));
  if (isMajor) {
    return {
      severity: "major",
      summary: "Significant equipment fault or structural damage detected in post-session report.",
      recommendedAction: "Block resource from reservation pool until technician inspection.",
    };
  }

  const isMinor = MINOR_KEYWORDS.some((kw) => combinedText.includes(kw));
  if (isMinor) {
    return {
      severity: "minor",
      summary: "Minor cosmetic wear, surface marks, or light cleaning required.",
      recommendedAction: "Flag for routine maintenance and coordinator visual inspection.",
    };
  }

  return {
    severity: "none",
    summary: "Equipment returned in normal operational condition with no reported issues.",
    recommendedAction: "Return to active inventory without restrictions.",
  };
}
