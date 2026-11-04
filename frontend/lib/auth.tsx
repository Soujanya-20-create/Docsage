"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, authenticate, endSession, restoreSession, type User } from "./api";

type AuthState = {
  user: User | null;
  loading: boolean;
  /** True when the server is taking a while to answer (a free-tier API waking up). */
  waking: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, acceptTerms: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [waking, setWaking] = useState(false);

  const loadUser = useCallback(async () => setUser(await api<User>("/auth/me")), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Restore the session from the HttpOnly cookie. Retry while the API is unreachable so a cold
      // start shows "waking up" instead of signing the user out.
      for (let attempt = 0; attempt < 6 && !cancelled; attempt++) {
        const state = await restoreSession();
        if (state === "none") break;
        if (state === "ok") {
          try {
            await loadUser();
          } catch {}
          break;
        }
        setWaking(true);
        await sleep(3000);
      }
      if (!cancelled) {
        setWaking(false);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadUser]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      waking,
      login: async (email, password) => {
        await authenticate("login", { email, password });
        await loadUser();
      },
      register: async (name, email, password, acceptTerms) => {
        await authenticate("register", { name, email, password, accept_terms: acceptTerms });
        await loadUser();
      },
      logout: async () => {
        setUser(null);
        await endSession();
      },
      refreshUser: loadUser,
    }),
    [user, loading, waking, loadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
