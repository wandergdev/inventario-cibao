"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";
import { fetchPedidos, fetchProducts, fetchSalidas } from "@/lib/api";
import type { Pedido } from "@/types";
import {
  AlertTriangle,
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
  ChevronDown,
  Percent,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  label: string;
  href?: Route;
  icon?: LucideIcon;
  roles?: string[];
  children?: Array<{
    label: string;
    href: Route;
    roles?: string[];
    icon?: LucideIcon;
  }>;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Alertas",
    href: "/alertas",
    icon: AlertTriangle,
    roles: ["Administrador"],
  },
  {
    label: "Productos",
    href: "/products",
    icon: PackageCheck,
    children: [
      {
        label: "Tipos de producto",
        href: "/catalog/product-types",
        roles: ["Administrador"],
        icon: Layers,
      },
      {
        label: "Marcas",
        href: "/catalog/brands",
        roles: ["Administrador"],
        icon: Tags,
      },
      {
        label: "Modelos",
        href: "/catalog/models",
        roles: ["Administrador"],
        icon: BadgeHelp,
      },
    ],
  },
  {
    label: "Salidas",
    href: "/salidas",
    icon: Truck,
    children: [
      {
        label: "Estados",
        href: "/salidas/estados",
        roles: ["Administrador"],
        icon: Truck,
      },
    ],
  },
  {
    label: "Pedidos",
    href: "/pedidos",
    icon: ClipboardCheck,
    children: [
      {
        label: "Estados de pedidos",
        href: "/pedidos/estados",
        roles: ["Administrador"],
        icon: ClipboardCheck,
      },
      {
        label: "Porcentajes de precios",
        href: "/pedidos/precios",
        roles: ["Administrador"],
        icon: Percent,
      },
    ],
  },
  //{ label: "Inventario", href: "/inventory", icon: Boxes },
  {
    label: "Suplidores",
    href: "/suppliers",
    icon: ClipboardList,
    roles: ["Administrador"],
  },
  {
    label: "Movimientos",
    href: "/movimientos",
    icon: History,
    roles: ["Administrador"],
  },
  {
    label: "Reportes",
    href: "/reports",
    icon: BarChart3,
    roles: ["Administrador"],
  },
  {
    label: "Usuarios",
    href: "/users",
    icon: UsersRound,
    roles: ["Administrador"],
  },
  { label: "Configuración", href: "/settings", icon: Settings },
];

type AlertCounts = {
  stock: number;
  pedidosVencidos: number;
  salidasPendientes: number;
  productosInactivos: number;
  total: number;
};

type ToastPayload =
  | { type: "stock"; message: string }
  | { type: "pedido"; message: string }
  | { type: "salida"; message: string }
  | { type: "inactividad"; message: string };

const normalizeText = (value?: string | null) =>
  (value ?? "").trim().toLowerCase();
const isPendingSalidaEstado = (estado?: string | null) => {
  const normalized = normalizeText(estado);
  if (!normalized) return false;
  if (normalized.includes("cancel")) return false;
  if (normalized.includes("entregad")) return false;
  return true;
};

const isPedidoOverdue = (pedido: Pedido) => {
  const expected = pedido.fechaEsperada ? new Date(pedido.fechaEsperada) : null;
  if (!expected) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expected.setHours(0, 0, 0, 0);
  if (expected >= today) return false;
  const estado = normalizeText(pedido.estado);
  if (estado.includes("recibido") || estado.includes("cancel")) return false;
  if (pedido.fechaRecibido) return false;
  return true;
};

