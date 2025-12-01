"use client";

import GlassCard from "@/components/ui/GlassCard";
import LoginPanel from "@/components/dashboard/LoginPanel";
import MainLayout from "@/components/layout/MainLayout";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { login, token, hydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && token) {
      router.replace("/suppliers");
    }
  }, [hydrated, token, router]);

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
    router.replace("/suppliers");
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl">
        <GlassCard>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-sky-500">
            Inventario Cibao
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Inicia sesión</h1>
          <p className="mt-2 text-sm text-slate-500">
            Utiliza el correo y contraseña proporcionados para acceder a los paneles de gestión.
          </p>
          <div className="mt-6">
            <LoginPanel onLogin={handleLogin} />
          </div>
        </GlassCard>
      </div>
    </MainLayout>
  );
}
