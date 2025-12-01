"use client";

import LoginPanel from "@/components/dashboard/LoginPanel";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginScreen() {
  const { login, token, hydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && token) {
      router.replace("/dashboard");
    }
  }, [hydrated, token, router]);

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
    router.replace("/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-5xl rounded-[32px] border border-slate-100 bg-white shadow-2xl">
        <aside className="flex flex-1 flex-col items-center justify-center space-y-3 rounded-l-[32px] bg-[#1f4bcc] p-10 text-center text-white">
          <p className="text-sm font-semibold tracking-[0.4em] text-sky-100">ELECTRO CIBAO</p>
          <h2 className="text-4xl font-bold">Sistema de Inventario</h2>
          <p className="max-w-sm text-base text-sky-100">
            Gestiona tu inventario en tienda y ruta de manera eficiente desde cualquier dispositivo.
          </p>
        </aside>
        <section className="flex flex-1 flex-col justify-center p-10">
          <div className="max-w-md space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
                Bienvenido de nuevo
              </p>
              <h1 className="text-3xl font-bold text-slate-900">Iniciar sesión</h1>
              <p className="text-sm text-slate-500">Ingresa tus credenciales para continuar.</p>
            </div>
            <LoginPanel onLogin={handleLogin} />
            <div className="flex items-center justify-between text-xs text-slate-500">
              <label className="inline-flex items-center gap-2 text-slate-600">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                Recordar sesión
              </label>
              <button className="text-sky-500">¿Olvidaste tu contraseña?</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
