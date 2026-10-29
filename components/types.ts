export type Role = "student" | "coordinator" | "admin";

export type ResourceStatus =
  | "available"
  | "confirmed"
  | "pending"
  | "waitlisted"
  | "blocked"
  | "maintenance"
  | "rejected"
  | "booked";

export type AccessType = "free" | "credits" | "training_required";

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  avatarUrl?: string;
  credits: number;
  maxCredits: number;
  yearOrDesignation: string;
  activeRequestsCount: number;
  trustScore: number; // 0-100% fair return rate
}

export interface ResourceItem {
  id: string;
  name: string;
  category: "3D Fabrication" | "Electronics & IoT" | "Media & Studio" | "Audio Booth" | "Heavy Workshop" | "Computing";
  department: string;
  location: string;
  accessType: AccessType;
  creditCost?: number;
  status: ResourceStatus;
  description: string;
  specs: string[];
  imageUrl: string;
  leadTimeHours: number;
  trainingPrerequisite?: string;
  availableSlotsToday: number;
  totalSlotsToday: number;
  maxBookingHoursPerWeek: number;
}

export interface DecisionFactor {
  factor: string;
  weight: "High" | "Medium" | "Normal";
  status: "positive" | "neutral" | "negative";
  description: string;
  pointsContribution?: string;
}

export interface AllocationDecision {
  requestId: string;
  resourceName: string;
  outcome: "APPROVED" | "WAITLISTED" | "ESCALATED" | "BLOCKED";
  score: number;
  maxPossibleScore: number;
  headlineSummary: string;
  plainLanguageReason: string;
  ruleCitations: string[];
  factors: DecisionFactor[];
  alternativeSlots?: string[];
  coordinatorNotes?: string;
  timestamp: string;
}

export interface BookingRequest {
  id: string;
  resourceId: string;
  resourceName: string;
  studentName: string;
  studentRole: string;
  department: string;
  projectName: string;
  projectType: "Coursework" | "Senior Capstone" | "Interdisciplinary Team" | "Club Activity" | "Independent Research";
  date: string;
  timeSlot: string;
  status: ResourceStatus;
  creditCost: number;
  justification: string;
  decision?: AllocationDecision;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: "info" | "success" | "warning" | "alert";
  actionUrl?: string;
}

export interface AllocationRuleInfo {
  number: number;
  title: string;
  tagline: string;
  explanation: string;
  whyItMatters: string;
  workedExample: string;
  impactBadge: "Anti-Hoarding" | "Equity" | "Utilization" | "Safety";
}
