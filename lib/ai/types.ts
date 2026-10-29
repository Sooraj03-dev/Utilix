import { z } from "zod";

// Exclusion codes & constraints
export const ExclusionCodeSchema = z.enum([
  "TRAINING_MISSING", "LIMIT_REACHED", "RESOURCE_UNAVAILABLE", "OVERLAP", "INSUFFICIENT_CREDITS",
]);
export type ExclusionCode = z.infer<typeof ExclusionCodeSchema>;

export const RequestConstraintsSchema = z.object({
  trainingOk: z.boolean(), withinBookingLimit: z.boolean(), resourceAvailable: z.boolean(), noOverlap: z.boolean(),
});
export type RequestConstraints = z.infer<typeof RequestConstraintsSchema>;

// Policy schemas & criteria
export const PolicyWeightsSchema = z.object({
  usage: z.number().min(0), waiting: z.number().min(0), need: z.number().min(0), diversity: z.number().min(0),
});
export type PolicyWeights = z.infer<typeof PolicyWeightsSchema>;

export const TieBreakCriterionSchema = z.enum(["fewestSessionsThisMonth", "earliestRequest", "seededLottery"]);
export type TieBreakCriterion = z.infer<typeof TieBreakCriterionSchema>;

export const PolicySchema = z.object({
  version: z.string().default("v1"),
  freeSessionsPerWeek: z.number().int().min(0).default(2),
  monthlyCredits: z.number().int().min(0).default(10),
  defaultCreditCost: z.number().int().min(0).default(2),
  maxActiveBookings: z.number().int().min(0).default(3),
  weights: PolicyWeightsSchema.default({ usage: 0.5, waiting: 0.25, need: 0.2, diversity: 0.05 }),
  usageCap: z.number().positive().default(10),
  waitCap: z.number().positive().default(72),
  needWindowDays: z.number().positive().default(7),
  epsilon: z.number().positive().default(0.0001),
  tieBreakOrder: z.array(TieBreakCriterionSchema).default(["fewestSessionsThisMonth", "earliestRequest", "seededLottery"]),
});
export type Policy = z.infer<typeof PolicySchema>;
export type PartialPolicy = Partial<z.input<typeof PolicySchema>>;

// Slot & Request items
export const SlotSchema = z.object({
  id: z.string().min(1), resourceId: z.string().min(1), resourceName: z.string().min(1), resourceType: z.string().min(1),
  startsAt: z.string(), endsAt: z.string(), slotType: z.enum(["free", "credit"]),
  creditCost: z.number().int().min(0).default(0), capacity: z.number().int().min(1).default(1), restricted: z.boolean().default(false),
});
export type Slot = z.infer<typeof SlotSchema>;

export const StudentRequestSchema = z.object({
  requestId: z.string().min(1), requestedAt: z.string(), sessionsLast30d: z.number().min(0), sessionsThisMonth: z.number().min(0),
  waitingHours: z.number().min(0), deadlineDays: z.number().nullable(), departmentsInTeam: z.number().int().min(1),
  creditsAvailable: z.number().int().min(0), freeSessionsLeft: z.number().int().min(0), constraints: RequestConstraintsSchema,
});
export type StudentRequest = z.infer<typeof StudentRequestSchema>;
export type RequestItem = StudentRequest;

export const AllocateRequestSchema = z.object({
  slot: SlotSchema, policy: PolicySchema.partial().optional(),
  mode: z.enum(["new_requests", "promotion"]).default("new_requests"),
  seed: z.string().optional(), requests: z.array(StudentRequestSchema).max(100),
});
export type AllocateRequest = z.infer<typeof AllocateRequestSchema>;

// Scoring & Decision items
export const ScoreComponentsSchema = z.object({
  usage: z.number(), waiting: z.number(), need: z.number(), diversity: z.number(),
});
export type ScoreComponents = z.infer<typeof ScoreComponentsSchema>;

export const RankedRequestSchema = z.object({
  requestId: z.string(), rank: z.number().int().min(1), score: z.number(), components: ScoreComponentsSchema,
  decision: z.enum(["allocated", "waitlisted"]), creditCharge: z.number().int().min(0),
  requiresCoordinatorApproval: z.boolean(), waitlistPosition: z.number().int().positive().nullable(),
  studentReason: z.string(), coordinatorSummary: z.string(), counterfactual: z.string().nullable(),
});
export type RankedRequest = z.infer<typeof RankedRequestSchema>;
export type RankingItem = RankedRequest;

