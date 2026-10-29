// Utilix — Firebase Admin SDK initialization (server-only)
// Owner: A

import {
  initializeApp,
  getApps,
  cert,
  type App as AdminApp,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type Auth as AdminAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore as AdminFirestore } from "firebase-admin/firestore";

let adminAppSingleton: AdminApp | null = null;
let adminAuthSingleton: AdminAuth | null = null;
let adminDbSingleton: AdminFirestore | null = null;

function initAdmin(): AdminApp {
  if (getApps().length) {
    return getApps()[0];
  }

  // When using emulators, FIREBASE_AUTH_EMULATOR_HOST and
  // FIRESTORE_EMULATOR_HOST env vars are picked up automatically
  // by the admin SDK — no manual connection needed.

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  // If service-account creds are provided, use them (production / CI).
  // Otherwise init without creds (works with emulators).
  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey } as ServiceAccount),
      projectId,
    });
  }

  return initializeApp({ projectId: projectId || "utilix-dev" });
}

const app: AdminApp = initAdmin();
adminAppSingleton = app;

export const adminAuth: AdminAuth = getAuth(app);
adminAuthSingleton = adminAuth;

export const adminDb: AdminFirestore = getFirestore(app);
adminDbSingleton = adminDb;

export { app as adminApp };

// Accessors for auth-roles compatibility
export function getFirebaseAdminApp(): AdminApp | null {
  return adminAppSingleton ?? app;
}

export function getFirebaseAdminAuth(): AdminAuth | null {
  return adminAuthSingleton ?? adminAuth;
}

export function getFirebaseAdminDb(): AdminFirestore | null {
  return adminDbSingleton ?? adminDb;
}

// Accessors for seed compatibility
export const getAdminApp = getFirebaseAdminApp;
export const getAdminAuth = getFirebaseAdminAuth;
export const getAdminDb = getFirebaseAdminDb;
