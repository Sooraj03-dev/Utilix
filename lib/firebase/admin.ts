type AdminApp = object;
type AdminAuth = {
  getUser: (uid: string) => Promise<unknown>;
  createUser: (input: {
    uid: string;
    email: string;
    displayName: string;
    emailVerified: boolean;
  }) => Promise<unknown>;
};
type AdminFirestore = {
  collection: (name: string) => {
    doc: (id: string) => {
      set: (value: unknown, options: { merge: boolean }) => Promise<void>;
    };
  };
};

let appSingleton: AdminApp | null = null;
let authSingleton: AdminAuth | null = null;
let dbSingleton: AdminFirestore | null = null;

function getCredentialConfig() {
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

export function getAdminApp(): AdminApp | null {
  if (appSingleton) {
    return appSingleton;
  }

  const config = getCredentialConfig();
  if (!config) {
    return null;
  }

  const modules = loadFirebaseAdminModules();
  if (!modules) {
    return null;
  }

  const apps = modules.adminApp.getApps();
  if (apps.length > 0) {
    appSingleton = apps[0];
    return appSingleton;
  }

  appSingleton = modules.adminApp.initializeApp({
    credential: modules.adminApp.cert({
      projectId: config.projectId,
      clientEmail: config.clientEmail,
      privateKey: config.privateKey,
    }),
    projectId: config.projectId,
  });

  return appSingleton;
}

export function getAdminAuth(): AdminAuth | null {
  if (authSingleton) {
    return authSingleton;
  }

  const app = getAdminApp();
  if (!app) {
    return null;
  }

  const modules = loadFirebaseAdminModules();
  if (!modules) {
    return null;
  }

  authSingleton = modules.adminAuth.getAuth(app);
  return authSingleton;
}

export function getAdminDb(): AdminFirestore | null {
  if (dbSingleton) {
    return dbSingleton;
  }

  const app = getAdminApp();
  if (!app) {
    return null;
  }

  const modules = loadFirebaseAdminModules();
  if (!modules) {
    return null;
  }

  dbSingleton = modules.adminFirestore.getFirestore(app);
  return dbSingleton;
}

