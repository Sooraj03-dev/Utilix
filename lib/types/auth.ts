export type UserRole = "student" | "coordinator" | "admin";

export type AuthSource = "firebase" | "mock";

export type AccountStatus = "active" | "pending_approval" | "suspended";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  studentId?: string;
  departmentId?: string;
  academicYear?: number;
  semester?: number;
  phoneNumber?: string;
  campus?: string;
  profileCompleted?: boolean;
  accountStatus?: AccountStatus;
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
  studentId?: string;
  departmentId?: string;
  academicYear?: number;
  semester?: number;
  phoneNumber?: string;
  campus?: string;
  profileCompleted?: boolean;
  accountStatus?: AccountStatus;
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
  studentId?: string;
  departmentId: string;
  departmentName?: string;
  year?: number;
  academicYear?: number;
  semester?: number;
  phoneNumber?: string;
  campus?: string;
  profileCompleted?: boolean;
  accountStatus?: AccountStatus;
  creditBalance: number;
  monthlyCredits: number;
  freeSessionsLeft: number;
  freeSessionsUsed: number;
  assignedResourceIds: string[];
  trainingVerified: boolean;
  reliability: number;
  unreadNotificationCount: number;
  source: AuthSource;
  isDemo?: boolean;
}

