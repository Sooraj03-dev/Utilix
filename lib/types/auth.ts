export type UserRole = "student" | "coordinator" | "admin";

export type AuthSource = "firebase" | "mock";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  assignedResourceIds?: string[];
  trainingVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  assignedResourceIds: string[];
  trainingVerified: boolean;
  source: AuthSource;
}

export interface AuthenticatedUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: UserRole;
  creditBalance: number;
  monthlyCredits: number;
  freeSessionsLeft: number;
  freeSessionsUsed: number;
  departmentId: string;
  departmentName?: string;
  year?: number;
  assignedResourceIds: string[];
  trainingVerified: boolean;
  reliability: number;
  unreadNotificationCount: number;
  source: AuthSource;
  isDemo?: boolean;
}