export const ExcludedRequestSchema = z.object({
  requestId: z.string(), decision: z.literal("excluded"), code: ExclusionCodeSchema, message: z.string(), studentReason: z.string(),
});
export type ExcludedRequest = z.infer<typeof ExcludedRequestSchema>;
export type ExcludedItem = ExcludedRequest;

export const TieBreakInfoSchema = z.object({
  used: z.boolean(), order: z.array(TieBreakCriterionSchema), seed: z.string().nullable(),
  tiedRequestIds: z.array(z.string()), decidedBy: z.string().nullable(),
});
export type TieBreakInfo = z.infer<typeof TieBreakInfoSchema>;

export const AuditRecordSchema = z.object({
  action: z.literal("ALLOCATION_DECISION"), ruleVersion: z.string(), slotId: z.string(), seed: z.string().nullable(),
  results: z.array(z.object({
    requestId: z.string(), decision: z.enum(["allocated", "waitlisted", "excluded"]),
    rank: z.number().nullable(), score: z.number().nullable(),
  })), source: z.enum(["ai", "fallback"]),
});
export type AuditRecord = z.infer<typeof AuditRecordSchema>;
export type AuditInfo = AuditRecord;

export const MetaSchema = z.object({
  latencyMs: z.number().int().min(0), policyVersion: z.string(),
  llm: z.object({ attempted: z.boolean(), succeeded: z.boolean(), provider: z.string(), errorCode: z.string().nullable() }),
});
export type Meta = z.infer<typeof MetaSchema>;

export const AllocateDataSchema = z.object({
  slotId: z.string(), ranking: z.array(RankedRequestSchema), excluded: z.array(ExcludedRequestSchema),
  tieBreak: TieBreakInfoSchema, audit: AuditRecordSchema,
});
export type AllocateData = z.infer<typeof AllocateDataSchema>;

export const AllocateResponseSchema = z.object({
  ok: z.literal(true), source: z.enum(["ai", "fallback"]), data: AllocateDataSchema, meta: MetaSchema,
});
export type AllocateResponse = z.infer<typeof AllocateResponseSchema>;

// Health & Error responses
export const HealthDataSchema = z.object({
  ok: z.boolean(), provider: z.string(), keyConfigured: z.boolean(),
  model: z.string().nullable(), fallbackOnly: z.boolean(), probeSucceeded: z.boolean().optional(),
});
export type HealthData = z.infer<typeof HealthDataSchema>;

