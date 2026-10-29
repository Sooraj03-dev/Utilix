export type UserRole = "student" | "coordinator" | "admin";

export type AuthSource = "firebase" | "mock";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
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
  role: UserRole;
  assignedResourceIds: string[];
  trainingVerified: boolean;
  source: AuthSource;
}

