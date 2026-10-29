import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  type Auth,
} from "firebase/auth";

type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

let authSingleton: Auth | null = null;
let persistenceInitialized = false;

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

function getFirebaseClientApp(): FirebaseApp | null {
  const config = getFirebaseClientConfig();
  if (!config) {
    return null;
  }

  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp(config);
}

export function getFirebaseClientAuth(): Auth | null {
  if (authSingleton) {
    return authSingleton;
  }

  const app = getFirebaseClientApp();
  if (!app) {
    return null;
  }

  authSingleton = getAuth(app);

  if (!persistenceInitialized) {
    persistenceInitialized = true;
    void setPersistence(authSingleton, browserLocalPersistence);
  }

  return authSingleton;
}

