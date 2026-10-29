import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildSeedDataset } from "../lib/mocks/seed-data";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "../lib/firebase/admin";
import { COLLECTIONS, DEFAULT_POLICY, type ResourceType } from "../lib/types";

try {
  if (typeof (process as any).loadEnvFile === "function") {
    (process as any).loadEnvFile(".env.local");
  }
} catch {
  // .env.local not found or already loaded
}

type SeedTarget = "mock" | "emulator" | "demo";

const DEV_PROJECT_ALLOWLIST = (process.env.SEED_DEV_PROJECT_ALLOWLIST ?? "utilix-d7843,utilix-dev,demo-utilix")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

function assertSeedingAllowed(target: SeedTarget): void {
  if (process.env.ALLOW_SEED !== "true") {
    throw new Error("Seeding is disabled. Set ALLOW_SEED=true explicitly.");
  }

  if (target === "demo") {
    const projectId = process.env.FIREBASE_PROJECT_ID ?? "";
    if (!projectId || !DEV_PROJECT_ALLOWLIST.includes(projectId)) {
      throw new Error(
        `Demo seeding blocked. Project "${projectId}" is not in SEED_DEV_PROJECT_ALLOWLIST (${DEV_PROJECT_ALLOWLIST.join(", ")}).`,
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

function mapCategoryToResourceType(cat: string): ResourceType {
  const normalized = cat.toLowerCase();
  if (normalized.includes("3d") || normalized.includes("printer")) return "printer_3d";
  if (normalized.includes("arduino") || normalized.includes("iot") || normalized.includes("esp32")) return "arduino_kit";
  if (normalized.includes("camera") || normalized.includes("dslr") || normalized.includes("video")) return "camera";
  if (normalized.includes("studio") || normalized.includes("booth") || normalized.includes("audio")) return "studio";
  if (normalized.includes("project") || normalized.includes("room")) return "project_room";
  return "lab_instrument";
}

async function upsertFirebaseData(target: SeedTarget): Promise<void> {
  assertSeedingAllowed(target);

  const db = getFirebaseAdminDb();
  const auth = getFirebaseAdminAuth();
  if (!db || !auth) {
    throw new Error(
      "Firebase Admin is not configured. Provide FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.",
    );
  }

  const dataset = buildSeedDataset();
  const nowISO = new Date().toISOString();

  // 1. Seed Departments
  const departments = [
    { id: "dept_eng", name: "Engineering & Robotics", code: "ENG" },
    { id: "dept_cs", name: "Computer Science", code: "CSE" },
    { id: "dept_media", name: "School of Media & Journalism", code: "MED" },
    { id: "dept_arts", name: "Design & Performing Arts", code: "ART" },
  ];
  for (const dept of departments) {
    await db.collection(COLLECTIONS.departments).doc(dept.id).set(dept, { merge: true });
  }

  // 2. Seed Users
  for (const user of dataset.users) {
    try {
      await auth.getUser(user.id);
    } catch (error) {
      const errorCode =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code: unknown }).code)
          : "";
      if (errorCode.includes("user-not-found") || errorCode.includes("not-found")) {
        await auth.createUser({
          uid: user.id,
          email: user.email,
          displayName: user.displayName,
          emailVerified: true,
        }).catch(() => null);
      }
    }

    const firestoreUser = {
      id: user.id,
      name: user.displayName,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      department_id: user.department || "dept_eng",
      year: 4,
      credit_balance: user.credits ?? 10,
      free_sessions_used: 0,
      free_sessions_week: "2026-W44",
      active: true,
      trainingVerified: Boolean(user.trainingVerified),
      assignedResourceIds: user.assignedResourceIds || [],
      created_at: nowISO,
    };
    await db.collection(COLLECTIONS.users).doc(user.id).set(firestoreUser, { merge: true });
  }

  // 3. Seed Resources
  for (const res of dataset.resources) {
    const firestoreResource = {
      id: res.id,
      name: res.name,
      type: mapCategoryToResourceType(res.category),
      department_id: "dept_eng",
      coordinator_id: res.coordinatorId || "coordinator-01",
      location: "Main Campus Lab",
      photo_url: null,
      restricted: Boolean(res.trainingRequired),
      requires_training: res.trainingRequired ? res.category : null,
      credit_cost: 2,
      max_session_minutes: 180,
      status: "available",
      last_inspection_at: nowISO,
    };
    await db.collection(COLLECTIONS.resources).doc(res.id).set(firestoreResource, { merge: true });
  }

  // 4. Seed Policies
  await db.collection(COLLECTIONS.policies).doc("v1").set(DEFAULT_POLICY, { merge: true });

  // 5. Seed Certifications
  for (const cert of dataset.certifications) {
    const docId = `${cert.userId}_${cert.resourceCategory}`;
    const certData = {
      id: docId,
      user_id: cert.userId,
      training_type: cert.resourceCategory,
      certified_by: "admin-01",
      certified_at: cert.certifiedAt || nowISO,
    };
    await db.collection(COLLECTIONS.training_certifications).doc(docId).set(certData, { merge: true });
  }

  // 6. Seed Bookings
  for (const b of dataset.bookings) {
    const bookingData = {
      id: b.id,
      resource_id: b.resourceId,
      user_id: b.userId,
      member_ids: [b.userId],
      team_department_ids: ["dept_eng"],
      bundle_id: null,
      slot_start: b.startAt,
      slot_end: b.endAt,
      slot_ids: [`${b.resourceId}_${b.startAt.replace(/[-:]/g, "").slice(0, 13)}`],
      purpose: b.reason || "Course project prototyping",
      declared_deadline: null,
      status: b.status,
      slot_type: "credit",
      cost_credits: 2,
      allocation_score: 85,
      decision_reason: "Approved based on academic deadline and availability",
      decision_source: "fallback",
      tiebreak: null,
      policy_version: "v1",
      created_at: b.startAt || nowISO,
      updated_at: nowISO,
    };
    await db.collection(COLLECTIONS.bookings).doc(b.id).set(bookingData, { merge: true });
  }

  // 7. Seed Credit Ledger
  for (const tx of dataset.creditTransactions) {
    const ledgerData = {
      id: tx.id,
      user_id: tx.userId,
      delta: tx.delta,
      reason: tx.action === "refund" ? "cancellation_refund" : "booking_deduction",
      booking_id: tx.bookingId || null,
      balance_after: tx.balanceAfter || 10,
      idempotency_key: tx.id,
      created_at: tx.timestamp || nowISO,
    };
    await db.collection(COLLECTIONS.credit_ledger).doc(tx.id).set(ledgerData, { merge: true });
  }

  // 8. Seed Notifications
  for (const n of dataset.notifications) {
    const notifData = {
      id: n.id,
      user_id: n.userId,
      type: "general",
      title: n.title,
      body: n.message,
      read: Boolean(n.read),
      created_at: n.createdAt || nowISO,
    };
    await db.collection(COLLECTIONS.notifications).doc(n.id).set(notifData, { merge: true });
  }

  // 9. Seed Audit Logs
  for (const a of dataset.auditLogs) {
    const auditData = {
      id: a.id,
      actor_id: a.actorId,
      action: "resource_updated",
      entity_type: a.entityType,
      entity_id: a.entityId,
      rule_version: "v1",
      scores: null,
      reason: "Seeded audit entry",
      created_at: a.createdAt || nowISO,
    };
    await db.collection(COLLECTIONS.audit_log).doc(a.id).set(auditData, { merge: true });
  }

  console.log(
    `Seed complete (${target}): ${dataset.users.length} users, ${dataset.resources.length} resources, ${dataset.bookings.length} bookings written to collections: ${Object.values(COLLECTIONS).join(", ")}.`,
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
