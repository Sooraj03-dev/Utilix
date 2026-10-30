import fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Ensure .env.local is synchronously loaded before any Firebase admin operations
if (fs.existsSync(".env.local")) {
  try {
    (process as any).loadEnvFile(".env.local");
  } catch {
    // Ignore if already loaded
  }
}

import { Timestamp } from "firebase-admin/firestore";
import { buildSeedDataset } from "../lib/mocks/seed-data";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "../lib/firebase/admin";
import {
  COLLECTIONS,
  DEFAULT_POLICY,
  type ResourceType,
  type ResourceStatus,
  type BookingStatus,
} from "../lib/types";

type SeedTarget = "mock" | "emulator" | "demo";

const DEV_PROJECT_ALLOWLIST = (
  process.env.SEED_DEV_PROJECT_ALLOWLIST ?? "utilix-d7843,utilix-dev,demo-utilix"
)
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

// ─── Fast Batch Writer ────────────────────────────────────────────────────────

class BatchWriter {
  private batch: FirebaseFirestore.WriteBatch;
  private count = 0;

  constructor(private db: FirebaseFirestore.Firestore) {
    this.batch = db.batch();
  }

  async set(
    ref: FirebaseFirestore.DocumentReference,
    data: any,
    options: { merge?: boolean } = { merge: true },
  ) {
    this.batch.set(ref, data, options);
    this.count++;
    if (this.count >= 400) {
      await this.commit();
    }
  }

  async commit() {
    if (this.count > 0) {
      await this.batch.commit();
      this.batch = this.db.batch();
      this.count = 0;
    }
  }
}

// ─── Dynamic Time Helpers ─────────────────────────────────────────────────────

const NOW = new Date();
const NOW_ISO = NOW.toISOString();

