"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import StatsGrid from "@/components/dashboard/StatsGrid";
import useRequireAuth from "@/hooks/useRequireAuth";
import { useAuth } from "@/context/AuthContext";
import { fetchProducts } from "@/lib/api";
import type { Product } from "@/types";
import Input from "@/components/ui/Input";
import SearchableSelect from "@/components/ui/SearchableSelect";
import DataTable from "@/components/ui/DataTable";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import clsx from "clsx";
import { AlertTriangle, Boxes, PackageCheck, PackageX, RefreshCcw } from "lucide-react";

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;
const numberFormatter = new Intl.NumberFormat("es-DO", { maximumFractionDigits: 0 });

const formatUnits = (value: number) => numberFormatter.format(Math.max(0, Math.round(value)));
const getNumericValue = (value: number | undefined | null) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getAvailableUnits = (product: Product) => Math.max(getNumericValue(product.stockActual) - getNumericValue(product.stockNoDisponible), 0);
const getOnHoldUnits = (product: Product) => Math.max(Math.min(getNumericValue(product.stockNoDisponible), getNumericValue(product.stockActual)), 0);
const isLowStock = (product: Product) => {
  const minimum = getNumericValue(product.stockMinimo);
  if (!minimum) return false;
  return getAvailableUnits(product) <= minimum;
};

type AvailabilityFilter = "all" | "available" | "unavailable";
type InactivityAlert = {
  product: Product;
  weeksWithoutMovement: number | null;
  limit: number;
};

const toneClasses = {
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
  neutral: "bg-slate-100 text-slate-700"
} as const;

const availabilityOptions: Array<{ value: AvailabilityFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "available", label: "Con unidades libres" },
  { value: "unavailable", label: "Sin unidades libres" }
];

const StatusPill = ({ tone, label }: { tone: keyof typeof toneClasses; label: string }) => (
  <span className={clsx("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", toneClasses[tone])}>{label}</span>
);

