// Utilix — AI service contracts
// Owner: A (types), B (ai-client implementation)

import type { PolicyWeights } from "./policy";

export type { PolicyWeights };

export interface AISlot {
  id: string;
  resourceId: string;
  resourceName: string;
  department: string;
  startTime: string;
  endTime: string;
  capacity?: number;
  slotType?: "free" | "credit";
  creditCost?: number;
}

export interface AIPolicy {
  weights?: PolicyWeights;
  tieBreakerOrder?: string[];
  defaultCreditCost?: number;
  epsilon?: number;
  seed?: string;
}

export interface AIRequestItem {
  id: string;
  userId: string;
  userName?: string;
  department: string;
  requestedSlotId: string;
  sessionsThisMonth?: number;
  waitingHours?: number;
  projectNeedScore?: number;
  isPriorityGroup?: boolean;
  trainingVerified?: boolean;
  withinBookingLimit?: boolean;
  noOverlap?: boolean;
  resourceAvailable?: boolean;
  currentCreditBalance?: number;
  freeSessionsLeft?: number;
  submittedAt: string;
  metadata?: Record<string, unknown>;
}

export interface AIScoreBreakdown {
  usage: number;
  waiting: number;
  need: number;
  diversity: number;
}

export interface AIRankingItem {
  requestId: string;
  userId: string;
  rank: number;
  totalScore: number;
  scoreBreakdown: AIScoreBreakdown;
  studentReason: string;
  coordinatorSummary: string;
  decidedBy?: string | null;
  tiedWith?: string[];
  explanationSource?: string | null;
}

export interface AIExcludedItem {
  requestId: string;
  userId: string;
  reason: string;
  code: string;
}

export interface AITieBreakInfo {
  tiedGroupsCount: number;
  totalTiedRequests: number;
  tiesDecided: Array<Record<string, unknown>>;
  seedUsed?: string | null;
}

export interface AIAuditInfo {
  totalRequests: number;
  eligibleRequests: number;
  excludedRequests: number;
  capacity: number;
  policyUsed: AIPolicy;
  tieBreakInfo: AITieBreakInfo;
  executionTimeMs: number;
}

export interface AIAllocateRequest {
  slot: AISlot;
  requests: AIRequestItem[];
  policy?: AIPolicy;
  seed?: string;
  mode?: "standard" | "promotion";
}

export interface AIAllocateResponse {
  allocated: AIRankingItem[];
  waitlist: AIRankingItem[];
  excluded: AIExcludedItem[];
  audit: AIAuditInfo;
}

export interface AIAlternativeOption {
  slot: AISlot;
  scoreDiff: number;
  reason: string;
}

export interface AIAlternativesRequest {
  requestedSlot: AISlot;
  availableSlots: AISlot[];
  userRequest: AIRequestItem;
  limit?: number;
}

export interface AIAlternativesResponse {
  alternatives: AIAlternativeOption[];
}

export interface AIBundleRequest {
  resourceIds: string[];
  slotsByResource: Record<string, AISlot[]>;
  teamRequest: AIRequestItem;
  preferredStart?: string;
}

export interface AIBundleResponse {
  bundleSlots: AISlot[];
  isComplete: boolean;
  reason: string;
}

export interface AIInsightsResponse {
  equipmentUtilization: Record<string, number>;
  contentionRate: Record<string, number>;
  giniCoefficient: number;
  jainFairnessIndex: number;
  recommendations: Array<Record<string, string>>;
  narrative: string[];
}
