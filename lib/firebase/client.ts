// Utilix — Firebase client SDK initialization (browser-safe)
// Owner: A

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  browserLocalPersistence,
  setPersistence,
  type Auth,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";

type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function getFirebaseClientConfig(): FirebaseClientConfig | null {
  const config: FirebaseClientConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  };

  const hasMissingValue = Object.values(config).some((value) => value.trim() === "");
  return hasMissingValue ? null : config;
}

export function isFirebaseClientConfigured(): boolean {
  return getFirebaseClientConfig() !== null;
}

const fallbackConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "localhost",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "utilix-dev",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

// Avoid duplicate initialisation in hot-reload
const app: FirebaseApp = getApps().length
  ? getApp()
  : initializeApp(getFirebaseClientConfig() ?? fallbackConfig);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

// Connect to emulators when NEXT_PUBLIC_USE_EMULATORS=true
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_USE_EMULATORS === "true") {
  try {
    connectAuthEmulator(auth, "http://localhost:9099", {
      disableWarnings: true,
    });
  } catch {
    // already connected
  }
  try {
    connectFirestoreEmulator(db, "localhost", 8080);
  } catch {
    // already connected
  }
}

// Persistence initialization
if (typeof window !== "undefined") {
  try {
    void setPersistence(auth, browserLocalPersistence);
  } catch {
    // ignore in environments without browser persistence
  }
}

export function getFirebaseClientAuth(): Auth | null {
  return auth;
}

export { app };