export const ErrorResponseSchema = z.object({
  ok: z.literal(false), error: z.object({ code: z.string(), message: z.string(), issues: z.unknown().optional() }),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// Alternatives
export const CandidateSlotSchema = z.object({
  slotId: z.string(), resourceId: z.string(), resourceName: z.string(), resourceType: z.string(), department: z.string(),
  startsAt: z.string(), endsAt: z.string(), slotType: z.enum(["free", "credit"]), creditCost: z.number().int().min(0),
});
export type CandidateSlot = z.infer<typeof CandidateSlotSchema>;

export const AlternativesRequestSchema = z.object({
  request: StudentRequestSchema, targetSlot: SlotSchema.extend({ department: z.string().optional() }),
  candidateSlots: z.array(CandidateSlotSchema),
});
export type AlternativesRequest = z.infer<typeof AlternativesRequestSchema>;

export const AlternativeItemSchema = z.object({ slot: CandidateSlotSchema, rank: z.number().int().min(1), reason: z.string() });
export type AlternativeItem = z.infer<typeof AlternativeItemSchema>;

export const AlternativesDataSchema = z.object({ requestId: z.string(), alternatives: z.array(AlternativeItemSchema) });
export type AlternativesData = z.infer<typeof AlternativesDataSchema>;

// Bundle planning
export const WantedResourceSchema = z.object({
  resourceId: z.string(), resourceName: z.string(), resourceType: z.string(),
  candidateWindows: z.array(z.object({
    startsAt: z.string(), endsAt: z.string(), slotId: z.string(), creditCost: z.number().int().min(0).default(0),
  })),
});
export type WantedResource = z.infer<typeof WantedResourceSchema>;

export const BundleRequestSchema = z.object({
  teamId: z.string(), creditsAvailable: z.number().int().min(0), wantedResources: z.array(WantedResourceSchema).min(1).max(6),
});
export type BundleRequest = z.infer<typeof BundleRequestSchema>;

export const BundleDataSchema = z.object({
  teamId: z.string(),
  plan: z.array(z.object({
    resourceId: z.string(), resourceName: z.string(), slotId: z.string(),
    startsAt: z.string(), endsAt: z.string(), creditCost: z.number().int().min(0),
  })),
  unmet: z.array(z.object({
    resourceId: z.string(), resourceName: z.string(), reason: z.string(), alternatives: z.array(CandidateSlotSchema).optional(),
  })),
  totalCreditCost: z.number().int().min(0), explanation: z.string(),
});
export type BundleData = z.infer<typeof BundleDataSchema>;

// Insights & Simulator
export const ResourceStatSchema = z.object({
  resourceId: z.string(), name: z.string(), department: z.string(), totalSlots: z.number().int().min(0),
  bookedSlots: z.number().int().min(0), requests: z.number().int().min(0), waitlistLength: z.number().int().min(0), avgWaitHours: z.number().min(0),
});
export type ResourceStat = z.infer<typeof ResourceStatSchema>;

export const InsightsRequestSchema = z.object({
  resourceStats: z.array(ResourceStatSchema),
  studentSessions: z.record(z.string(), z.number()),
  departmentSessions: z.record(z.string(), z.number()),
});
export type InsightsRequest = z.infer<typeof InsightsRequestSchema>;

export const InsightsDataSchema = z.object({
  resourceUtilisation: z.array(z.object({ resourceId: z.string(), name: z.string(), department: z.string(), utilisation: z.number() })),
  underused: z.array(z.string()), overContended: z.array(z.string()),
  fairness: z.object({ gini: z.number(), jainIndex: z.number() }),
  departmentShare: z.record(z.string(), z.number()), redistributionSuggestions: z.array(z.string()), narrative: z.array(z.string()),
});
export type InsightsData = z.infer<typeof InsightsDataSchema>;

export const SimulateRequestSchema = z.object({
  students: z.number().int().min(2).default(50), resources: z.number().int().min(1).default(6),
  days: z.number().int().min(1).default(14), slotsPerResourcePerDay: z.number().int().min(1).default(4),
  aggressiveShare: z.number().min(0).max(1).default(0.2), seed: z.string().default("campus-share-sim-seed"),
});
export type SimulateRequest = z.infer<typeof SimulateRequestSchema>;

export const StrategyMetricsSchema = z.object({
  gini: z.number(), jainIndex: z.number(), utilisation: z.number(), percentStudentsServedAtLeastOnce: z.number(),
  maxWaitHours: z.number(), sessionsPerStudentSorted: z.array(z.number()), dailyUtilisation: z.array(z.number()),
});
export type StrategyMetrics = z.infer<typeof StrategyMetricsSchema>;

export const SimulateDataSchema = z.object({
  fcfs: StrategyMetricsSchema, fair: StrategyMetricsSchema, improvementSummary: z.string(),
});
export type SimulateData = z.infer<typeof SimulateDataSchema>;

// Condition & Forecast
export const ConditionRequestSchema = z.object({
  conditionBefore: z.string(), conditionAfter: z.string(), notes: z.string().optional().default(""),
});
export type ConditionRequest = z.infer<typeof ConditionRequestSchema>;

export const ConditionDataSchema = z.object({
  severity: z.enum(["none", "minor", "major"]), summary: z.string(), recommendedAction: z.string(),
});
export type ConditionData = z.infer<typeof ConditionDataSchema>;

export const ForecastBookingHistoryItemSchema = z.object({
  date: z.string(), resourceId: z.string(), slotsBooked: z.number().int().min(0),
});
export type ForecastBookingHistoryItem = z.infer<typeof ForecastBookingHistoryItemSchema>;

export const ForecastRequestSchema = z.object({
  history: z.array(ForecastBookingHistoryItemSchema), resourceIds: z.array(z.string()).optional(),
});
export type ForecastRequest = z.infer<typeof ForecastRequestSchema>;

export const ForecastDataSchema = z.object({
  forecast: z.record(z.string(), z.array(z.object({ date: z.string(), dayOfWeek: z.string(), predictedDemand: z.number() }))),
});
export type ForecastData = z.infer<typeof ForecastDataSchema>;