function makeIso(dayOffset: number, hour: number, minute = 0): string {
  const d = new Date(NOW.getTime());
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

function toTs(isoStr: string | null | undefined): FirebaseFirestore.Timestamp | null {
  if (!isoStr) return null;
  return Timestamp.fromDate(new Date(isoStr));
}

function makeSlotId(resourceId: string, isoStr: string): string {
  return `${resourceId}_${isoStr.replace(/[-:]/g, "").slice(0, 13)}`;
}

// ─── Upsert Live Firestore Data ───────────────────────────────────────────────

async function upsertFirebaseData(target: SeedTarget): Promise<void> {
  assertSeedingAllowed(target);

  const db = getFirebaseAdminDb();
  const auth = getFirebaseAdminAuth();
  if (!db || !auth) {
    throw new Error(
      "Firebase Admin is not configured. Provide FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.",
    );
  }

  console.log(`Starting comprehensive presentation data seeding (${target})...`);
  const writer = new BatchWriter(db);

  // 1. Seed Departments (6 Campus Departments)
  console.log("Seeding 6 departments...");
  const departments = [
    { id: "dept_eng", name: "Engineering & Robotics", code: "ENG" },
    { id: "dept_cs", name: "Computer Science & AI", code: "CSE" },
    { id: "dept_media", name: "School of Media & Journalism", code: "MED" },
    { id: "dept_design", name: "Product Design & Architecture", code: "DSN" },
    { id: "dept_arts", name: "Design & Performing Arts", code: "ART" },
    { id: "dept_science", name: "Physical Sciences & IoT", code: "SCI" },
  ];
  for (const dept of departments) {
    await writer.set(db.collection(COLLECTIONS.departments).doc(dept.id), dept);
  }

  // 2. Discover Existing Users in Firestore (Google user accounts, demo logins)
  console.log("Checking existing registered users in Firestore...");
  const existingUsersSnap = await db.collection(COLLECTIONS.users).get();
  const existingUserIds: string[] = [];
  const googleStudentIds: string[] = [];

  existingUsersSnap.forEach((doc) => {
    existingUserIds.push(doc.id);
    const data = doc.data();
    if (data.role === "student") {
      googleStudentIds.push(doc.id);
    }
  });
  console.log(`Found ${existingUsersSnap.size} existing users in Firestore. Student IDs:`, googleStudentIds);

  // 3. Seed Base Demo Personas
  console.log("Seeding demo personas (students, coordinators, admins)...");
  const baseStudents = [
    { id: "test-student-aarav", name: "Aarav Sharma", email: "student.test@utilix.edu", dept: "dept_cs", credits: 16 },
    { id: "student-01", name: "Student 01 (Priya Nair)", email: "student01@utilix.local", dept: "dept_eng", credits: 25 },
    { id: "student-02", name: "Student 02 (Liam Wilson)", email: "student02@utilix.local", dept: "dept_cs", credits: 20 },
    { id: "student-03", name: "Student 03 (Ananya Rao)", email: "student03@utilix.local", dept: "dept_media", credits: 35 },
    { id: "student-04", name: "Student 04 (Marcus Chen)", email: "student04@utilix.local", dept: "dept_design", credits: 18 },
    { id: "student-05", name: "Student 05 (Fatima Al-Sayed)", email: "student05@utilix.local", dept: "dept_arts", credits: 22 },
    { id: "student-06", name: "Student 06 (Devin Murphy)", email: "student06@utilix.local", dept: "dept_science", credits: 28 },
    { id: "student-07", name: "Student 07 (Chloe Dubois)", email: "student07@utilix.local", dept: "dept_eng", credits: 30 },
    { id: "student-08", name: "Student 08 (Rahul Verma)", email: "student08@utilix.local", dept: "dept_cs", credits: 24 },
  ];

  const coordinators = [
    {
      id: "coordinator-01",
      name: "Dr. Sarah Lin (Lab Coordinator)",
      email: "coord-lab@utilix.local",
      dept: "dept_eng",
      assigned: [
        "res_printer1",
        "res_3d_formlabs_sla",
        "res_iot_esp32_kit",
        "res_robot_niryo_arm",
        "res_elec_rohde_scope",
        "res_elec_keysight_gen",
        "resource-arduino-kit-a",
        "resource-3d-printer-a",
        "resource-lab-equipment-a",
      ],
    },
    {
      id: "test-coordinator-sarah",
      name: "Dr. Sarah Lin",
      email: "coordinator.test@utilix.edu",
      dept: "dept_eng",
      assigned: [
        "res_printer1",
        "res_3d_formlabs_sla",
        "res_iot_esp32_kit",
        "res_robot_niryo_arm",
        "res_elec_rohde_scope",
        "res_elec_keysight_gen",
      ],
    },
    {
      id: "coordinator-02",
      name: "Elena Rostova (Media & Arts Coordinator)",
      email: "coord-media@utilix.local",
      dept: "dept_media",
      assigned: [
        "res_cam_sony_a7iv",
        "res_cam_blackmagic_6k",
        "res_cam_canon_r5",
        "res_audio_rode_rig",
        "res_studio_booth_a",
        "res_audio_field_kit",
        "resource-dslr-camera-a",
        "resource-recording-rig-a",
      ],
    },
    {
      id: "coordinator-03",
      name: "David Kim (Makerspace & CS Coordinator)",
      email: "coord-makerspace@utilix.local",
      dept: "dept_cs",
      assigned: [
        "res_3d_prusa_mk4",
        "res_arduino_kit5",
        "res_iot_rpi5_cluster",
        "res_ai_jetson_orin",
        "res_vr_vision_pro",
        "res_room_collab_204",
        "resource-project-room-a",
        "resource-esp32-board-a",
      ],
    },
  ];

  const admins = [
    { id: "admin-01", name: "Platform Admin", email: "admin-platform@utilix.local", dept: "dept_cs" },
    { id: "admin-02", name: "Policy Admin", email: "admin-policy@utilix.local", dept: "dept_eng" },
    { id: "test-admin-marcus", name: "Marcus Vance", email: "admin.test@utilix.edu", dept: "dept_cs" },
  ];

  // Parallel Auth user check/creation for test personas
  const allPersonas = [
    ...baseStudents.map((s) => ({ ...s, role: "student" as const })),
    ...coordinators.map((c) => ({ ...c, role: "coordinator" as const })),
    ...admins.map((a) => ({ ...a, role: "admin" as const })),
  ];

  await Promise.all(
    allPersonas.map(async (u) => {
      try {
        await auth.getUser(u.id);
      } catch {
        await auth
          .createUser({
            uid: u.id,
            email: u.email,
            displayName: u.name,
            password: process.env.DEFAULT_SEED_PASSWORD || "UtilixPassword2026!",
            emailVerified: true,
          })
          .catch(() => null);
      }
      try {
        await auth.setCustomUserClaims(u.id, { role: u.role });
      } catch {
        // ignore
      }

      await writer.set(
        db.collection(COLLECTIONS.users).doc(u.id),
        {
          id: u.id,
          name: u.name,
          displayName: u.name,
          email: u.email,
          role: u.role,
          department_id: u.dept,
          year: u.role === "student" ? 3 : 0,
          credit_balance: (u as any).credits ?? 10,
          free_sessions_used: 0,
          free_sessions_week: "2026-W44",
          active: true,
          trainingVerified: true,
          profile_completed: true,
          profileCompleted: true,
          account_status: "active",
          assignedResourceIds: (u as any).assigned ?? [],
          created_at: toTs(NOW_ISO),
        },
        { merge: true },
      );
    }),
  );

  // If there are existing Google students, ensure they have credits & active status
  for (const uid of googleStudentIds) {
    await writer.set(
      db.collection(COLLECTIONS.users).doc(uid),
      {
        credit_balance: 18,
        free_sessions_used: 0,
        free_sessions_week: "2026-W44",
        active: true,
        trainingVerified: true,
        profile_completed: true,
        profileCompleted: true,
        account_status: "active",
      },
      { merge: true },
    );
  }

  // 4. Seed Comprehensive Resources (18 High-Spec Campus Resources)
  console.log("Seeding 18 comprehensive resources across 6 departments...");
  const resources: Array<{
    id: string;
    name: string;
    type: ResourceType;
    department_id: string;
    coordinator_id: string;
    location: string;
    photo_url: string | null;
    restricted: boolean;
    requires_training: string | null;
    credit_cost: number;
    max_session_minutes: number;
    status: ResourceStatus;
  }> = [
    {
      id: "res_printer1",
      name: "Bambu Lab X1-Carbon 3D Printer #1",
      type: "printer_3d",
      department_id: "dept_eng",
      coordinator_id: "coordinator-01",
      location: "Makerspace Lab 101",
      photo_url: null,
      restricted: true,
      requires_training: "3d-printer",
      credit_cost: 2,
      max_session_minutes: 180,
      status: "available",
    },
    {
      id: "res_3d_prusa_mk4",
      name: "Prusa MK4 Precision 3D Printer",
      type: "printer_3d",
      department_id: "dept_design",
      coordinator_id: "coordinator-03",
      location: "FabLab Room B-02",
      photo_url: null,
      restricted: false,
      requires_training: null,
      credit_cost: 2,
      max_session_minutes: 180,
      status: "available",
    },
    {
      id: "res_3d_formlabs_sla",
      name: "Formlabs Form 3+ SLA Resin Printer",
      type: "printer_3d",
      department_id: "dept_eng",
      coordinator_id: "coordinator-01",
      location: "Additive Prototyping Cleanroom",
      photo_url: null,
      restricted: true,
      requires_training: "3d-printer",
      credit_cost: 4,
      max_session_minutes: 240,
      status: "available",
    },
    {
      id: "res_cam_sony_a7iv",
      name: "Sony Alpha A7 IV Cinema 4K Kit",
      type: "camera",
      department_id: "dept_media",
      coordinator_id: "coordinator-02",
      location: "Media Studio Checkout Depot",
      photo_url: null,
      restricted: true,
      requires_training: "dslr",
      credit_cost: 3,
      max_session_minutes: 240,
      status: "available",
    },
    {
      id: "res_cam_blackmagic_6k",
      name: "Blackmagic Pocket Cinema 6K Pro",
      type: "camera",
      department_id: "dept_media",
      coordinator_id: "coordinator-02",
      location: "Broadcast Production Room C",
      photo_url: null,
      restricted: true,
      requires_training: "dslr",
      credit_cost: 4,
      max_session_minutes: 300,
      status: "available",
    },
    {
      id: "res_cam_canon_r5",
      name: "Canon EOS R5 C 8K Hybrid Camera",
      type: "camera",
      department_id: "dept_media",
      coordinator_id: "coordinator-02",
      location: "Digital Photography Annex",
      photo_url: null,
      restricted: true,
      requires_training: "dslr",
      credit_cost: 4,
      max_session_minutes: 240,
      status: "available",
    },
    {
      id: "res_audio_rode_rig",
      name: "RØDE Podcaster Pro II Studio Suite",
      type: "studio",
      department_id: "dept_media",
      coordinator_id: "coordinator-02",
      location: "Sound Studio Booth 1",
      photo_url: null,
      restricted: false,
      requires_training: null,
      credit_cost: 2,
      max_session_minutes: 180,
      status: "available",
    },
    {
      id: "res_studio_booth_a",
      name: "Sound-Isolated Acoustic Studio A",
      type: "studio",
      department_id: "dept_arts",
      coordinator_id: "coordinator-02",
      location: "Fine Arts Complex Audio Lab",
      photo_url: null,
      restricted: true,
      requires_training: "recording",
      credit_cost: 3,
      max_session_minutes: 240,
      status: "available",
    },
    {
      id: "res_audio_field_kit",
      name: "Sennheiser Wireless Ambisonic Audio Rig",
      type: "studio",
      department_id: "dept_media",
      coordinator_id: "coordinator-02",
      location: "Field Audio Locker 4",
      photo_url: null,
      restricted: false,
      requires_training: null,
      credit_cost: 2,
      max_session_minutes: 180,
      status: "available",
    },
    {
      id: "res_arduino_kit5",
      name: "Arduino Giga R1 WiFi & Sensor Kit",
      type: "arduino_kit",
      department_id: "dept_cs",
      coordinator_id: "coordinator-03",
      location: "IoT Prototyping Workshop",
      photo_url: null,
      restricted: false,
      requires_training: null,
      credit_cost: 1,
      max_session_minutes: 180,
      status: "available",
    },
    {
      id: "res_iot_esp32_kit",
      name: "ESP32-S3 Dual-Core AI Edge Kit",
      type: "arduino_kit",
      department_id: "dept_eng",
      coordinator_id: "coordinator-01",
      location: "Embedded Hardware Bench 3",
      photo_url: null,
      restricted: false,
      requires_training: null,
      credit_cost: 1,
      max_session_minutes: 120,
      status: "available",
    },
    {
      id: "res_iot_rpi5_cluster",
      name: "Raspberry Pi 5 Edge Cluster Node (16GB)",
      type: "arduino_kit",
      department_id: "dept_cs",
      coordinator_id: "coordinator-03",
      location: "Systems Architecture Lab",
      photo_url: null,
      restricted: false,
      requires_training: null,
      credit_cost: 2,
      max_session_minutes: 180,
      status: "available",
    },
    {
      id: "res_robot_niryo_arm",
      name: "Niryo Ned 2 6-Axis Robotic Arm",
      type: "lab_instrument",
      department_id: "dept_eng",
      coordinator_id: "coordinator-01",
      location: "Robotics Research Cell 4",
      photo_url: null,
      restricted: true,
      requires_training: "laboratory",
      credit_cost: 5,
      max_session_minutes: 180,
      status: "available",
    },
    {
      id: "res_ai_jetson_orin",
      name: "NVIDIA Jetson AGX Orin 64GB Station",
      type: "lab_instrument",
      department_id: "dept_cs",
      coordinator_id: "coordinator-03",
      location: "Deep Learning Cluster Hall",
      photo_url: null,
      restricted: false,
      requires_training: null,
      credit_cost: 3,
      max_session_minutes: 240,
      status: "available",
    },
    {
      id: "res_elec_rohde_scope",
      name: "Rohde & Schwarz RTB2004 Digital Oscilloscope",
      type: "lab_instrument",
      department_id: "dept_eng",
      coordinator_id: "coordinator-01",
      location: "Circuits & Signals Bench 12",
      photo_url: null,
      restricted: true,
      requires_training: "laboratory",
      credit_cost: 2,
      max_session_minutes: 180,
      status: "available",
    },
    {
      id: "res_elec_keysight_gen",
      name: "Keysight 1204G Waveform Generator",
      type: "lab_instrument",
      department_id: "dept_eng",
      coordinator_id: "coordinator-01",
      location: "RF Telecom Testing Bay",
      photo_url: null,
      restricted: false,
      requires_training: null,
      credit_cost: 2,
      max_session_minutes: 180,
      status: "maintenance",
    },
    {
      id: "res_vr_vision_pro",
      name: "Apple Vision Pro Spatial Computing Dev Rig",
      type: "project_room",
      department_id: "dept_design",
      coordinator_id: "coordinator-03",
      location: "XR Innovation Studio 2",
      photo_url: null,
      restricted: true,
      requires_training: "laboratory",
      credit_cost: 4,
      max_session_minutes: 180,
      status: "available",
    },
    {
      id: "res_room_collab_204",
      name: "Agile Team Design Room 204",
      type: "project_room",
      department_id: "dept_design",
      coordinator_id: "coordinator-03",
      location: "Design Innovation Center Level 2",
      photo_url: null,
      restricted: false,
      requires_training: null,
      credit_cost: 2,
      max_session_minutes: 240,
      status: "available",
    },
    // Legacy mapping aliases
    {
      id: "resource-arduino-kit-a",
      name: "Arduino Mega Prototyping Kit A",
      type: "arduino_kit",
      department_id: "dept_eng",
      coordinator_id: "coordinator-01",
      location: "Hardware Workshop 1",
      photo_url: null,
      restricted: false,
      requires_training: null,
      credit_cost: 1,
      max_session_minutes: 180,
      status: "available",
    },
    {
      id: "resource-dslr-camera-a",
      name: "DSLR Cinema Camera A",
      type: "camera",
      department_id: "dept_media",
      coordinator_id: "coordinator-02",
      location: "Media Studio Checkout Depot",
      photo_url: null,
      restricted: true,
      requires_training: "dslr",
      credit_cost: 3,
      max_session_minutes: 240,
      status: "available",
    },
    {
      id: "resource-3d-printer-a",
      name: "3D Printer Lab Unit A",
      type: "printer_3d",
      department_id: "dept_eng",
      coordinator_id: "coordinator-01",
      location: "Makerspace 101",
      photo_url: null,
      restricted: true,
      requires_training: "3d-printer",
      credit_cost: 2,
      max_session_minutes: 180,
      status: "available",
    },
  ];

  for (const res of resources) {
    await writer.set(db.collection(COLLECTIONS.resources).doc(res.id), {
      ...res,
      last_inspection_at: toTs(NOW_ISO),
    });

    // 4b. Seed recurring availability windows (Mon-Fri 08:00 - 20:00)
    for (let day = 1; day <= 5; day++) {
      const winId = `win_${res.id}_day${day}`;
      await writer.set(db.collection(COLLECTIONS.availability_windows).doc(winId), {
        id: winId,
        resource_id: res.id,
        weekday: day,
        date: null,
        start: "08:00",
        end: "20:00",
        capacity: 4,
        slot_type: "credit",
        effective_from: "2026-01-01",
        effective_to: "2027-01-01",
      });
    }
  }

  // 5. Seed Policy v1
  console.log("Seeding platform allocation policy...");
  await writer.set(db.collection(COLLECTIONS.policies).doc("v1"), DEFAULT_POLICY);

  // 6. Target Students (Explicit Google UID + all discovered Google accounts + Aarav)
  const targetStudentIds = Array.from(
    new Set([
      "k4LD6kJl6mOkW5MHILNx0IkKhsi1", // Active user Sooraj
      ...googleStudentIds.filter((id) => id.length > 20),
      "test-student-aarav",
    ])
  );
  console.log("Seeding personalized presentation suites for target students:", targetStudentIds);

  for (const studentId of targetStudentIds) {
    // A. Seed personalized bookings for each target student
    const studentBookings = [
      {
        id: `bkg-today-bambu-${studentId}`,
        resource_id: "res_printer1",
        user_id: studentId,
        slot_start: makeIso(0, Math.min(NOW.getUTCHours() + 1, 16), 0),
        slot_end: makeIso(0, Math.min(NOW.getUTCHours() + 4, 19), 0),
        purpose: "Autonomous Drone Propeller Mounts: High-speed carbon-fiber 3D prototyping",
        status: "confirmed" as const,
        slot_type: "credit" as const,
        cost_credits: 2,
        allocation_score: 94,
        decision_reason: "Approved by AI allocation based on capstone submission deadline.",
      },
      {
        id: `bkg-tomorrow-sony-${studentId}`,
        resource_id: "res_cam_sony_a7iv",
        user_id: studentId,
        slot_start: makeIso(1, 10, 0),
        slot_end: makeIso(1, 13, 0),
        purpose: "Annual Campus Innovation Showcase: B-roll footage and prototype demonstrations",
        status: "confirmed" as const,
        slot_type: "credit" as const,
        cost_credits: 3,
        allocation_score: 90,
        decision_reason: "Pre-allocated; student priority score high.",
      },
      {
        id: `bkg-active-arduino-${studentId}`,
        resource_id: "res_arduino_kit5",
        user_id: studentId,
        slot_start: makeIso(0, Math.max(NOW.getUTCHours() - 2, 8), 0),
        slot_end: makeIso(0, Math.min(NOW.getUTCHours() + 2, 20), 0),
        purpose: "Smart Greenhouse Environmental Sensor Mesh: I2C & SPI telemetry debugging",
        status: "checked_out" as const,
        slot_type: "credit" as const,
        cost_credits: 1,
        allocation_score: 92,
        decision_reason: "Equipped at IoT bench; active handover completed.",
      },
      {
        id: `bkg-pending-sla-${studentId}`,
        resource_id: "res_3d_formlabs_sla",
        user_id: studentId,
        slot_start: makeIso(1, 14, 0),
        slot_end: makeIso(1, 18, 0),
        purpose: "Biomedical Microfluidics Thesis: Ultra-precise resin manifold fabrication",
        status: "pending_approval" as const,
        slot_type: "credit" as const,
        cost_credits: 4,
        allocation_score: 86,
        decision_reason: "Awaiting coordinator verification of chemical safety protocol and resin tank.",
      },
      {
        id: `bkg-waitlist-blackmagic-${studentId}`,
        resource_id: "res_cam_blackmagic_6k",
        user_id: studentId,
        slot_start: makeIso(2, 14, 0),
        slot_end: makeIso(2, 18, 0),
        purpose: "Multi-cam production for campus festival teaser trailer",
        status: "waitlisted" as const,
        slot_type: "credit" as const,
        cost_credits: 4,
        allocation_score: 89,
        decision_reason: "Slot contended by primary capstone booking; placed at Rank #1.",
      },
      {
        id: `bkg-past-studio-${studentId}`,
        resource_id: "res_studio_booth_a",
        user_id: studentId,
        slot_start: makeIso(-2, 10, 0),
        slot_end: makeIso(-2, 13, 0),
        purpose: "Voiceover narration recording for AI capstone software demo",
        status: "returned" as const,
        slot_type: "credit" as const,
        cost_credits: 3,
        allocation_score: 95,
        decision_reason: "Successfully allocated and completed.",
      },
      {
        id: `bkg-past-prusa-${studentId}`,
        resource_id: "res_3d_prusa_mk4",
        user_id: studentId,
        slot_start: makeIso(-4, 13, 0),
        slot_end: makeIso(-4, 16, 0),
        purpose: "Custom PCB Enclosure Box with Snap-fit lid",
        status: "returned" as const,
        slot_type: "credit" as const,
        cost_credits: 2,
        allocation_score: 91,
        decision_reason: "Completed print; smooth removal from bed.",
      },
    ];

    for (const b of studentBookings) {
      const slotId = makeSlotId(b.resource_id, b.slot_start);
      await writer.set(db.collection(COLLECTIONS.bookings).doc(b.id), {
        id: b.id,
        resource_id: b.resource_id,
        user_id: b.user_id,
        member_ids: [b.user_id],
        team_department_ids: ["dept_eng", "dept_cs"],
        bundle_id: null,
        slot_start: toTs(b.slot_start),
        slot_end: toTs(b.slot_end),
        slot_ids: [slotId],
        purpose: b.purpose,
        declared_deadline: toTs(makeIso(7, 23, 59)),
        status: b.status,
        slot_type: b.slot_type,
        cost_credits: b.cost_credits,
        allocation_score: b.allocation_score,
        decision_reason: b.decision_reason,
        decision_source: "ai",
        tiebreak: null,
        policy_version: "v1",
        created_at: toTs(b.slot_start),
        updated_at: toTs(NOW_ISO),
      });
    }

    // B. Checkouts for this student
    const studentCheckouts = [
      {
        id: `chk-active-arduino-${studentId}`,
        booking_id: `bkg-active-arduino-${studentId}`,
        checked_out_by: "coordinator-01",
        checked_out_at: toTs(makeIso(0, Math.max(NOW.getUTCHours() - 2, 8), 0)),
        condition_before: "All 36 sensor breakout modules verified, cables neatly bundled, microcontroller flashed with test bootloader.",
        returned_at: null,
        condition_after: null,
        notes: "Student verified hardware on Bench 3.",
        photo_url: null,
        overdue: false,
      },
      {
        id: `chk-returned-studio-${studentId}`,
        booking_id: `bkg-past-studio-${studentId}`,
        checked_out_by: "coordinator-02",
        checked_out_at: toTs(makeIso(-2, 10, 0)),
        condition_before: "Studio booth sound dampening intact, mic stands calibrated.",
        returned_at: toTs(makeIso(-2, 13, 0)),
        condition_after: "Returned in immaculate condition, all acoustic foam and cables intact.",
        notes: "Session closed cleanly.",
        photo_url: null,
        overdue: false,
      },
      {
        id: `chk-returned-prusa-${studentId}`,
        booking_id: `bkg-past-prusa-${studentId}`,
        checked_out_by: "coordinator-03",
        checked_out_at: toTs(makeIso(-4, 13, 0)),
        condition_before: "Clean textured PEI sheet, 0.4mm brass nozzle installed.",
        returned_at: toTs(makeIso(-4, 16, 0)),
        condition_after: "Bed wiped down, print removed cleanly, zero nozzle buildup.",
        notes: "Handed over to next reserved queue.",
        photo_url: null,
        overdue: false,
      },
    ];
    for (const c of studentCheckouts) {
      await writer.set(db.collection(COLLECTIONS.checkouts).doc(c.id), c);
    }

    // C. Approvals for this student
    const studentApprovals = [
      {
        id: `appr-pending-sla-${studentId}`,
        booking_id: `bkg-pending-sla-${studentId}`,
        requested_at: toTs(makeIso(0, 8, 30)),
        decided_by: null,
        decision: "pending" as const,
        note: "Awaiting resin tank inspection and IPA wash station readiness check.",
        decided_at: null,
      },
      {
        id: `appr-approved-bambu-${studentId}`,
        booking_id: `bkg-today-bambu-${studentId}`,
        requested_at: toTs(makeIso(-1, 14, 0)),
        decided_by: "coordinator-01",
        decision: "approved" as const,
        note: "Approved: Student has valid 3D printing badge and submitted safe PLA-CF gcode.",
        decided_at: toTs(makeIso(-1, 15, 30)),
      },
    ];
    for (const a of studentApprovals) {
      await writer.set(db.collection(COLLECTIONS.approvals).doc(a.id), a);
    }

    // D. Waitlist entry for this student
    await writer.set(
      db.collection(COLLECTIONS.waitlist).doc(`wl-blackmagic-${studentId}`),
      {
        id: `wl-blackmagic-${studentId}`,
        resource_id: "res_cam_blackmagic_6k",
        slot_id: makeSlotId("res_cam_blackmagic_6k", makeIso(2, 14, 0)),
        booking_id: `bkg-waitlist-blackmagic-${studentId}`,
        user_id: studentId,
        position: 1,
        score: 89.5,
        created_at: toTs(makeIso(0, 8, 0)),
      },
    );

    // E. Certifications for this student
    const certs = [
      { id: `${studentId}_3d-printer`, user_id: studentId, training_type: "3d-printer", certified_by: "coordinator-01", certified_at: toTs(makeIso(-30, 10, 0)) },
      { id: `${studentId}_dslr`, user_id: studentId, training_type: "dslr", certified_by: "coordinator-02", certified_at: toTs(makeIso(-20, 14, 0)) },
      { id: `${studentId}_recording`, user_id: studentId, training_type: "recording", certified_by: "coordinator-02", certified_at: toTs(makeIso(-15, 11, 0)) },
    ];
    for (const cert of certs) {
      await writer.set(db.collection(COLLECTIONS.training_certifications).doc(cert.id), cert);
    }

    // F. Training Request for this student
    await writer.set(
      db.collection(COLLECTIONS.training_requests).doc(`tr-lab-${studentId}`),
      {
        id: `tr-lab-${studentId}`,
        user_id: studentId,
        training_type: "laboratory",
        status: "pending" as const,
        created_at: toTs(makeIso(-1, 14, 0)),
        notes: "Completed OSHA laser & robotic arm safety video module; requesting practical assessment.",
      },
    );

    // G. Credit Ledger Entries
    const ledger = [
      {
        id: `grant-${studentId}-monthly`,
        user_id: studentId,
        delta: 20,
        reason: "monthly_stipend" as const,
        booking_id: null,
        balance_after: 20,
        idempotency_key: `grant-${studentId}-monthly`,
        created_at: toTs(makeIso(-30, 0, 0)),
      },
      {
        id: `charge-${studentId}-studio`,
        user_id: studentId,
        delta: -3,
        reason: "booking_deduction" as const,
        booking_id: `bkg-past-studio-${studentId}`,
        balance_after: 17,
        idempotency_key: `charge-${studentId}-studio`,
        created_at: toTs(makeIso(-2, 10, 0)),
      },
      {
        id: `charge-${studentId}-prusa`,
        user_id: studentId,
        delta: -2,
        reason: "booking_deduction" as const,
        booking_id: `bkg-past-prusa-${studentId}`,
        balance_after: 15,
        idempotency_key: `charge-${studentId}-prusa`,
        created_at: toTs(makeIso(-4, 13, 0)),
      },
      {
        id: `charge-${studentId}-arduino`,
        user_id: studentId,
        delta: -1,
        reason: "booking_deduction" as const,
        booking_id: `bkg-active-arduino-${studentId}`,
        balance_after: 14,
        idempotency_key: `charge-${studentId}-arduino`,
        created_at: toTs(makeIso(0, 8, 0)),
      },
    ];
    for (const entry of ledger) {
      await writer.set(db.collection(COLLECTIONS.credit_ledger).doc(entry.id), entry);
    }

    // H. Notifications for this student
    const notifs = [
      {
        id: `notif-${studentId}-bambu-approved`,
        user_id: studentId,
        type: "approval_granted" as const,
        title: "Reservation Confirmed: Bambu Lab X1-Carbon #1",
        body: "Coordinator Sarah Lin approved your 3D printing session for today. Collect your RFID badge at Makerspace 101.",
        link: "/requests",
        read: false,
        created_at: toTs(makeIso(0, Math.max(NOW.getUTCHours() - 1, 8), 15)),
      },
      {
        id: `notif-${studentId}-waitlist-rank1`,
        user_id: studentId,
        type: "waitlist_promoted" as const,
        title: "Waitlist Position #1 Reached!",
        body: "You are now #1 in line for Blackmagic Pocket Cinema 6K. You will be automatically allocated if the slot opens.",
        link: "/requests",
        read: false,
        created_at: toTs(makeIso(0, Math.max(NOW.getUTCHours() - 2, 7), 30)),
      },
      {
        id: `notif-${studentId}-checkout-live`,
        user_id: studentId,
        type: "booking_confirmed" as const,
        title: "Hardware Checkout Active: Arduino Giga R1 Super-Kit",
        body: "Session is running. Please return all 36 sensor breakout modules before your slot concludes.",
        link: "/returns",
        read: false,
        created_at: toTs(makeIso(0, Math.max(NOW.getUTCHours() - 2, 8), 0)),
      },
      {
        id: `notif-${studentId}-cert-verified`,
        user_id: studentId,
        type: "training_approved" as const,
        title: "Institutional Certification Verified",
        body: "Your qualifications for High-Speed 3D Printers & Cinema DSLR Cameras have been approved by academic operations.",
        link: "/dashboard/training",
        read: true,
        created_at: toTs(makeIso(-15, 14, 0)),
      },
      {
        id: `notif-${studentId}-credit-stipend`,
        user_id: studentId,
        type: "credit_disbursed" as const,
        title: "Monthly Resource Credits Deposited",
        body: "20 academic credits have been added to your balance for campus lab reservations.",
        link: "/history",
        read: true,
        created_at: toTs(makeIso(-30, 0, 1)),
      },
    ];
    for (const n of notifs) {
      await writer.set(db.collection(COLLECTIONS.notifications).doc(n.id), n);
    }
  }

  // 7. Seed General Ecosystem Bookings (Coordinators & Other Students)
  console.log("Seeding coordinator queues, overdue alert items, and department ecosystem...");
  const ecosystemBookings = [
    // Pickup today for student-01 on media camera
    {
      id: "bkg-today-sony-s1",
      resource_id: "res_cam_sony_a7iv",
      user_id: "student-01",
      slot_start: makeIso(0, Math.min(NOW.getUTCHours() + 1, 15), 0),
      slot_end: makeIso(0, Math.min(NOW.getUTCHours() + 5, 19), 0),
      purpose: "Campus Documentary Series: Multi-camera auditorium lighting interview",
      status: "confirmed" as const,
      slot_type: "credit" as const,
      cost_credits: 3,
      allocation_score: 88,
      decision_reason: "Safety certificate verified and slot confirmed.",
    },
    // Overdue return: checked out yesterday, overdue today!
    {
      id: "bkg-overdue-blackmagic-s2",
      resource_id: "res_cam_blackmagic_6k",
      user_id: "student-02",
      slot_start: makeIso(-1, 9, 0),
      slot_end: makeIso(-1, 15, 0), // Overdue!
      purpose: "Student Short Film Exterior Night Scenes",
      status: "checked_out" as const,
      slot_type: "credit" as const,
      cost_credits: 4,
      allocation_score: 79,
      decision_reason: "Equipment handover completed yesterday. Past due return window.",
    },
    // Active checkout today on podcast rig
    {
      id: "bkg-active-audio-s5",
      resource_id: "res_audio_rode_rig",
      user_id: "student-05",
      slot_start: makeIso(0, Math.max(NOW.getUTCHours() - 1, 8), 0),
      slot_end: makeIso(0, Math.min(NOW.getUTCHours() + 2, 20), 0),
      purpose: "Campus Weekly Tech Podcast Episode 42: Studio multitrack recording session",
      status: "checked_out" as const,
      slot_type: "credit" as const,
      cost_credits: 2,
      allocation_score: 80,
      decision_reason: "Sound booth room 1 occupied; checkout confirmed.",
    },
    // Pending coordinator reviews
    {
      id: "bkg-pending-canon-s4",
      resource_id: "res_cam_canon_r5",
      user_id: "student-04",
      slot_start: makeIso(0, Math.min(NOW.getUTCHours() + 3, 17), 0),
      slot_end: makeIso(0, Math.min(NOW.getUTCHours() + 6, 20), 0),
      purpose: "Fine Arts Exhibition Catalog: High-resolution photogrammetry capture",
      status: "pending_approval" as const,
      slot_type: "credit" as const,
      cost_credits: 4,
      allocation_score: 82,
      decision_reason: "High-value restricted camera rig requires coordinator sign-off.",
    },
    {
      id: "bkg-pending-vision-s6",
      resource_id: "res_vr_vision_pro",
      user_id: "student-06",
      slot_start: makeIso(2, 10, 0),
      slot_end: makeIso(2, 13, 0),
      purpose: "Spatial Computing Interaction Design: Hand-tracking accessibility study",
      status: "submitted" as const,
      slot_type: "credit" as const,
      cost_credits: 4,
      allocation_score: 75,
      decision_reason: "Newly submitted reservation awaiting intake verification.",
    },
    // Future bookings
    {
      id: "bkg-tomorrow-robot-aarav",
      resource_id: "res_robot_niryo_arm",
      user_id: "test-student-aarav",
      slot_start: makeIso(1, 13, 0),
      slot_end: makeIso(1, 16, 0),
      purpose: "6-Axis Trajectory Planning: Inverse kinematics validation in research cell",
      status: "confirmed" as const,
      slot_type: "credit" as const,
      cost_credits: 5,
      allocation_score: 96,
      decision_reason: "Advanced robotics lab certification verified.",
    },
    {
      id: "bkg-tomorrow-jetson-s3",
      resource_id: "res_ai_jetson_orin",
      user_id: "student-03",
      slot_start: makeIso(1, 14, 0),
      slot_end: makeIso(1, 18, 0),
      purpose: "TensorRT Real-Time Edge Object Detection Model Benchmark",
      status: "confirmed" as const,
      slot_type: "credit" as const,
      cost_credits: 3,
      allocation_score: 87,
      decision_reason: "Deep learning hall allocation confirmed.",
    },
    // Cancelled and rejected
    {
      id: "bkg-past-cancelled-s5",
      resource_id: "res_room_collab_204",
      user_id: "student-05",
      slot_start: makeIso(-2, 14, 0),
      slot_end: makeIso(-2, 16, 0),
      purpose: "Group project review session",
      status: "cancelled" as const,
      slot_type: "credit" as const,
      cost_credits: 2,
      allocation_score: 70,
      decision_reason: "Cancelled by student 4 hours in advance; full refund issued.",
    },
    {
      id: "bkg-past-rejected-s6",
      resource_id: "res_elec_keysight_gen",
      user_id: "student-06",
      slot_start: makeIso(-3, 10, 0),
      slot_end: makeIso(-3, 12, 0),
      purpose: "High frequency modulation bench test",
      status: "rejected" as const,
      slot_type: "credit" as const,
      cost_credits: 2,
      allocation_score: 60,
      decision_reason: "Declined: resource under scheduled maintenance calibration.",
    },
  ];

  for (const b of ecosystemBookings) {
    const slotId = makeSlotId(b.resource_id, b.slot_start);
    await writer.set(db.collection(COLLECTIONS.bookings).doc(b.id), {
      id: b.id,
      resource_id: b.resource_id,
      user_id: b.user_id,
      member_ids: [b.user_id],
      team_department_ids: ["dept_eng", "dept_cs"],
      bundle_id: null,
      slot_start: toTs(b.slot_start),
      slot_end: toTs(b.slot_end),
      slot_ids: [slotId],
      purpose: b.purpose,
      declared_deadline: toTs(makeIso(7, 23, 59)),
      status: b.status,
      slot_type: b.slot_type,
      cost_credits: b.cost_credits,
      allocation_score: b.allocation_score,
      decision_reason: b.decision_reason,
      decision_source: "ai",
      tiebreak: null,
      policy_version: "v1",
      created_at: toTs(b.slot_start),
      updated_at: toTs(NOW_ISO),
    });
  }

  // Ecosystem checkouts (Overdue alert checkout & active audio checkout)
  const ecosystemCheckouts = [
    {
      id: "chk-overdue-blackmagic-s2",
      booking_id: "bkg-overdue-blackmagic-s2",
      checked_out_by: "coordinator-02",
      checked_out_at: toTs(makeIso(-1, 9, 0)),
      condition_before: "Camera body pristine, 24-70mm GM lens clean, 2x batteries at 100%, 256GB CFast card.",
      returned_at: null,
      condition_after: null,
      notes: "Student notified by automated SMS and email; returning by 2 PM today.",
      photo_url: null,
      overdue: true, // Overdue flag for alerts!
    },
    {
      id: "chk-active-audio-s5",
      booking_id: "bkg-active-audio-s5",
      checked_out_by: "coordinator-02",
      checked_out_at: toTs(makeIso(0, Math.max(NOW.getUTCHours() - 1, 8), 0)),
      condition_before: "XLR cables tested, pop filters sterile, studio monitor headphones functional.",
      returned_at: null,
      condition_after: null,
      notes: "Sound Booth 1 active.",
      photo_url: null,
      overdue: false,
    },
  ];
  for (const c of ecosystemCheckouts) {
    await writer.set(db.collection(COLLECTIONS.checkouts).doc(c.id), c);
  }

  // Ecosystem approvals
  const ecosystemApprovals = [
    {
      id: "appr-pending-canon-s4",
      booking_id: "bkg-pending-canon-s4",
      requested_at: toTs(makeIso(0, 9, 15)),
      decided_by: null,
      decision: "pending" as const,
      note: "High-value cinema camera request: checking equipment insurance waiver status.",
      decided_at: null,
    },
    {
      id: "appr-pending-vision-s6",
      booking_id: "bkg-pending-vision-s6",
      requested_at: toTs(makeIso(0, 10, 0)),
      decided_by: null,
      decision: "pending" as const,
      note: "Spatial computing lab induction verified; checking headset sanitization status.",
      decided_at: null,
    },
  ];
  for (const a of ecosystemApprovals) {
    await writer.set(db.collection(COLLECTIONS.approvals).doc(a.id), a);
  }

  // Ecosystem training requests
  const ecosystemTraining = [
    {
      id: "tr-s2-3dprinter",
      user_id: "student-02",
      training_type: "3d-printer",
      status: "pending" as const,
      created_at: toTs(makeIso(0, 8, 45)),
      notes: "Enrolled in Advanced Additive Manufacturing; requesting dual-extruder certification.",
    },
    {
      id: "tr-s4-dslr",
      user_id: "student-04",
      training_type: "dslr",
      status: "pending" as const,
      created_at: toTs(makeIso(-2, 11, 0)),
      notes: "Media elective prerequisite: cinema camera operation & sensor cleaning workshop.",
    },
    {
      id: "tr-s5-recording",
      user_id: "student-05",
      training_type: "recording",
      status: "approved" as const,
      created_at: toTs(makeIso(-5, 10, 0)),
      decided_by: "coordinator-02",
      decided_at: toTs(makeIso(-4, 15, 0)),
      notes: "Passed studio acoustic engineering board exam.",
    },
  ];
  for (const tr of ecosystemTraining) {
    await writer.set(db.collection(COLLECTIONS.training_requests).doc(tr.id), tr);
  }

  // 8. Seed Issue Reports (Equipment Health Monitoring)
  console.log("Seeding equipment issue reports...");
  const issues = [
    {
      id: "issue-prusa-adhesion",
      booking_id: `bkg-past-prusa-k4LD6kJl6mOkW5MHILNx0IkKhsi1`,
      resource_id: "res_3d_prusa_mk4",
      user_id: "k4LD6kJl6mOkW5MHILNx0IkKhsi1",
      category: "equipment_damage" as const,
      notes: "First-layer PINDA sensor reading slightly high on bottom-left corner of sheet; minor bed leveling recalibration recommended.",
      photo_url: null,
      status: "in_review" as const,
      created_at: toTs(makeIso(-4, 16, 10)),
    },
    {
      id: "issue-sony-lenscap",
      booking_id: "bkg-today-sony-s1",
      resource_id: "res_cam_sony_a7iv",
      user_id: "student-01",
      category: "missing_item" as const,
      notes: "67mm front UV filter was stored in side pocket instead of lens face. Found and reattached.",
      photo_url: null,
      status: "resolved" as const,
      created_at: toTs(makeIso(-7, 15, 0)),
    },
    {
      id: "issue-keysight-gen",
      booking_id: "bkg-past-rejected-s6",
      resource_id: "res_elec_keysight_gen",
      user_id: "student-06",
      category: "malfunction" as const,
      notes: "Channel 2 output amplitude fluctuation under 50 Ohm load. Currently undergoing bench technician recalibration.",
      photo_url: null,
      status: "open" as const,
      created_at: toTs(makeIso(-3, 10, 30)),
    },
  ];
  for (const iss of issues) {
    await writer.set(db.collection(COLLECTIONS.issue_reports).doc(iss.id), iss);
  }

  // 9. Seed 30 Days of Audit Logs for Admin KPIs & Telemetry
  console.log("Seeding audit logs across past 30 days for admin KPI analytics...");
  const auditLogs = [
    { id: "audit-01", actor_id: "coordinator-01", action: "resource_updated" as const, entity_type: "resource", entity_id: "res_printer1", reason: "Annual firmware and nozzle tolerance inspection passed", created_at: toTs(makeIso(-28, 10, 0)) },
    { id: "audit-02", actor_id: "admin-01", action: "policy_updated" as const, entity_type: "policy", entity_id: "v1", reason: "Updated peak hour fairness weight to 0.35", created_at: toTs(makeIso(-25, 14, 0)) },
    { id: "audit-03", actor_id: "coordinator-02", action: "user_certified" as const, entity_type: "user", entity_id: "k4LD6kJl6mOkW5MHILNx0IkKhsi1", reason: "Verified Cinema Camera 4K handling skills", created_at: toTs(makeIso(-20, 14, 0)) },
    { id: "audit-04", actor_id: "coordinator-01", action: "booking_created" as const, entity_type: "booking", entity_id: "bkg-past-studio-k4LD6kJl6mOkW5MHILNx0IkKhsi1", reason: "Allocated via AI fairness scoring", created_at: toTs(makeIso(-2, 10, 0)) },
    { id: "audit-05", actor_id: "coordinator-01", action: "booking_approved" as const, entity_type: "booking", entity_id: "bkg-today-bambu-k4LD6kJl6mOkW5MHILNx0IkKhsi1", reason: "Supervisor approval granted for capstone project", created_at: toTs(makeIso(-1, 15, 30)) },
    { id: "audit-06", actor_id: "coordinator-01", action: "resource_inspected" as const, entity_type: "resource", entity_id: "res_elec_keysight_gen", reason: "Marked under maintenance for waveform generator recalibration", created_at: toTs(makeIso(-3, 10, 0)) },
    { id: "audit-07", actor_id: "coordinator-02", action: "booking_created" as const, entity_type: "booking", entity_id: "bkg-today-sony-s1", reason: "Automated allocation confirmed", created_at: toTs(makeIso(0, 8, 0)) },
    { id: "audit-08", actor_id: "admin-01", action: "analytics_viewed" as const, entity_type: "dashboard", entity_id: "admin-kpi", reason: "Monthly resource utilization report generated", created_at: toTs(makeIso(-1, 17, 0)) },
  ];

  for (const a of auditLogs) {
    await writer.set(db.collection(COLLECTIONS.audit_log).doc(a.id), {
      ...a,
      rule_version: "v1",
      scores: { fairness: 85, gini: 0.18, utilization: 72 },
    });
  }

  // Commit all batched operations
  await writer.commit();

  console.log(`
══════════════════════════════════════════════════════════════════
  UTILIX PRESENTATION DATA SEEDED SUCCESSFULLY!
══════════════════════════════════════════════════════════════════
  • Departments:      6 departments seeded (ENG, CSE, MED, DSN, ART, SCI)
  • Users:            Demo personas + all Google accounts synced
  • Resources:        18 high-spec campus resources + availability windows (Mon-Fri 08:00-20:00)
  • Target Students:  ${targetStudentIds.length} students received full personalized suites
  • Bookings:         Full booking suites seeded covering all statuses
  • Checkouts:        Active, overdue alerts, and returned condition reports seeded
  • Approvals:        Pending and decided coordinator review items seeded
  • Waitlist:         Ranked queue slots seeded
  • Certifications:   Verified badges + pending training verification requests seeded
  • Notifications:    Unread & read alerts for Student & Coordinator dashboards seeded
  • Credit Ledger:    Transactions (monthly grants, charges, refunds) seeded
  • Audit & Issues:   Audit trail logs + equipment issue reports seeded
══════════════════════════════════════════════════════════════════
`);
}

// ─── Seed Mock File ───────────────────────────────────────────────────────────

async function seedMockFile(): Promise<void> {
  const dataset = buildSeedDataset();
  const outputDir = path.resolve(process.cwd(), "scripts", "generated");
  const outputPath = path.join(outputDir, "mock-seed-data.json");
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, JSON.stringify(dataset, null, 2), "utf8");
  console.log(`Mock dataset written: ${outputPath}`);
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

export async function runSeed(target: SeedTarget): Promise<void> {
  if (target === "mock") {
    await seedMockFile();
    return;
  }

  await upsertFirebaseData(target);
}

const cliArg = process.argv[2] as SeedTarget | undefined;
const target = (cliArg ?? process.env.SEED_TARGET ?? "mock") as SeedTarget;
runSeed(target).catch((error) => {
  console.error("Seeding failed with error:", error);
  process.exit(1);
});
