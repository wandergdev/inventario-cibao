"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import MainLayout from "@/components/layout/MainLayout";

export default function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
  const { userName, logout } = useAuth();

  const navItems = [
    { label: "Suplidores", href: "/suppliers" },
    { label: "Productos", href: "/products" }
  ];

  return (
    <MainLayout>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-3 rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-sky-500">Inventario Cibao</p>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <p className="text-xs text-slate-500">Conectado como {userName ?? "Invitado"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 hover:border-slate-300"
              >
                {item.label}
              </Link>
            ))}
            <Button variant="subtle" onClick={logout} className="text-slate-600">
              Cerrar sesión
            </Button>
          </div>
        </header>
        {children}
      </div>
    </MainLayout>
  );
}
