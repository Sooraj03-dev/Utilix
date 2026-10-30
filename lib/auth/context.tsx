"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseClientAuth, isFirebaseClientConfigured, googleProvider } from "../firebase/client";
import { isMockAuthEnabled } from "./config";
import type { AuthUser } from "../types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<AuthUser | null>;
  loginWithCampusEmail: (email: string, password: string) => Promise<AuthUser | null>;
  loginWithDemoAccount: (email: string, password: string) => Promise<AuthUser | null>;
  logout: () => Promise<void>;
  refreshIdToken: () => Promise<void>;
  refreshSession: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export async function syncFirebaseSession(user: User): Promise<void> {
  const idToken = await user.getIdToken(true);
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    const body = (await response.json()) as { error?: string };
    throw new Error(body.error ?? "Could not establish authenticated server session.");
  }
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/session", {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  });
  if (response.status === 401) {
    return null;
  }

  const body = (await response.json()) as { user?: AuthUser; error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? "Failed to load session user.");
  }

  return body.user ?? null;
}

async function clearServerSession(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const auth = isFirebaseClientConfigured() ? getFirebaseClientAuth() : null;
    let unsubscribe = () => {};

    if (auth) {
      unsubscribe = onIdTokenChanged(auth, (firebaseUser) => {
        void (async () => {
          try {
            if (!firebaseUser) {
              // If there's an active mock session in cookie, retain it; otherwise clear
              const currentSession = await fetchCurrentUser();
              if (currentSession?.source === "mock") {
                if (isActive) {
                  setUser(currentSession);
                }
                return;
              }
              await clearServerSession();
              if (isActive) {
                setUser(null);
              }
              return;
            }

            await syncFirebaseSession(firebaseUser);
            const currentUser = await fetchCurrentUser();
            if (isActive) {
              setUser(currentUser);
            }
          } catch (caught) {
            if (isActive) {
              setError(caught instanceof Error ? caught.message : "Unknown auth state error.");
              setUser(null);
            }
          } finally {
            if (isActive) {
              setLoading(false);
            }
          }
        })();
      });

      getRedirectResult(auth)
        .then(async (result) => {
          if (result?.user && isActive) {
            await syncFirebaseSession(result.user);
            const currentUser = await fetchCurrentUser();
            if (isActive) setUser(currentUser);
          }
        })
        .catch(() => null);
    } else {
      // Firebase client not configured; load mock or existing session
      void (async () => {
        try {
          const currentUser = await fetchCurrentUser();
          if (isActive) {
            setUser(currentUser);
          }
        } catch (caught) {
          if (isActive) {
            setError(caught instanceof Error ? caught.message : "Unknown auth initialization error.");
          }
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      })();
    }

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  /**
   * 1. Real Google Authentication via Firebase Auth.
   * NEVER routes to mock auth or demo credentials.
   */
  const loginWithGoogle = useCallback(async (): Promise<AuthUser | null> => {
    setLoading(true);
    setError(null);

    try {
      const auth = getFirebaseClientAuth();
      if (!auth || !isFirebaseClientConfigured()) {
        throw new Error(
          "Firebase Authentication is not configured. Please verify NEXT_PUBLIC_FIREBASE_* environment variables."
        );
      }

      let credentials;
      try {
        credentials = await signInWithPopup(auth, googleProvider);
      } catch (popupErr: unknown) {
        const code = (popupErr as { code?: string } | null)?.code;
        const message = popupErr instanceof Error ? popupErr.message : "";

        if (code === "auth/popup-blocked") {
          await signInWithRedirect(auth, googleProvider);
          return null;
        }
        if (code === "auth/popup-closed-by-user") {
          throw new Error("Google sign-in popup was closed before completing.");
        }
        if (code === "auth/cancelled-popup-request") {
          throw new Error("Authentication request was cancelled.");
        }
        if (code === "auth/operation-not-allowed" || message.includes("operation-not-allowed")) {
          throw new Error(
            "Google sign-in is not enabled in Firebase Console for project 'utilix-d7843'. Please enable Google in Firebase Console > Authentication > Sign-in method."
          );
        }
        if (code === "auth/unauthorized-domain") {
          throw new Error(
            "This domain is not authorized in Firebase Console. Add 'localhost' to Firebase Console > Authentication > Settings > Authorized domains."
          );
        }
        if (code === "auth/network-request-failed") {
          throw new Error("Network error during Google sign-in. Please check your internet connection.");
        }
        if (code === "auth/invalid-credential") {
          throw new Error("Invalid Google credentials.");
        }
        throw popupErr as Error;
      }

      await syncFirebaseSession(credentials.user);
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch (caught) {
      const msg = caught instanceof Error ? caught.message : "Google sign-in failed.";
      setError(msg);
      throw caught;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 2. Institutional Campus Email & Password Authentication via Firebase Auth.
   */
  const loginWithCampusEmail = useCallback(
    async (email: string, password: string): Promise<AuthUser | null> => {
      setLoading(true);
      setError(null);

      try {
        const auth = getFirebaseClientAuth();
        if (!auth || !isFirebaseClientConfigured()) {
          throw new Error(
            "Firebase Authentication is not configured. Please check your institutional settings or NEXT_PUBLIC_FIREBASE_*."
          );
        }

        let credentials;
        try {
          credentials = await signInWithEmailAndPassword(auth, email, password);
        } catch (authErr: unknown) {
          const code = (authErr as { code?: string } | null)?.code;
          if (code === "auth/invalid-email") {
            throw new Error("Please enter a valid campus email address.");
          }
          if (code === "auth/user-not-found") {
            throw new Error("No campus account found with this email address.");
          }
          if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
            throw new Error("Incorrect campus password.");
          }
          if (code === "auth/user-disabled") {
            throw new Error("This campus account has been disabled.");
          }
          if (code === "auth/operation-not-allowed") {
            throw new Error("Email/password sign-in is not enabled in Firebase Console.");
          }
          if (code === "auth/network-request-failed") {
            throw new Error("Network error connecting to campus authentication.");
          }
          throw authErr as Error;
        }

        await syncFirebaseSession(credentials.user);
        const currentUser = await fetchCurrentUser();
        setUser(currentUser);
        return currentUser;
      } catch (caught) {
        const msg = caught instanceof Error ? caught.message : "Campus email login failed.";
        setError(msg);
        throw caught;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * 3. Demo Persona Authentication (active only when demo mode is enabled).
   */
  const loginWithDemoAccount = useCallback(
    async (email: string, password: string): Promise<AuthUser | null> => {
      setLoading(true);
      setError(null);

      try {
        if (!isMockAuthEnabled()) {
          throw new Error("Demo account authentication is disabled in this environment.");
        }

        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const body = (await response.json()) as { error?: string; user?: AuthUser };
        if (!response.ok) {
          throw new Error(body.error ?? "Invalid demo credentials.");
        }

        const demoUser = body.user ?? null;
        setUser(demoUser);
        return demoUser;
      } catch (caught) {
        const msg = caught instanceof Error ? caught.message : "Demo sign-in failed.";
        setError(msg);
        throw caught;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * General login helper for backward compatibility.
   */
  const login = useCallback(
    async (email: string, password: string) => {
      if (isMockAuthEnabled()) {
        await loginWithDemoAccount(email, password);
      } else {
        await loginWithCampusEmail(email, password);
      }
    },
    [loginWithDemoAccount, loginWithCampusEmail],
  );

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!isMockAuthEnabled()) {
        const auth = getFirebaseClientAuth();
        if (auth) {
          await signOut(auth);
        }
      }
      await clearServerSession();
      setUser(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown logout error.");
      throw caught;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const auth = isFirebaseClientConfigured() ? getFirebaseClientAuth() : null;
      if (auth?.currentUser) {
        await syncFirebaseSession(auth.currentUser);
      }
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch (caught) {
      console.warn("Could not refresh session:", caught);
      return null;
    }
  }, []);

  const refreshIdToken = useCallback(async () => {
    await refreshSession();
  }, [refreshSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      login,
      loginWithGoogle,
      loginWithCampusEmail,
      loginWithDemoAccount,
      logout,
      refreshIdToken,
      refreshSession,
    }),
    [
      user,
      loading,
      error,
      login,
      loginWithGoogle,
      loginWithCampusEmail,
      loginWithDemoAccount,
      logout,
      refreshIdToken,
      refreshSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}

