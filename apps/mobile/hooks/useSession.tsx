import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { getSession, login as apiLogin, logout as apiLogout, SessionUser } from "../constants/api";

type SessionContextValue = {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);
const CACHED_USER_KEY = "xtt_cached_user";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const applyUser = useCallback((u: SessionUser | null) => {
    setUser(u);
    SecureStore.setItemAsync(CACHED_USER_KEY, u ? JSON.stringify(u) : "").catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    const u = await getSession().catch(() => null);
    applyUser(u);
  }, [applyUser]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Show the last-known user immediately (offline-friendly, avoids a flash of "logged out"
      // while the network round-trip to /api/auth/session completes), then verify in background.
      try {
        const cached = await SecureStore.getItemAsync(CACHED_USER_KEY);
        if (cached && !cancelled) {
          setUser(JSON.parse(cached));
          setLoading(false);
        }
      } catch {
        // ignore
      }
      await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const u = await apiLogin(email, password);
      applyUser(u);
    },
    [applyUser]
  );

  const logout = useCallback(async () => {
    await apiLogout();
    applyUser(null);
  }, [applyUser]);

  const value = useMemo(() => ({ user, loading, refresh, login, logout }), [user, loading, refresh, login, logout]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
