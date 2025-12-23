"use client";

import type { ComponentType } from "react";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";
import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  History,
  LayoutDashboard,
  PackageCheck,
  Settings,
  UsersRound,
  Truck,
  Tags,
  BadgeHelp,
  Layers,
  ChevronDown
} from "lucide-react";

type NavItem = {
  label: string;
  href?: string;
  icon?: ComponentType<{ size?: number }>;
  roles?: string[];
  children?: Array<{
    label: string;
    href: string;
    roles?: string[];
    icon?: ComponentType<{ size?: number }>;
  }>;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard
  },
  {
    label: "Productos",
    href: "/products",
    icon: PackageCheck,
    children: [
      { label: "Tipos de producto", href: "/catalog/product-types", roles: ["Administrador"], icon: Layers },
      { label: "Marcas", href: "/catalog/brands", roles: ["Administrador"], icon: Tags },
      { label: "Modelos", href: "/catalog/models", roles: ["Administrador"], icon: BadgeHelp }
    ]
  },
  {
    label: "Salidas",
    href: "/salidas",
    icon: Truck,
    children: [{ label: "Estados", href: "/salidas/estados", roles: ["Administrador"], icon: Truck }]
  },
  { label: "Pedidos", href: "/pedidos", icon: ClipboardCheck },
  { label: "Inventario", href: "#", icon: Boxes },
  { label: "Suplidores", href: "/suppliers", icon: ClipboardList },
  { label: "Movimientos", href: "/movimientos", icon: History, roles: ["Administrador"] },
  { label: "Reportes", href: "#", icon: BarChart3 },
  { label: "Usuarios", href: "#", icon: UsersRound, roles: ["Administrador"] },
  { label: "Configuración", href: "#", icon: Settings, roles: ["Administrador"] }
];

export default function AdminLayout({
  active,
  children
}: {
  active: string;
  children: React.ReactNode;
}) {
  const { userName, role, logout } = useAuth();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const toggleMenu = useCallback((label: string) => {
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  }, []);

  const defaultOpen = useMemo(() => {
    const map: Record<string, boolean> = {};
    NAV_ITEMS.forEach((item) => {
      if (item.children && item.children.some((child) => child.label === active)) {
        map[item.label] = true;
      }
    });
    return map;
  }, [active]);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="w-64 bg-[#0c1c3b] text-slate-100">
        <div className="border-b border-white/10 p-6">
          <p className="text-xs uppercase tracking-[0.4em] text-sky-200">Inventario</p>
          <h2 className="text-xl font-semibold">Electro Cibao</h2>
        </div>
        <nav className="space-y-1 p-4">
          {NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role))).map((item) => {
            const allowedChildren = item.children
              ? item.children.filter((child) => !child.roles || (role && child.roles.includes(role)))
              : [];
            const isParentActive =
              active === item.label || allowedChildren.some((child) => child.label === active);
            const isOpen = openMenus[item.label] ?? defaultOpen[item.label] ?? isParentActive;

            return (
              <div key={item.label}>
                {allowedChildren.length > 0 ? (
                  <>
                    <div
                      className={clsx(
                        "flex items-center gap-1 rounded-2xl px-2 py-2 transition",
                        isParentActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
                      )}
                    >
                      <Link
                        href={item.href ?? "#"}
                        className="flex flex-1 items-center gap-3 rounded-2xl px-2 py-1 text-sm font-medium"
                      >
                        {item.icon && <item.icon size={18} />}
                        {item.label}
                      </Link>
                      <button
                        type="button"
                        className="rounded-full p-1 transition hover:bg-white/10"
                        onClick={() => toggleMenu(item.label)}
                      >
                        <ChevronDown
                          size={16}
                          className={clsx("transition-transform", (openMenus[item.label] ?? isOpen) ? "rotate-180" : "rotate-0")}
                        />
                      </button>
                    </div>
                    {(openMenus[item.label] ?? isOpen) && (
                      <div className="ml-6 mt-1 space-y-1">
                        {allowedChildren.map((child) => (
                          <Link
                            key={child.label}
                            href={child.href}
                            className={clsx(
                              "flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold uppercase tracking-wide transition",
                              active === child.label
                                ? "bg-white/10 text-white"
                                : "text-slate-400 hover:bg-white/5"
                            )}
                          >
                            {child.icon && <child.icon size={14} />}
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : item.href ? (
                  <Link
                    href={item.href}
                    className={clsx(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                      isParentActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
                    )}
                  >
                    {item.icon && <item.icon size={18} />}
                    {item.label}
                  </Link>
                ) : (
                  <div className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
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
