import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildSeedDataset } from "../lib/mocks/seed-data";
import { getAdminAuth, getAdminDb } from "../lib/firebase/admin";

type SeedTarget = "mock" | "emulator" | "demo";

const DEV_PROJECT_ALLOWLIST = (process.env.SEED_DEV_PROJECT_ALLOWLIST ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const USER_COLLECTION = "users";
const RESOURCE_COLLECTION = "resources";
const BOOKING_COLLECTION = "bookings";
const TRAINING_COLLECTION = "trainingCertifications";
const CREDIT_COLLECTION = "creditTransactions";
const SLOT_COLLECTION = "availabilitySlots";
const MAINTENANCE_COLLECTION = "maintenanceRecords";
const NOTIFICATION_COLLECTION = "notifications";
const AUDIT_COLLECTION = "auditLogs";
const POLICY_COLLECTION = "policies";

function assertSeedingAllowed(target: SeedTarget): void {
  if (process.env.ALLOW_SEED !== "true") {
    throw new Error("Seeding is disabled. Set ALLOW_SEED=true explicitly.");
  }

  if (target === "demo") {
    const projectId = process.env.FIREBASE_PROJECT_ID ?? "";
    if (!projectId || !DEV_PROJECT_ALLOWLIST.includes(projectId)) {
      throw new Error(
        "Demo seeding blocked. Add FIREBASE_PROJECT_ID to SEED_DEV_PROJECT_ALLOWLIST.",
      );
    }
  }
}

async function seedMockFile(): Promise<void> {
  const dataset = buildSeedDataset();
  const outputDir = path.resolve(process.cwd(), "scripts", "generated");
  const outputPath = path.join(outputDir, "mock-seed-data.json");
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, JSON.stringify(dataset, null, 2), "utf8");
  console.log(`Mock dataset written: ${outputPath}`);
}

async function upsertFirebaseData(target: SeedTarget): Promise<void> {
  assertSeedingAllowed(target);

  const db = getAdminDb();
  const auth = getAdminAuth();
  if (!db || !auth) {
    throw new Error(
      "Firebase Admin is not configured. Provide FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.",
    );
  }

  const dataset = buildSeedDataset();

  for (const user of dataset.users) {
    try {
      await auth.getUser(user.id);
    } catch (error) {
      const errorCode =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code: unknown }).code)
          : "";
      if (!errorCode.includes("user-not-found")) {
        throw error;
      }
      await auth.createUser({
        uid: user.id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: true,
      });
    }
    await db.collection(USER_COLLECTION).doc(user.id).set(user, { merge: true });
  }

  for (const resource of dataset.resources) {
    await db.collection(RESOURCE_COLLECTION).doc(resource.id).set(resource, { merge: true });
  }

  for (const booking of dataset.bookings) {
    await db.collection(BOOKING_COLLECTION).doc(booking.id).set(booking, { merge: true });
  }

  for (const certification of dataset.certifications) {
    await db.collection(TRAINING_COLLECTION).doc(certification.id).set(certification, { merge: true });
  }

  for (const tx of dataset.creditTransactions) {
    await db.collection(CREDIT_COLLECTION).doc(tx.id).set(tx, { merge: true });
  }

  for (const slot of dataset.availabilitySlots) {
    await db.collection(SLOT_COLLECTION).doc(slot.id).set(slot, { merge: true });
  }

  for (const maintenance of dataset.maintenanceRecords) {
    await db.collection(MAINTENANCE_COLLECTION).doc(maintenance.id).set(maintenance, { merge: true });
  }

  for (const notification of dataset.notifications) {
    await db.collection(NOTIFICATION_COLLECTION).doc(notification.id).set(notification, { merge: true });
  }

  for (const auditLog of dataset.auditLogs) {
    await db.collection(AUDIT_COLLECTION).doc(auditLog.id).set(auditLog, { merge: true });
  }

  for (const policy of dataset.policies) {
    await db.collection(POLICY_COLLECTION).doc(policy.id).set(policy, { merge: true });
  }

  console.log(
    `Seed complete (${target}): ${dataset.users.length} users, ${dataset.resources.length} resources, ${dataset.bookings.length} bookings.`,
  );
}

export async function runSeed(target: SeedTarget): Promise<void> {
  if (target === "mock") {
    await seedMockFile();
    return;
  }

  await upsertFirebaseData(target);
}

if (require.main === module) {
  const target = (process.env.SEED_TARGET ?? "mock") as SeedTarget;
  runSeed(target).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