export default function AdminLayout({
  active,
  children,
}: {
  active: string;
  children: React.ReactNode;
}) {
  const { userName, role, logout, token, hydrated } = useAuth();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [alertCounts, setAlertCounts] = useState<AlertCounts>({
    stock: 0,
    pedidosVencidos: 0,
    salidasPendientes: 0,
    productosInactivos: 0,
    total: 0,
  });
  const [toastQueue, setToastQueue] = useState<ToastPayload[]>([]);
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const prevCountsRef = useRef<AlertCounts>(alertCounts);
  const alertNavigationLabel = "Alertas";

  const toggleMenu = useCallback((label: string) => {
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  }, []);

  const defaultOpen = useMemo(() => {
    const map: Record<string, boolean> = {};
    NAV_ITEMS.forEach((item) => {
      if (
        item.children &&
        item.children.some((child) => child.label === active)
      ) {
        map[item.label] = true;
      }
    });
    return map;
  }, [active]);

  const loadAlertCount = useCallback(async () => {
    if (!hydrated || !token || role !== "Administrador") {
      setAlertCounts({
        stock: 0,
        pedidosVencidos: 0,
        salidasPendientes: 0,
        productosInactivos: 0,
        total: 0,
      });
      return;
    }
    try {
      const [products, pedidos, salidas] = await Promise.all([
        fetchProducts(token),
        fetchPedidos(token),
        fetchSalidas(token),
      ]);
      const lowStock = products.filter((product) => {
        const current = Number(product.stockActual ?? 0);
        const minimo = Number(product.stockMinimo ?? 0);
        return minimo > 0 && current <= minimo;
      });
      const overduePedidos = pedidos.filter(isPedidoOverdue);
      const pendingDeliveries = salidas.filter((salida) =>
        isPendingSalidaEstado(salida.estado)
      );
      const now = Date.now();
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      const inactiveProducts = products.filter((product) => {
        const limitWeeks = Number(product.semanasMaxSinMovimiento ?? 0);
        if (!limitWeeks) return false;
        const lastMovement = product.ultimaFechaMovimiento
          ? new Date(product.ultimaFechaMovimiento)
          : null;
        if (!lastMovement || Number.isNaN(lastMovement.getTime())) return false;
        lastMovement.setHours(0, 0, 0, 0);
        const diffWeeks = Math.floor((now - lastMovement.getTime()) / weekMs);
        return diffWeeks >= limitWeeks;
      });
      setAlertCounts({
        stock: lowStock.length,
        pedidosVencidos: overduePedidos.length,
        salidasPendientes: pendingDeliveries.length,
        productosInactivos: inactiveProducts.length,
        total:
          lowStock.length +
          overduePedidos.length +
          pendingDeliveries.length +
          inactiveProducts.length,
      });
    } catch (error) {
      console.error("No se pudieron cargar las alertas", error);
      setAlertCounts({
        stock: 0,
        pedidosVencidos: 0,
        salidasPendientes: 0,
        productosInactivos: 0,
        total: 0,
      });
    }
  }, [token, role, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    void loadAlertCount();
    const interval = setInterval(() => {
      void loadAlertCount();
    }, 60_000);
    return () => clearInterval(interval);
  }, [loadAlertCount, hydrated]);

  useEffect(() => {
    const prev = prevCountsRef.current;
    const pendingToasts: ToastPayload[] = [];
    if (alertCounts.pedidosVencidos > prev.pedidosVencidos) {
      const qty = alertCounts.pedidosVencidos;
      pendingToasts.push({
        type: "pedido",
        message:
          qty === 1
            ? "1 pedido vencido sin recibir"
            : `${qty} pedidos vencidos sin recibir`,
      });
    }
    if (alertCounts.salidasPendientes > prev.salidasPendientes) {
      const qty = alertCounts.salidasPendientes;
      pendingToasts.push({
        type: "salida",
        message:
          qty === 1
            ? "1 entrega sigue pendiente"
            : `${qty} entregas siguen pendientes`,
      });
    }
    if (alertCounts.productosInactivos > prev.productosInactivos) {
      const qty = alertCounts.productosInactivos;
      pendingToasts.push({
        type: "inactividad",
        message:
          qty === 1
            ? "1 producto superó su tiempo sin movimiento"
            : `${qty} productos superaron su tiempo sin movimiento`,
      });
    }
    if (alertCounts.stock > prev.stock) {
      const qty = alertCounts.stock;
      pendingToasts.push({
        type: "stock",
        message:
          qty === 1
            ? "1 producto alcanzó el stock mínimo"
            : `${qty} productos alcanzaron el stock mínimo`,
      });
    }
    prevCountsRef.current = alertCounts;
    if (pendingToasts.length > 0) {
      setToastQueue((prevQueue) => [...prevQueue, ...pendingToasts]);
    }
    return () => undefined;
  }, [alertCounts]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (toast || toastQueue.length === 0) {
      return;
    }
    setToast(toastQueue[0]);
    setToastQueue((prevQueue) => prevQueue.slice(1));
  }, [toast, toastQueue]);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="flex w-64 flex-col bg-[#0c1c3b] text-slate-100">
        <div className="border-b border-white/10 p-6">
          {/* <p className="text-xs uppercase tracking-[0.4em] text-sky-200">Inventario</p> */}
          <h2 className="text-xl font-semibold">Inventario Cibao</h2>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {NAV_ITEMS.filter(
            (item) => !item.roles || (role && item.roles.includes(role))
          ).map((item) => {
            const allowedChildren = item.children
              ? item.children.filter(
                  (child) =>
                    !child.roles || (role && child.roles.includes(role))
                )
              : [];
            const isParentActive =
              active === item.label ||
              allowedChildren.some((child) => child.label === active);
            const isOpen =
              openMenus[item.label] ??
              defaultOpen[item.label] ??
              isParentActive;
            const isAlertNav = item.label === alertNavigationLabel;
            const hasAlerts = isAlertNav && alertCounts.total > 0;
            const hasCritical = hasAlerts && alertCounts.pedidosVencidos > 0;
            const highlightAlertNav = hasAlerts;
            const alertBadgeValue =
              alertCounts.total > 99 ? "99+" : alertCounts.total.toString();
            const renderIcon = (Icon?: LucideIcon) =>
              Icon ? (
                <span className="relative">
                  <Icon size={18} />
                  {hasAlerts && (
                    <span
                      className={clsx(
                        "absolute -right-2 -top-2 min-w-[1.25rem] rounded-full px-1 text-center text-[10px] font-bold leading-4 text-white",
                        hasCritical
                          ? "bg-red-500"
                          : "bg-yellow-500 text-slate-900"
                      )}
                    >
                      {alertBadgeValue}
                    </span>
                  )}
                </span>
              ) : null;

            return (
              <div key={item.label}>
                {allowedChildren.length > 0 ? (
                  <>
                    <div
                      className={clsx(
                        "flex items-center gap-1 rounded-2xl px-2 py-2 transition",
                        isParentActive
                          ? "bg-white/10 text-white"
                          : "text-slate-300 hover:bg-white/5"
                      )}
                    >
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="flex flex-1 items-center gap-3 rounded-2xl px-2 py-1 text-sm font-medium"
                        >
                          {renderIcon(item.icon)}
                          {item.label}
                        </Link>
                      ) : (
                        <span className="flex flex-1 items-center gap-3 rounded-2xl px-2 py-1 text-sm font-medium">
                          {renderIcon(item.icon)}
                          {item.label}
                        </span>
                      )}
                      <button
                        type="button"
                        className="rounded-full p-1 transition hover:bg-white/10"
                        onClick={() => toggleMenu(item.label)}
                      >
                        <ChevronDown
                          size={16}
                          className={clsx(
                            "transition-transform",
                            openMenus[item.label] ?? isOpen
                              ? "rotate-180"
                              : "rotate-0"
                          )}
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
                      highlightAlertNav
                        ? hasCritical
                          ? "bg-red-500 text-white shadow-lg"
                          : "bg-yellow-300 text-slate-900 shadow-lg"
                        : isParentActive
                        ? "bg-white/10 text-white"
                        : "text-slate-300 hover:bg-white/5"
                    )}
                  >
                    {renderIcon(item.icon)}
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
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
              Panel
            </p>
            <h1 className="text-2xl font-bold text-slate-900">{active}</h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <div>
              <p className="font-semibold text-slate-900">
                {userName ?? "Usuario"}
              </p>
              <p className="text-xs uppercase text-slate-400">
                {role ?? "Sin rol"}
              </p>
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
      {toast && (
        <div className="pointer-events-none fixed right-6 top-6 z-50">
          <div
            className={clsx(
              "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg ring-1",
              toast.type === "pedido"
                ? "bg-red-50 text-red-900 ring-red-200"
                : toast.type === "salida"
                ? "bg-amber-50 text-amber-900 ring-amber-200"
                : toast.type === "inactividad"
                ? "bg-orange-50 text-orange-900 ring-orange-200"
                : "bg-yellow-50 text-yellow-900 ring-yellow-200"
            )}
          >
            <AlertTriangle
              size={18}
              className={
                toast.type === "pedido"
                  ? "text-red-500"
                  : toast.type === "inactividad"
                  ? "text-orange-500"
                  : "text-yellow-500"
              }
            />
            <p>{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
