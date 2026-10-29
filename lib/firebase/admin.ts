// Utilix — Firebase Admin SDK initialization (server-only)
// Owner: A
import "server-only";

import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const ADMIN_APP_NAME = "utilix-admin";

function initAdmin(): App {
  const existingApp = getApps().find((registeredApp) => registeredApp.name === ADMIN_APP_NAME);
  if (existingApp) {
    return existingApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = rawPrivateKey?.replace(/\\n/g, "\n").trim();
  const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  const emulatorMode = Boolean(authEmulatorHost || firestoreEmulatorHost);

  if (!projectId) {
    throw new Error("[Utilix] Missing FIREBASE_PROJECT_ID for Firebase Admin initialization.");
  }

  if (!emulatorMode && (!clientEmail || !privateKey)) {
    throw new Error(
      "[Utilix] Firebase Admin credentials are incomplete. Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.",
    );
  }

  if ((clientEmail && !privateKey) || (!clientEmail && privateKey)) {
    throw new Error("[Utilix] Firebase Admin credentials must include both client email and private key.");
  }

  const credential = clientEmail && privateKey
    ? cert({ projectId, clientEmail, privateKey } as ServiceAccount)
    : undefined;

  return initializeApp(
    { projectId, ...(credential ? { credential } : {}) },
    ADMIN_APP_NAME,
  );
}

export const adminApp = initAdmin();
export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = getFirestore(adminApp);

export function getFirebaseAdminApp(): App {
  return adminApp;
}

export function getFirebaseAdminAuth(): Auth {
  return adminAuth;
}

export function getFirebaseAdminDb(): Firestore {
  return adminDb;
}

// Seed APIs retained as compatibility aliases for the existing seed entrypoint.
export const getAdminApp = getFirebaseAdminApp;
export const getAdminAuth = getFirebaseAdminAuth;
export const getAdminDb = getFirebaseAdminDb;
