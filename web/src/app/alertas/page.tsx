"use client";

import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ClipboardCheck,
  Loader2,
  PackageCheck,
  RefreshCcw,
  Search,
  Truck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AdminLayout from "@/components/layout/AdminLayout";
import useRequireAuth from "@/hooks/useRequireAuth";
import { useAuth } from "@/context/AuthContext";
import { fetchPedidos, fetchProducts, fetchSalidas } from "@/lib/api";
import type { Pedido, Product, Salida } from "@/types";

const currencyFormatter = new Intl.NumberFormat("es-DO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const PAGE_SIZE = 5;
type AlertFilter = "all" | "stock" | "pedidos" | "entregas";

export default function AlertasPage() {
  const { hydrated } = useRequireAuth();
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [salidas, setSalidas] = useState<Salida[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filterType, setFilterType] = useState<AlertFilter>("all");
  const [pagination, setPagination] = useState({ stock: 1, pedidos: 1, entregas: 1 });

  const loadAlertsData = useCallback(async () => {
    if (!token) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [productsData, pedidosData, salidasData] = await Promise.all([
        fetchProducts(token),
        fetchPedidos(token),
        fetchSalidas(token),
      ]);
      setProducts(productsData);
      setPedidos(pedidosData);
      setSalidas(salidasData);
      setLastUpdated(new Date());
    } catch (err) {
      setError((err as Error).message ?? "No se pudo cargar la lista de alertas.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (hydrated && token) {
      void loadAlertsData();
    }
  }, [hydrated, token, loadAlertsData]);

  const normalizedSearch = search.trim().toLowerCase();

  const stockAlerts = useMemo(() => {
    return products
      .filter((product) => {
        const stock = Number(product.stockActual ?? 0);
        const minimum = Number(product.stockMinimo ?? 0);
        return minimum > 0 && stock <= minimum;
      })
      .map((product) => ({
        id: product.id,
        nombre: product.nombre,
        tipo: product.tipoNombre,
        marca: product.marcaNombre,
        modelo: product.modeloNombre,
        stockActual: Number(product.stockActual ?? 0),
        stockMinimo: Number(product.stockMinimo ?? 0),
      }))
      .filter((item) => {
        if (!normalizedSearch) return true;
        return [item.nombre, item.tipo, item.marca, item.modelo]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedSearch));
      });
  }, [products, normalizedSearch]);

  const pedidoAlerts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return pedidos
      .filter((pedido) => {
        const expected = pedido.fechaEsperada ? new Date(pedido.fechaEsperada) : null;
        if (!expected) return false;
        expected.setHours(0, 0, 0, 0);
        if (expected >= today) return false;
        const estado = (pedido.estado ?? "").toLowerCase();
        if (estado.includes("recibido") || estado.includes("cancel")) return false;
        if (pedido.fechaRecibido) return false;
        return true;
      })
      .map((pedido) => {
        const expected = pedido.fechaEsperada ? new Date(pedido.fechaEsperada) : null;
        const diasRetraso =
          expected != null ? Math.max(0, Math.ceil((today.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24))) : 0;
        return {
          id: pedido.id,
          producto: pedido.producto ?? pedido.productoNombreReferencia ?? "Producto sin catalogar",
          suplidor: pedido.suplidor,
          fechaEsperada: pedido.fechaEsperada,
          estado: pedido.estado,
          diasRetraso,
          cantidad: pedido.cantidadSolicitada,
        };
      })
      .filter((item) => {
        if (!normalizedSearch) return true;
        return [item.producto, item.suplidor, item.estado]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedSearch));
      });
  }, [pedidos, normalizedSearch]);

  const entregaAlerts = useMemo(() => {
    return salidas
      .filter((salida) => {
        const normalized = (salida.estado ?? "").toLowerCase();
        if (!normalized) return false;
        if (normalized.includes("entregad") || normalized.includes("cancel")) return false;
        return true;
      })
      .map((salida) => ({
        id: salida.id,
        ticket: salida.ticket,
        vendedor: salida.vendedor,
        estado: salida.estado,
        total: Number(salida.total ?? 0),
        fecha: salida.fecha_salida,
      }))
      .filter((item) => {
        if (!normalizedSearch) return true;
        return [item.ticket, item.vendedor, item.estado]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedSearch));
      });
  }, [salidas, normalizedSearch]);

  useEffect(() => {
    setPagination((prev) => ({
      stock: clampPage(prev.stock, stockAlerts.length),
      pedidos: clampPage(prev.pedidos, pedidoAlerts.length),
      entregas: clampPage(prev.entregas, entregaAlerts.length),
    }));
  }, [stockAlerts.length, pedidoAlerts.length, entregaAlerts.length]);

  const handleRefresh = useCallback(() => {
    if (!loading) {
      void loadAlertsData();
    }
  }, [loadAlertsData, loading]);

  if (!hydrated) {
    return null;
  }

  const showStockPanel = filterType === "all" || filterType === "stock";
  const showPedidoPanel = filterType === "all" || filterType === "pedidos";
  const showEntregaPanel = filterType === "all" || filterType === "entregas";

  const stockPage = paginate(stockAlerts, pagination.stock);
  const pedidoPage = paginate(pedidoAlerts, pagination.pedidos);
  const entregaPage = paginate(entregaAlerts, pagination.entregas);

  return (
    <AdminLayout active="Alertas">
      <section className="space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Centro de alertas</p>
              <h1 className="text-2xl font-bold text-slate-900">Alertas activas</h1>
              <p className="text-sm text-slate-500">
                Monitorea el stock mínimo y atiende las incidencias antes de que afecten la disponibilidad.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 text-sm text-slate-500 lg:items-end">
              {lastUpdated && (
                <p>
                  Última actualización{" "}
                  <span className="font-semibold text-slate-800">
                    {lastUpdated.toLocaleTimeString()}
                  </span>
                </p>
              )}
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Actualizando
                  </>
                ) : (
                  <>
                    <RefreshCcw size={16} />
                    Actualizar lista
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="mb-6">
            <AlertSummary
              stockCount={stockAlerts.length}
              pedidoCount={pedidoAlerts.length}
              entregaCount={entregaAlerts.length}
            />
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Alertas encontradas</p>
              <h2 className="text-xl font-semibold text-slate-900">
                {[stockAlerts.length, pedidoAlerts.length, entregaAlerts.length].reduce((a, b) => a + b, 0)} alertas activas
              </h2>
            </div>
            <label className="relative flex items-center">
              <Search size={16} className="absolute left-4 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por producto, suplidor o ticket"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100 lg:w-96"
              />
            </label>
          </div>

          <FilterTabs active={filterType} onChange={setFilterType} />

          {error && (
            <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-8 space-y-8">
            {showStockPanel && (
              <StockAlertPanel
                alerts={stockPage.items}
                total={stockAlerts.length}
                page={stockPage.page}
                totalPages={stockPage.totalPages}
                onPageChange={(page) => setPagination((prev) => ({ ...prev, stock: page }))}
              />
            )}
            {showPedidoPanel && (
              <PedidoAlertPanel
                alerts={pedidoPage.items}
                total={pedidoAlerts.length}
                page={pedidoPage.page}
                totalPages={pedidoPage.totalPages}
                onPageChange={(page) => setPagination((prev) => ({ ...prev, pedidos: page }))}
              />
            )}
            {showEntregaPanel && (
              <EntregaAlertPanel
                alerts={entregaPage.items}
                total={entregaAlerts.length}
                page={entregaPage.page}
                totalPages={entregaPage.totalPages}
                onPageChange={(page) => setPagination((prev) => ({ ...prev, entregas: page }))}
              />
            )}
          </div>
        </div>
      </section>
    </AdminLayout>
  );
}

function AlertSummary({
  stockCount,
  pedidoCount,
  entregaCount,
}: {
  stockCount: number;
  pedidoCount: number;
  entregaCount: number;
}) {
  const cards = [
    {
      label: "Stock mínimo",
      description: "Sin unidades disponibles",
      count: stockCount,
      tone: "warning" as const,
      icon: PackageCheck,
    },
    {
      label: "Pedidos vencidos",
      description: "Fecha esperada expirada",
      count: pedidoCount,
      tone: "critical" as const,
      icon: ClipboardCheck,
    },
    {
      label: "Entregas pendientes",
      description: "Aún sin entregar",
      count: entregaCount,
      tone: "warning" as const,
      icon: Truck,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const isCritical = card.tone === "critical";
        const palette = isCritical
          ? {
              border: "border-red-100",
              bg: "bg-red-50",
              count: "text-red-700",
              iconBg: "bg-red-200/60 text-red-600",
            }
          : {
              border: "border-amber-100",
              bg: "bg-amber-50",
              count: "text-amber-700",
              iconBg: "bg-amber-200/60 text-amber-600",
            };
        return (
          <article
            key={card.label}
            className={`flex items-center justify-between rounded-[32px] border px-6 py-5 shadow-sm ${palette.border} ${palette.bg}`}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{card.label}</p>
              <p className={`text-3xl font-bold ${palette.count}`}>{card.count}</p>
              <p className="text-sm text-slate-500">{card.description}</p>
            </div>
            <span className={`rounded-2xl p-3 ${palette.iconBg}`}>
              <Icon size={28} />
            </span>
          </article>
        );
      })}
    </div>
  );
}

