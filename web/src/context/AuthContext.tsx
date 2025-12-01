"use client";

import { login as loginRequest } from "@/lib/api";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

type AuthContextValue = {
  token: string | null;
  userName: string | null;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("ic-token");
    const storedUser = localStorage.getItem("ic-user");
    setToken(storedToken);
    setUserName(storedUser);
    setHydrated(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = await loginRequest(email, password);
    setToken(session.token);
    setUserName(session.user.nombre);
    localStorage.setItem("ic-token", session.token);
    localStorage.setItem("ic-user", session.user.nombre);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUserName(null);
    localStorage.removeItem("ic-token");
    localStorage.removeItem("ic-user");
  }, []);

  return (
    <AuthContext.Provider value={{ token, userName, hydrated, login, logout }}>
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
