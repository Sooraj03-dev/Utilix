type AdminApp = object;
type AdminAuth = {
  verifyIdToken: (token: string) => Promise<{ uid: string; email?: string; name?: string }>;
};
type AdminFirestore = {
  collection: (name: string) => {
    doc: (id: string) => {
      get: () => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
    };
  };
};

let adminAppSingleton: AdminApp | null = null;
let adminAuthSingleton: AdminAuth | null = null;
let adminDbSingleton: AdminFirestore | null = null;

function getAdminCredentials() {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? "";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL ?? "";
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return { projectId, clientEmail, privateKey };
}

function loadFirebaseAdminModules() {
  try {
    const adminApp = require("firebase-admin/app") as {
      cert: (value: { projectId: string; clientEmail: string; privateKey: string }) => unknown;
      getApps: () => AdminApp[];
      initializeApp: (value: { credential: unknown; projectId: string }) => AdminApp;
    };
    const adminAuth = require("firebase-admin/auth") as {
      getAuth: (app: AdminApp) => AdminAuth;
    };
    const adminFirestore = require("firebase-admin/firestore") as {
      getFirestore: (app: AdminApp) => AdminFirestore;
    };

    return { adminApp, adminAuth, adminFirestore };
  } catch {
    return null;
  }
}

export function getFirebaseAdminApp(): AdminApp | null {
  if (adminAppSingleton) {
    return adminAppSingleton;
  }

  const credentials = getAdminCredentials();
  if (!credentials) {
    return null;
  }

  const modules = loadFirebaseAdminModules();
  if (!modules) {
    return null;
  }

  const existingApps = modules.adminApp.getApps();
  if (existingApps.length > 0) {
    adminAppSingleton = existingApps[0];
    return adminAppSingleton;
  }

  adminAppSingleton = modules.adminApp.initializeApp({
    credential: modules.adminApp.cert({
      projectId: credentials.projectId,
      clientEmail: credentials.clientEmail,
      privateKey: credentials.privateKey,
    }),
    projectId: credentials.projectId,
  });

  return adminAppSingleton;
}

export function getFirebaseAdminAuth(): AdminAuth | null {
  if (adminAuthSingleton) {
    return adminAuthSingleton;
  }

  const app = getFirebaseAdminApp();
  if (!app) {
    return null;
  }

  const modules = loadFirebaseAdminModules();
  if (!modules) {
    return null;
  }

  adminAuthSingleton = modules.adminAuth.getAuth(app);
  return adminAuthSingleton;
}

export function getFirebaseAdminDb(): AdminFirestore | null {
  if (adminDbSingleton) {
    return adminDbSingleton;
  }

  const app = getFirebaseAdminApp();
  if (!app) {
    return null;
  }

  const modules = loadFirebaseAdminModules();
  if (!modules) {
    return null;
  }

  adminDbSingleton = modules.adminFirestore.getFirestore(app);
  return adminDbSingleton;
}

