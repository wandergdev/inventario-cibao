"use client";

import Link from "next/link";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  PackageCheck,
  Settings,
  ShoppingCart,
  UsersRound
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Productos", href: "/products", icon: PackageCheck },
  { label: "Ventas", href: "#", icon: ShoppingCart },
  { label: "Inventario", href: "#", icon: Boxes },
  { label: "Suplidores", href: "/suppliers", icon: ClipboardList },
  { label: "Reportes", href: "#", icon: BarChart3 },
  { label: "Usuarios", href: "#", icon: UsersRound },
  { label: "Configuración", href: "#", icon: Settings }
];

export default function AdminLayout({
  active,
  children
}: {
  active: string;
  children: React.ReactNode;
}) {
  const { userName, role, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="w-64 bg-[#0c1c3b] text-slate-100">
        <div className="border-b border-white/10 p-6">
          <p className="text-xs uppercase tracking-[0.4em] text-sky-200">Inventario</p>
          <h2 className="text-xl font-semibold">Electro Cibao</h2>
        </div>
        <nav className="space-y-1 p-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                active === item.label
                  ? "bg-white/10 text-white"
                  : "text-slate-300 hover:bg-white/5"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">
        <header className="mb-6 flex flex-col justify-between gap-3 rounded-3xl bg-white p-6 shadow-sm lg:flex-row lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Panel</p>
            <h1 className="text-2xl font-bold text-slate-900">{active}</h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <div>
              <p className="font-semibold text-slate-900">{userName ?? "Usuario"}</p>
              <p className="text-xs uppercase text-slate-400">{role ?? "Sin rol"}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Cerrar sesión
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