export default function InventoryPage() {
  const { hydrated } = useRequireAuth();
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadProducts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProducts(token);
      setProducts(data);
      setLastUpdated(new Date());
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (hydrated && token) {
      void loadProducts();
    }
  }, [hydrated, token, loadProducts]);

  const typeOptions = useMemo(() => {
    const unique = new Map<string, string>();
    products.forEach((product) => {
      if (product.tipoId && product.tipoNombre) {
        unique.set(product.tipoId, product.tipoNombre);
      }
    });
    return [
      { value: "all", label: "Todos los tipos" },
      ...Array.from(unique.entries()).map(([value, label]) => ({ value, label }))
    ];
  }, [products]);

  const brandOptions = useMemo(() => {
    const unique = new Map<string, string>();
    products.forEach((product) => {
      if (product.marcaId && product.marcaNombre) {
        unique.set(product.marcaId, product.marcaNombre);
      }
    });
    return [
      { value: "all", label: "Todas las marcas" },
      ...Array.from(unique.entries()).map(([value, label]) => ({ value, label }))
    ];
  }, [products]);

  const lowStockProducts = useMemo(
    () =>
      products
        .filter((product) => isLowStock(product))
        .sort((a, b) => getAvailableUnits(a) - getAvailableUnits(b)),
    [products]
  );

  const inactivityAlerts = useMemo<InactivityAlert[]>(() => {
    const now = Date.now();
    return products
      .map((product) => {
        const limit = getNumericValue(product.semanasMaxSinMovimiento);
        if (!limit) return null;
        if (!product.ultimaFechaMovimiento) {
          return { product, weeksWithoutMovement: null, limit };
        }
        const last = new Date(product.ultimaFechaMovimiento);
        if (Number.isNaN(last.getTime())) {
          return { product, weeksWithoutMovement: null, limit };
        }
        const diffWeeks = Math.floor((now - last.getTime()) / WEEK_IN_MS);
        if (diffWeeks >= limit) {
          return { product, weeksWithoutMovement: diffWeeks, limit };
        }
        return null;
      })
      .filter((alert): alert is InactivityAlert => Boolean(alert))
      .sort((a, b) => {
        const aValue = a.weeksWithoutMovement ?? a.limit;
        const bValue = b.weeksWithoutMovement ?? b.limit;
        return bValue - aValue;
      });
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products
      .filter((product) => {
        if (term) {
          const haystack = [
            product.nombre,
            product.descripcion,
            product.marcaNombre,
            product.modeloNombre,
            product.tipoNombre
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(term)) {
            return false;
          }
        }
        if (typeFilter !== "all" && product.tipoId !== typeFilter) {
          return false;
        }
        if (brandFilter !== "all" && product.marcaId !== brandFilter) {
          return false;
        }
        const availableUnits = getAvailableUnits(product);
        if (availabilityFilter === "available" && availableUnits <= 0) {
          return false;
        }
        if (availabilityFilter === "unavailable" && availableUnits > 0) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [products, search, typeFilter, brandFilter, availabilityFilter]);

  const totalUnits = useMemo(
    () => products.reduce((sum, product) => sum + getNumericValue(product.stockActual), 0),
    [products]
  );
  const blockedUnits = useMemo(
    () => products.reduce((sum, product) => sum + getOnHoldUnits(product), 0),
    [products]
  );
  const stats = [
    {
      label: "Productos registrados",
      value: products.length.toString(),
      caption: "Disponibles en el catálogo",
      icon: Boxes
    },
    {
      label: "Unidades libres",
      value: formatUnits(Math.max(totalUnits - blockedUnits, 0)),
      caption: "Stock listo para venta",
      icon: PackageCheck,
      iconClassName: "bg-emerald-50 text-emerald-600"
    },
    {
      label: "Stock en alerta",
      value: lowStockProducts.length.toString(),
      caption: "Al nivel mínimo o inferior",
      icon: AlertTriangle,
      iconClassName: "bg-amber-50 text-amber-600"
    },
    {
      label: "Unidades bloqueadas",
      value: formatUnits(blockedUnits),
      caption: "Apartadas o averiadas",
      icon: PackageX,
      iconClassName: "bg-rose-50 text-rose-600"
    }
  ];

  const tableRows = useMemo(
    () =>
      filteredProducts.map((product) => {
        const availableUnits = getAvailableUnits(product);
        const onHoldUnits = getOnHoldUnits(product);
        const stockMinimum = getNumericValue(product.stockMinimo);
        const statusPill = !product.disponible
          ? <StatusPill tone="danger" label="No disponible" />
          : availableUnits === 0
            ? <StatusPill tone="neutral" label="Sin unidades libres" />
            : isLowStock(product)
              ? <StatusPill tone="warning" label="Stock bajo" />
              : <StatusPill tone="success" label="Disponible" />;
        return [
          <div key={`product-${product.id}`} className="min-w-[180px]">
            <p className="font-semibold text-slate-900">{product.nombre}</p>
            <p className="text-xs text-slate-500">
              {[product.marcaNombre, product.modeloNombre].filter(Boolean).join(" • ") || "Sin detalles"}
            </p>
          </div>,
          product.tipoNombre ?? "—",
          <span
            key={`available-${product.id}`}
            className={clsx("font-semibold", isLowStock(product) && "text-amber-600")}
          >
            {formatUnits(availableUnits)} uds
          </span>,
          onHoldUnits ? `${formatUnits(onHoldUnits)} uds` : "—",
          stockMinimum ? `${formatUnits(stockMinimum)} uds` : "—",
          product.ultimaFechaMovimiento
            ? new Date(product.ultimaFechaMovimiento).toLocaleDateString("es-DO")
            : "Sin registro",
          statusPill
        ];
      }),
    [filteredProducts]
  );

  const handleResetFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setBrandFilter("all");
    setAvailabilityFilter("all");
  };

  if (!hydrated) {
    return null;
  }

  const tableLoading = loading && products.length === 0;
  const lowStockPreview = lowStockProducts.slice(0, 5);
  const inactivityPreview = inactivityAlerts.slice(0, 5);

  return (
    <AdminLayout active="Inventario">
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Inventario</p>
              <h1 className="mt-1 text-3xl font-semibold text-slate-900">Visión general</h1>
              <p className="text-sm text-slate-500">
                Consulta rápidamente las unidades disponibles, los riesgos de stock y el movimiento reciente.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
              {lastUpdated && (
                <p className="text-xs text-slate-500">
                  Actualizado {lastUpdated.toLocaleString("es-DO")}
                </p>
              )}
              <Button
                type="button"
                variant="subtle"
                className="flex items-center gap-2 border border-slate-200 bg-white/80 text-slate-600"
                onClick={() => void loadProducts()}
                disabled={loading}
              >
                <RefreshCcw size={16} className={clsx(loading && "animate-spin")} />
                {loading ? "Actualizando..." : "Actualizar datos"}
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="error" floating={false}>
            {error}
          </Alert>
        )}

        <StatsGrid stats={stats} />

        <div className="rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="md:flex-1">
              <label className="text-xs uppercase text-slate-400">Buscar</label>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Producto, marca o tipo"
                className="mt-1"
              />
            </div>
            <div className="md:flex-1">
              <label className="text-xs uppercase text-slate-400">Tipo</label>
              <SearchableSelect
                className="mt-1"
                value={typeFilter}
                onChange={setTypeFilter}
                options={typeOptions}
              />
            </div>
            <div className="md:flex-1">
              <label className="text-xs uppercase text-slate-400">Marca</label>
              <SearchableSelect
                className="mt-1"
                value={brandFilter}
                onChange={setBrandFilter}
                options={brandOptions}
              />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs uppercase text-slate-400">Disponibilidad</p>
              <div className="flex flex-wrap gap-2">
                {availabilityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAvailabilityFilter(option.value)}
                    className={clsx(
                      "rounded-full px-4 py-2 text-sm font-semibold transition",
                      availabilityFilter === option.value
                        ? "bg-slate-900 text-white shadow"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-slate-500 underline-offset-4 hover:underline"
                onClick={handleResetFilters}
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Detalle</p>
                  <h2 className="text-xl font-semibold text-slate-900">Inventario por producto</h2>
                </div>
                <p className="text-xs text-slate-500">
                  {filteredProducts.length} resultado{filteredProducts.length === 1 ? "" : "s"}
                </p>
              </div>
              <DataTable
                headers={["Producto", "Tipo", "Disponible", "No disponible", "Stock mínimo", "Último movimiento", "Estado"]}
                rows={tableRows}
                loading={tableLoading}
              />
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-100 bg-white/80 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Alerta</p>
              <h3 className="text-lg font-semibold text-slate-900">Stock bajo</h3>
              <p className="text-sm text-slate-500">Productos con unidades iguales o inferiores al stock mínimo.</p>
              <div className="mt-4 space-y-3">
                {lowStockPreview.length === 0 ? (
                  <p className="text-sm text-slate-500">No hay productos en alerta de stock.</p>
                ) : (
                  lowStockPreview.map((product) => {
                    const availableUnits = getAvailableUnits(product);
                    const minimum = getNumericValue(product.stockMinimo);
                    return (
                      <div key={`low-${product.id}`} className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{product.nombre}</p>
                            <p className="text-xs text-slate-500">
                              Disponible {formatUnits(availableUnits)} • Mínimo {formatUnits(minimum)}
                            </p>
                          </div>
                          <StatusPill tone="warning" label="Atención" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white/80 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Seguimiento</p>
              <h3 className="text-lg font-semibold text-slate-900">Sin movimiento</h3>
              <p className="text-sm text-slate-500">Productos que superaron el límite de semanas sin actividad.</p>
              <div className="mt-4 space-y-3">
                {inactivityPreview.length === 0 ? (
                  <p className="text-sm text-slate-500">No hay productos pendientes de movimiento.</p>
                ) : (
                  inactivityPreview.map((alert) => (
                    <div key={`inactive-${alert.product.id}`} className="rounded-2xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{alert.product.nombre}</p>
                          <p className="text-xs text-slate-500">
                            {alert.product.ultimaFechaMovimiento
                              ? `Último movimiento ${new Date(alert.product.ultimaFechaMovimiento).toLocaleDateString("es-DO")}`
                              : "Sin registro de movimientos"}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-slate-700">
                          {alert.weeksWithoutMovement === null
                            ? `>${alert.limit} sem`
                            : `${alert.weeksWithoutMovement} sem`}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
