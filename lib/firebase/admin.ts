// Utilix — Firebase Admin SDK initialization (server-only)
// Owner: A

import {
  initializeApp,
  getApps,
  cert,
  deleteApp,
  type App as AdminApp,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type Auth as AdminAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore as AdminFirestore } from "firebase-admin/firestore";

function getOrInitApp(): AdminApp {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  const existingApps = getApps();
  if (existingApps.length > 0) {
    const existing = existingApps[0];
    // If live credentials are provided but the app was previously initialized without credentials, re-init.
    if (projectId && clientEmail && privateKey && !existing.options.credential) {
      try {
        deleteApp(existing);
      } catch {
        // ignore if cannot delete
      }
      return initializeApp({
        credential: cert({ projectId, clientEmail, privateKey } as ServiceAccount),
        projectId,
      });
    }
    return existing;
  }

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey } as ServiceAccount),
      projectId,
    });
  }

  return initializeApp({ projectId: projectId || "utilix-dev" });
}

export const adminApp: AdminApp = new Proxy({} as AdminApp, {
  get(_target, prop) {
    const app = getOrInitApp();
    const val = (app as unknown as Record<string, unknown>)[prop as string];
    if (typeof val === "function") {
      return (val as (...args: unknown[]) => unknown).bind(app);
    }
    return val;
  },
});

export const adminAuth: AdminAuth = new Proxy({} as AdminAuth, {
  get(_target, prop) {
    const app = getOrInitApp();
    const auth = getAuth(app);
    const val = (auth as unknown as Record<string, unknown>)[prop as string];
    if (typeof val === "function") {
      return (val as (...args: unknown[]) => unknown).bind(auth);
    }
    return val;
  },
});

export const adminDb: AdminFirestore = new Proxy({} as AdminFirestore, {
  get(_target, prop) {
    const app = getOrInitApp();
    const db = getFirestore(app);
    const val = (db as unknown as Record<string, unknown>)[prop as string];
    if (typeof val === "function") {
      return (val as (...args: unknown[]) => unknown).bind(db);
    }
    return val;
  },
});

// Accessors for auth-roles compatibility
export function getFirebaseAdminApp(): AdminApp | null {
  return getOrInitApp();
}

export function getFirebaseAdminAuth(): AdminAuth | null {
  const app = getOrInitApp();
  return getAuth(app);
}

export function getFirebaseAdminDb(): AdminFirestore | null {
  const app = getOrInitApp();
  return getFirestore(app);
}

// Accessors for seed compatibility
export const getAdminApp = getFirebaseAdminApp;
export const getAdminAuth = getFirebaseAdminAuth;
export const getAdminDb = getFirebaseAdminDb;

