import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "../types";
import * as api from "../services/api";

interface AuthContextValue {
  user: User | null;
  status: "loading" | "authenticated" | "unauthenticated";
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sessionExpired: boolean;
  clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const token = api.getToken();
    if (!token) {
      setStatus("unauthenticated");
      return;
    }
    api
      .fetchMe()
      .then((u) => {
        setUser(u);
        setStatus("authenticated");
      })
      .catch(() => {
        api.clearToken();
        setStatus("unauthenticated");
      });
  }, []);

  
  useEffect(() => {
    function onUnauthorized() {
      api.clearToken();
      setUser(null);
      setStatus("unauthenticated");
      setSessionExpired(true);
    }
    window.addEventListener("price-compare:unauthorized", onUnauthorized);
    return () => window.removeEventListener("price-compare:unauthorized", onUnauthorized);
  }, []);

  const doLogin = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    api.setToken(res.access_token);
    setUser(res.user);
    setStatus("authenticated");
    setSessionExpired(false);
  }, []);

  const doRegister = useCallback(async (email: string, password: string) => {
    const res = await api.register(email, password);
    api.setToken(res.access_token);
    setUser(res.user);
    setStatus("authenticated");
    setSessionExpired(false);
  }, []);

  const doLogout = useCallback(async () => {
    await api.logout();
    api.clearToken();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      login: doLogin,
      register: doRegister,
      logout: doLogout,
      sessionExpired,
      clearSessionExpired: () => setSessionExpired(false),
    }),
    [user, status, doLogin, doRegister, doLogout, sessionExpired]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
