"use client";

import { login as loginRequest } from "@/lib/api";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

type AuthContextValue = {
  token: string | null;
  userName: string | null;
  userId: string | null;
  role: string | null;
  hydrated: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storage =
      window.localStorage.getItem("ic-token") !== null
        ? window.localStorage
        : window.sessionStorage.getItem("ic-token") !== null
          ? window.sessionStorage
          : null;
    if (storage) {
      setToken(storage.getItem("ic-token"));
      setUserName(storage.getItem("ic-user"));
      setUserId(storage.getItem("ic-user-id"));
      setRole(storage.getItem("ic-role"));
    }
    setHydrated(true);
  }, []);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const session = await loginRequest(email, password);
    setToken(session.token);
    setUserName(`${session.user.nombre} ${session.user.apellido ?? ""}`.trim());
    setUserId(session.user.id);
    setRole(session.user.rol);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("ic-token");
      window.localStorage.removeItem("ic-user");
      window.localStorage.removeItem("ic-user-id");
      window.localStorage.removeItem("ic-role");
      window.sessionStorage.removeItem("ic-token");
      window.sessionStorage.removeItem("ic-user");
      window.sessionStorage.removeItem("ic-user-id");
      window.sessionStorage.removeItem("ic-role");
      const targetStorage = remember ? window.localStorage : window.sessionStorage;
      targetStorage.setItem("ic-token", session.token);
      targetStorage.setItem("ic-user", `${session.user.nombre} ${session.user.apellido ?? ""}`.trim());
      targetStorage.setItem("ic-user-id", session.user.id);
      targetStorage.setItem("ic-role", session.user.rol);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUserName(null);
    setUserId(null);
    setRole(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("ic-token");
      window.localStorage.removeItem("ic-user");
      window.localStorage.removeItem("ic-user-id");
      window.localStorage.removeItem("ic-role");
      window.sessionStorage.removeItem("ic-token");
      window.sessionStorage.removeItem("ic-user");
      window.sessionStorage.removeItem("ic-user-id");
      window.sessionStorage.removeItem("ic-role");
    }
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => {
      logout();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("ic:session-expired", handleSessionExpired);
      return () => window.removeEventListener("ic:session-expired", handleSessionExpired);
    }
    return () => undefined;
  }, [logout]);

  return (
    <AuthContext.Provider value={{ token, userName, userId, role, hydrated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}
