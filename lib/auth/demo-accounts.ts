import type { UserRole } from "../types/auth";

export interface DemoAccount {
  uid: string;
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  department: string;
  department_id: string;
  assignedResourceIds: string[];
  trainingVerified: boolean;
  credit_balance: number;
}

export const DEMO_PASSWORD = "UtilixPassword2026!";

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    uid: "student-01",
    email: "student01@utilix.local",
    password: DEMO_PASSWORD,
    displayName: "Student 01",
    role: "student",
    department: "CSE",
    department_id: "dept_cs",
    assignedResourceIds: [],
    trainingVerified: true,
    credit_balance: 20,
  },
  {
    uid: "coordinator-01",
    email: "coord-lab@utilix.local",
    password: DEMO_PASSWORD,
    displayName: "Lab Coordinator",
    role: "coordinator",
    department: "ECE",
    department_id: "dept_eng",
    assignedResourceIds: [
      "resource-arduino-kit-a",
      "resource-esp32-board-a",
      "resource-raspberry-pi-a",
      "resource-lab-equipment-a",
    ],
    trainingVerified: true,
    credit_balance: 0,
  },
  {
    uid: "admin-01",
    email: "admin-platform@utilix.local",
    password: DEMO_PASSWORD,
    displayName: "Platform Admin",
    role: "admin",
    department: "Operations",
    department_id: "dept_eng",
    assignedResourceIds: [],
    trainingVerified: true,
    credit_balance: 0,
  },
];

export function findDemoAccountByCredentials(
  email: string,
  password: string,
): DemoAccount | null {
  const normalizedEmail = email.trim().toLowerCase();
  return (
    DEMO_ACCOUNTS.find(
      (account) =>
        account.email.toLowerCase() === normalizedEmail &&
        account.password === password,
    ) ?? null
  );
}

export function findDemoAccountByEmail(email: string): DemoAccount | null {
  const normalizedEmail = email.trim().toLowerCase();
  return (
    DEMO_ACCOUNTS.find(
      (account) => account.email.toLowerCase() === normalizedEmail,
    ) ?? null
  );
}

import { buildSeedDataset } from "../mocks/seed-data";

export function findDemoAccountByUid(uid: string): DemoAccount | null {
  const primary = DEMO_ACCOUNTS.find((account) => account.uid === uid);
  if (primary) return primary;

  // Check full seed dataset
  try {
    const dataset = buildSeedDataset();
    const seeded = dataset.users.find((u) => u.id === uid || u.email.toLowerCase() === uid.toLowerCase());
    if (seeded) {
      return {
        uid: seeded.id,
        email: seeded.email,
        password: DEMO_PASSWORD,
        displayName: seeded.displayName,
        role: seeded.role,
        department: seeded.department || "Engineering",
        department_id: "dept_eng",
        assignedResourceIds: seeded.assignedResourceIds || [],
        trainingVerified: Boolean(seeded.trainingVerified),
        credit_balance: seeded.credits || 10,
      };
    }
  } catch {
    // Ignore if mock dataset unavailable
  }

  // Legacy test UIDs
  if (uid === "user_alice") {
    return {
      uid: "user_alice",
      email: "alice.chen@utilix.local",
      password: DEMO_PASSWORD,
      displayName: "Alice Chen",
      role: "student",
      department: "CSE",
      department_id: "dept_cs",
      assignedResourceIds: [],
      trainingVerified: true,
      credit_balance: 20,
    };
  }
  if (uid === "user_carol") {
    return {
      uid: "user_carol",
      email: "carol.coord@utilix.local",
      password: DEMO_PASSWORD,
      displayName: "Carol Coordinator",
      role: "coordinator",
      department: "ECE",
      department_id: "dept_eng",
      assignedResourceIds: [
        "resource-arduino-kit-a",
        "res_printer1",
        "res_studio_a",
        "res_laser1",
      ],
      trainingVerified: true,
      credit_balance: 0,
    };
  }
  if (uid === "user_dave") {
    return {
      uid: "user_dave",
      email: "dave.admin@utilix.local",
      password: DEMO_PASSWORD,
      displayName: "Dave Admin",
      role: "admin",
      department: "Operations",
      department_id: "dept_eng",
      assignedResourceIds: [],
      trainingVerified: true,
      credit_balance: 0,
    };
  }

  return null;
}

export function getDemoCredentialsForRole(role: UserRole): {
  email: string;
  pass: string;
} {
  const account = DEMO_ACCOUNTS.find((a) => a.role === role);
  if (!account) {
    return { email: "student01@utilix.local", pass: DEMO_PASSWORD };
  }
  return { email: account.email, pass: account.password };
}
