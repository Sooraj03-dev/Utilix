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
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { getFirebaseClientAuth, isFirebaseClientConfigured } from "../firebase/client";
import { isMockAuthEnabled } from "./config";
import type { AuthUser } from "../types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshIdToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function syncFirebaseSession(user: User): Promise<void> {
  const idToken = await user.getIdToken(true);
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    const body = (await response.json()) as { error?: string };
    throw new Error(body.error ?? "Could not establish authenticated server session.");
  }
}

async function fetchCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/session", { method: "GET" });
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

    if (isMockAuthEnabled()) {
      void (async () => {
        try {
          const currentUser = await fetchCurrentUser();
          if (isActive) {
            setUser(currentUser);
          }
        } catch (caught) {
          if (isActive) {
            setError(caught instanceof Error ? caught.message : "Unknown mock-auth error.");
          }
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      })();
      return () => {
        isActive = false;
      };
    }

    if (!isFirebaseClientConfigured()) {
      setError("Firebase client credentials are missing. Set NEXT_PUBLIC_FIREBASE_* env values.");
      setLoading(false);
      return () => {
        isActive = false;
      };
    }

    const auth = getFirebaseClientAuth();
    if (!auth) {
      setError("Could not initialize Firebase Auth.");
      setLoading(false);
      return () => {
        isActive = false;
      };
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      void (async () => {
        try {
          if (!firebaseUser) {
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

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      if (isMockAuthEnabled()) {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const body = (await response.json()) as { error?: string; user?: AuthUser };
        if (!response.ok) {
          throw new Error(body.error ?? "Mock login failed.");
        }
        setUser(body.user ?? null);
        return;
      }

      const auth = getFirebaseClientAuth();
      if (!auth) {
        throw new Error("Firebase auth is unavailable.");
      }

      const credentials = await signInWithEmailAndPassword(auth, email, password);
      await syncFirebaseSession(credentials.user);
      setUser(await fetchCurrentUser());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown login error.");
      throw caught;
    } finally {
      setLoading(false);
    }
  }, []);

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

  const refreshIdToken = useCallback(async () => {
    if (isMockAuthEnabled()) {
      setUser(await fetchCurrentUser());
      return;
    }

    const auth = getFirebaseClientAuth();
    if (!auth?.currentUser) {
      throw new Error("No active Firebase session.");
    }

    await syncFirebaseSession(auth.currentUser);
    setUser(await fetchCurrentUser());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      login,
      logout,
      refreshIdToken,
    }),
    [user, loading, error, login, logout, refreshIdToken],
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