function StockAlertPanel({
  alerts,
  total,
  page,
  totalPages,
  onPageChange,
}: {
  alerts: Array<{
    id: string;
    nombre: string;
    tipo?: string | null;
    marca?: string | null;
    modelo?: string | null;
    stockActual: number;
    stockMinimo: number;
  }>;
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) {
    return (
      <EmptyAlertState
        title="Sin productos en riesgo"
        description="Todos los productos tienen stock por encima del mínimo definido."
        tone="warning"
      />
    );
  }

  return (
    <section>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-amber-600">Stock bajo</h3>
      <div className="space-y-4">
        {alerts.map((alert) => (
          <article
            key={alert.id}
            className="rounded-3xl border border-amber-100 bg-amber-50/40 p-5 text-sm text-slate-700 shadow-sm transition hover:border-amber-200 hover:bg-white"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase text-amber-600">Producto</p>
                <h4 className="text-lg font-semibold text-slate-900">{alert.nombre}</h4>
                <p className="text-sm text-slate-500">
                  {[alert.tipo, alert.marca, alert.modelo].filter(Boolean).join(" • ") || "Sin clasificar"}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-inner">
                  <p className="text-xs uppercase text-slate-400">Stock actual</p>
                  <p className="text-2xl font-bold text-slate-900">{alert.stockActual}</p>
                </div>
                <div className="rounded-2xl bg-amber-100 px-4 py-3 text-center">
                  <p className="text-xs uppercase text-amber-700">Mínimo requerido</p>
                  <p className="text-2xl font-bold text-amber-900">{alert.stockMinimo}</p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      {totalPages > 1 && (
        <PaginationControls page={page} totalPages={totalPages} onChange={onPageChange} label="stock" />
      )}
    </section>
  );
}

function PedidoAlertPanel({
  alerts,
  total,
  page,
  totalPages,
  onPageChange,
}: {
  alerts: Array<{
    id: string;
    producto: string;
    suplidor: string;
    estado: string;
    fechaEsperada: string | null;
    diasRetraso: number;
    cantidad: number;
  }>;
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) {
    return (
      <EmptyAlertState
        title="Pedidos en orden"
        description="Todos los pedidos se han recibido antes de su fecha esperada."
        tone="critical"
      />
    );
  }

  return (
    <section>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-red-600">Pedidos vencidos</h3>
      <div className="space-y-4">
        {alerts.map((alert) => (
          <article
            key={alert.id}
            className="rounded-3xl border border-red-200 bg-red-50/70 p-5 text-sm text-red-900 shadow-sm transition hover:border-red-300 hover:bg-white"
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-red-500">Producto</p>
                <h4 className="text-lg font-bold text-slate-900">{alert.producto}</h4>
                <p className="text-sm text-slate-500">Proveedor: {alert.suplidor}</p>
                <p className="text-sm text-slate-500">Cantidad solicitada: {alert.cantidad}</p>
              </div>
              <div className="rounded-2xl border border-red-100 bg-white px-4 py-3 text-slate-600">
                <p className="text-xs uppercase text-red-400">Retraso</p>
                <p className="text-2xl font-bold text-red-600">
                  {alert.diasRetraso} {alert.diasRetraso === 1 ? "día" : "días"}
                </p>
                <p className="text-sm">
                  Esperado:{" "}
                  {alert.fechaEsperada ? new Date(alert.fechaEsperada).toLocaleDateString() : "Sin fecha definida"}
                </p>
                <p className="text-xs uppercase text-red-400">Estado actual: {alert.estado}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
      {totalPages > 1 && (
        <PaginationControls page={page} totalPages={totalPages} onChange={onPageChange} label="pedidos" />
      )}
    </section>
  );
}

function EntregaAlertPanel({
  alerts,
  total,
  page,
  totalPages,
  onPageChange,
}: {
  alerts: Array<{ id: string; ticket: string; vendedor: string; estado: string; total: number; fecha: string }>;
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) {
    return (
      <EmptyAlertState
        title="No hay entregas pendientes"
        description="Todas las salidas se entregaron correctamente."
        tone="warning"
      />
    );
  }

  return (
    <section>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-amber-600">Entregas pendientes</h3>
      <div className="space-y-4">
        {alerts.map((alert) => (
          <article
            key={alert.id}
            className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-slate-800 shadow-sm transition hover:border-amber-300 hover:bg-white"
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <div>
                <p className="text-xs uppercase text-amber-600">Ticket</p>
                <h4 className="text-lg font-semibold text-slate-900">{alert.ticket}</h4>
                <p className="text-sm text-slate-500">Vendedor: {alert.vendedor}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-amber-600">Estado</p>
                <p className="text-base font-semibold">{alert.estado}</p>
                <p className="text-sm text-slate-500">
                  Fecha de salida: {new Date(alert.fecha).toLocaleDateString()}{" "}
                </p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-inner">
                <p className="text-xs uppercase text-slate-400">Monto</p>
                <p className="text-2xl font-bold text-slate-900">
                  RD$ {currencyFormatter.format(alert.total)}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
      {totalPages > 1 && (
        <PaginationControls page={page} totalPages={totalPages} onChange={onPageChange} label="entregas" />
      )}
    </section>
  );
}

function EmptyAlertState({ title, description, tone }: { title: string; description: string; tone: "warning" | "critical" }) {
  const isCritical = tone === "critical";
  return (
    <div
      className={
        isCritical
          ? "flex flex-col items-center gap-3 rounded-3xl border border-red-100 bg-red-50/70 px-6 py-12 text-center"
          : "flex flex-col items-center gap-3 rounded-3xl border border-amber-100 bg-amber-50/70 px-6 py-12 text-center"
      }
    >
      <AlertTriangle size={32} className={isCritical ? "text-red-400" : "text-amber-400"} />
      <h3 className="text-lg font-semibold text-slate-700">{title}</h3>
      <p className="max-w-xl text-sm text-slate-500">{description}</p>
    </div>
  );
}

function FilterTabs({ active, onChange }: { active: AlertFilter; onChange: (value: AlertFilter) => void }) {
  const options: Array<{ value: AlertFilter; label: string }> = [
    { value: "all", label: "Todas" },
    { value: "stock", label: "Stock mínimo" },
    { value: "pedidos", label: "Pedidos vencidos" },
    { value: "entregas", label: "Entregas pendientes" },
  ];
  return (
    <div className="mb-6 flex flex-wrap gap-2 rounded-3xl bg-slate-50 p-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={clsx(
            "rounded-2xl px-4 py-2 text-sm font-semibold transition",
            active === option.value ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-white"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function PaginationControls({
  page,
  totalPages,
  onChange,
  label,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  label: string;
}) {
  const goTo = (next: number) => {
    const clamped = Math.min(Math.max(next, 1), totalPages);
    onChange(clamped);
  };
  return (
    <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
      <span className="uppercase tracking-widest">
        Página {page} de {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          className="rounded-full border border-slate-200 p-2 text-slate-600 transition enabled:hover:bg-white disabled:opacity-40"
          aria-label={`Página anterior en ${label}`}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
          className="rounded-full border border-slate-200 p-2 text-slate-600 transition enabled:hover:bg-white disabled:opacity-40"
          aria-label={`Página siguiente en ${label}`}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function clampPage(page: number, totalItems: number) {
  const totalPages = Math.max(1, Math.ceil(Math.max(totalItems, 0) / PAGE_SIZE));
  return Math.min(Math.max(page, 1), totalPages);
}

function paginate<T>(items: T[], page: number) {
  const totalPages = Math.max(1, Math.ceil(Math.max(items.length, 0) / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  return { items: items.slice(start, start + PAGE_SIZE), page: safePage, totalPages };
}
