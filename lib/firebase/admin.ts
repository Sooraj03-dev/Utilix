// Utilix — Firebase Admin SDK initialization (server-only)
// Owner: A

import {
  initializeApp,
  getApps,
  cert,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function initAdmin() {
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
    });
  }

  return initializeApp({ projectId });
}

const app = initAdmin();

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export { app as adminApp };
