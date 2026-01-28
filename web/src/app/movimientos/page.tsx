"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import StatsGrid from "@/components/dashboard/StatsGrid";
import useRequireAuth from "@/hooks/useRequireAuth";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/ui/Input";
import { fetchMovimientoDetalle, fetchMovimientos, fetchProducts } from "@/lib/api";
import { Activity, ArrowDownToLine, ArrowUpToLine, ArrowUpDown } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import type { Movimiento, MovimientoDetalle, Product } from "@/types";

const tipoOptions = [
  { value: "todos", label: "Todos los movimientos" },
  { value: "salida", label: "Salidas" },
  { value: "entrada", label: "Entradas" },
  // { value: "ajuste", label: "Ajustes" },
];

const tipoClasses: Record<string, string> = {
  salida: "bg-rose-100 text-rose-700",
  entrada: "bg-emerald-100 text-emerald-700",
  ajuste: "bg-amber-100 text-amber-700",
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatTipoVenta = (tipo?: string | null) => (tipo === "credito" ? "Crédito" : "Contado");

const getTicketSequenceValue = (ticket?: { ticket_numero?: number; ticketNumero?: number | null } | null) => {
  if (!ticket) return null;
  const value = ticket.ticket_numero ?? ticket.ticketNumero;
  return typeof value === "number" ? value : null;
};

const formatTicketSequence = (ticket?: { ticket_numero?: number; ticketNumero?: number | null } | null) => {
  const value = getTicketSequenceValue(ticket);
  if (value === null || value === undefined) {
    return null;
  }
  return `#${value.toString().padStart(4, "0")}`;
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("es-DO");

const sanitizeObservation = (raw?: string | null, tipo?: string) => {
  const normalizedTipo = (tipo ?? "").toLowerCase();
  if (normalizedTipo === "entrada") {
    return "Entrada";
  }
  if (normalizedTipo === "salida") {
    return "Salida";
  }
  if (!raw) {
    return "—";
  }
  if (/^pedido\b/i.test(raw) || /entrada/i.test(raw)) {
    return "Entrada";
  }
  if (/^salida\b/i.test(raw)) {
    return "Salida";
  }
  return raw;
};

export default function MovimientosPage() {
  const { hydrated } = useRequireAuth();
  const { token, role } = useAuth();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<
    "info" | "success" | "error"
  >("info");
  const [filters, setFilters] = useState({ tipo: "todos", productId: "" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailMovimiento, setDetailMovimiento] = useState<Movimiento | null>(null);
  const [movimientoDetalle, setMovimientoDetalle] = useState<MovimientoDetalle | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const isAdmin = role === "Administrador";

  const showAlert = (
    text: string | null,
    variant: "info" | "success" | "error" = "info"
  ) => {
    setMessage(text);
    if (text) {
      setMessageVariant(variant);
    }
  };

  const loadMovimientos = useCallback(async () => {
    if (!token || !isAdmin) return;
    setLoading(true);
    try {
      const data = await fetchMovimientos(token, {
        tipo: filters.tipo !== "todos" ? filters.tipo : undefined,
        productId: filters.productId || undefined,
      });
      setMovimientos(data);
      showAlert(null);
    } catch (error) {
      showAlert((error as Error).message, "error");
      setMovimientos([]);
    } finally {
      setLoading(false);
    }
  }, [token, filters.tipo, filters.productId, isAdmin]);

  useEffect(() => {
    if (hydrated && token && isAdmin) {
      void loadMovimientos();
    }
  }, [hydrated, token, isAdmin, loadMovimientos]);

  useEffect(() => {
    setPage(1);
  }, [filters, search, movimientos.length]);

  useEffect(() => {
    const loadProducts = async () => {
      if (!token) return;
      try {
        setProducts(await fetchProducts(token));
      } catch (error) {
        showAlert((error as Error).message, "error");
      }
    };
    if (hydrated && token && isAdmin) {
      void loadProducts();
    }
  }, [hydrated, token, isAdmin]);

  const stats = useMemo(() => {
    const total = movimientos.length;
    const salidas = movimientos.filter(
      (m) => m.tipoMovimiento === "salida"
    ).length;
    const entradas = movimientos.filter(
      (m) => m.tipoMovimiento === "entrada"
    ).length;
    const neto = movimientos.reduce((sum, mov) => {
      if (mov.tipoMovimiento === "salida") return sum - mov.cantidad;
      if (mov.tipoMovimiento === "entrada") return sum + mov.cantidad;
      return sum;
    }, 0);

    return [
      {
        label: "Movimientos registrados",
        value: total.toString(),
        caption: "Registros filtrados",
        icon: Activity,
      },
      {
        label: "Salidas",
        value: salidas.toString(),
        caption: "Descargas de stock",
        icon: ArrowDownToLine,
        iconClassName: "bg-rose-50 text-rose-600",
      },
      {
        label: "Entradas",
        value: entradas.toString(),
        caption: "Recargas de stock",
        icon: ArrowUpToLine,
        iconClassName: "bg-emerald-50 text-emerald-600",
      },
      // {
      //   label: "Variación neta",
      //   value: `${neto >= 0 ? "+" : ""}${neto}`,
      //   caption: "Entradas - salidas",
      //   icon: ArrowUpDown,
      //   iconClassName: "bg-indigo-50 text-indigo-600",
      // },
    ];
  }, [movimientos]);

  const filteredMovimientos = useMemo(() => {
    const base = movimientos;
    if (!search) return base;
    const query = search.toLowerCase();
    return base.filter((mov) =>
      [
        mov.producto,
        mov.usuario,
        mov.tipoMovimiento,
        sanitizeObservation(mov.observacion, mov.tipoMovimiento),
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [movimientos, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMovimientos.length / pageSize)
  );
  const currentPage = Math.min(page, totalPages);
  const paginatedMovimientos = filteredMovimientos.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const pageStart =
    filteredMovimientos.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(filteredMovimientos.length, currentPage * pageSize);
  const ticketDetail = movimientoDetalle?.ticket ?? null;
  const movimientoResumen = movimientoDetalle?.movimiento ?? detailMovimiento;

  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setDetailMovimiento(null);
    setMovimientoDetalle(null);
    setDetailError(null);
    setDetailLoading(false);
  };

  const handleOpenDetail = async (movimiento: Movimiento) => {
    if (!token) {
      showAlert("Sesión inválida", "error");
      return;
    }
    setDetailModalOpen(true);
    setDetailMovimiento(movimiento);
    setMovimientoDetalle(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const data = await fetchMovimientoDetalle(token, movimiento.id);
      setMovimientoDetalle(data);
    } catch (error) {
      setDetailError((error as Error).message || "No se pudo cargar el detalle");
    } finally {
      setDetailLoading(false);
    }
  };

  if (!hydrated) {
    return null;
  }

  if (!isAdmin) {
    return (
      <AdminLayout active="Movimientos">
        <p className="text-sm text-slate-500">
          No tienes permisos para consultar los movimientos de inventario.
        </p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout active="Movimientos">
      {message && (
        <div className="mb-4">
          <Alert variant={messageVariant} onDismiss={() => showAlert(null)}>
            {message}
          </Alert>
        </div>
      )}
      <StatsGrid stats={stats} />
      <section className="mt-6 rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs uppercase text-slate-400">
                Tipo de movimiento
              </label>
              <select
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-800"
                value={filters.tipo}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, tipo: e.target.value }))
                }
              >
                {tipoOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {/* <div>
              <label className="text-xs uppercase text-slate-400">Producto</label>
              <select
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-800"
                value={filters.productId}
                onChange={(e) => setFilters((prev) => ({ ...prev, productId: e.target.value }))}
              >
                <option value="">Todos los productos</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.nombre}
                  </option>
                ))}
              </select>
            </div> */}
            <div>
              <label className="text-xs uppercase text-slate-400">Buscar</label>
              <Input
                placeholder="Producto, usuario u observación"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <button
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            onClick={() => void loadMovimientos()}
          >
            Actualizar
          </button>
        </div>
        <div className="mt-6">
          {loading ? (
            <p className="text-sm text-slate-400">Cargando movimientos...</p>
          ) : filteredMovimientos.length === 0 ? (
            <p className="text-sm text-slate-400">
              No se encuentran movimientos con los filtros seleccionados.
            </p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-2">Producto</th>
                    <th className="px-4 py-2">Tipo</th>
                    <th className="px-4 py-2">Cantidad</th>
                    <th className="px-4 py-2">Stock anterior</th>
                    <th className="px-4 py-2">Stock nuevo</th>
                    <th className="px-4 py-2">Fecha</th>
                    <th className="px-4 py-2">Usuario</th>
                    <th className="px-4 py-2">Observación</th>
                    <th className="px-4 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMovimientos.map((movimiento) => (
                    <tr
                      key={movimiento.id}
                      className="border-t border-slate-100"
                    >
                      <td className="px-4 py-2 font-medium text-slate-800">
                        {movimiento.producto}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                            tipoClasses[movimiento.tipoMovimiento] ??
                            "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {movimiento.tipoMovimiento}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {movimiento.cantidad}
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {movimiento.stockAnterior}
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {movimiento.stockNuevo}
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {formatDateTime(movimiento.fecha)}
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {movimiento.usuario}
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {sanitizeObservation(
                          movimiento.observacion,
                          movimiento.tipoMovimiento
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          variant="subtle"
                          className="border border-slate-200 px-3 py-1 text-xs"
                          type="button"
                          onClick={() => handleOpenDetail(movimiento)}
                        >
                          Ver detalle
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <p className="text-xs text-slate-500">
                  Mostrando {pageStart}-{pageEnd} de{" "}
                  {filteredMovimientos.length} movimientos
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs uppercase text-slate-400">
                      Por página
                    </label>
                    <select
                      className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-1 text-sm text-slate-800"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                    >
                      {[10, 25, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-2xl border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 disabled:opacity-40"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </button>
                    <span className="text-xs text-slate-500">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      className="rounded-2xl border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 disabled:opacity-40"
                      onClick={() =>
                        setPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      {detailModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Detalle del movimiento
                </p>
                <h3 className="text-lg font-semibold text-slate-900">
                  {movimientoResumen?.producto ?? "Movimiento"}
                </h3>
                {movimientoResumen && (
                  <p className="text-xs text-slate-500">
                    Registrado el {formatDateTime(movimientoResumen.fecha)}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:text-slate-700"
                onClick={closeDetailModal}
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-4">
              {detailLoading ? (
                <p className="text-sm text-slate-500">Cargando detalle...</p>
              ) : detailError ? (
                <Alert variant="error" onDismiss={() => setDetailError(null)}>
                  {detailError}
                </Alert>
              ) : (
                <>
                  {movimientoResumen && (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                      <p className="text-xs uppercase text-slate-400">
                        Información del movimiento
                      </p>
                      <div className="mt-3 grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase text-slate-400">
                            Tipo
                          </p>
                          <p className="text-sm text-slate-700 capitalize">
                            {movimientoResumen.tipoMovimiento}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-slate-400">
                            Observación
                          </p>
                          <p className="text-sm text-slate-700">
                            {sanitizeObservation(
                              movimientoResumen.observacion,
                              movimientoResumen.tipoMovimiento
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-slate-400">
                            Cantidad
                          </p>
                          <p className="text-sm text-slate-700">
                            {movimientoResumen.cantidad}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-slate-400">
                            Stock previo → nuevo
                          </p>
                          <p className="text-sm text-slate-700">
                            {movimientoResumen.stockAnterior} →{" "}
                            {movimientoResumen.stockNuevo}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {ticketDetail ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase text-slate-400">
                            Ticket
                          </p>
                          <p className="text-lg font-semibold text-slate-900">
                            {ticketDetail.ticket}
                          </p>
                          {formatTicketSequence(ticketDetail) && (
                            <p className="text-xs text-slate-500">
                              Secuencia {formatTicketSequence(ticketDetail)}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs uppercase text-slate-400">
                            Estado
                          </p>
                          <p className="text-sm font-semibold text-slate-800">
                            {ticketDetail.estado ?? "Sin estado"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-slate-400">
                            Vendedor
                          </p>
                          <p className="text-sm text-slate-700">
                            {ticketDetail.vendedor ?? "Sin asignar"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-slate-400">
                            Tipo de venta
                          </p>
                          <p className="text-sm text-slate-700">
                            {formatTipoVenta(
                              ticketDetail.tipo_venta ?? ticketDetail.tipoVenta
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-slate-400">
                            Tipo de salida
                          </p>
                          <p className="text-sm text-slate-700 capitalize">
                            {ticketDetail.tipo_salida}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-slate-400">
                            Total
                          </p>
                          <p className="text-lg font-semibold text-slate-900">
                            RD$ {currencyFormatter.format(Number(ticketDetail.total ?? 0))}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                        <p className="text-xs uppercase text-slate-400">Productos</p>
                        {ticketDetail.detalles && ticketDetail.detalles.length > 0 ? (
                          <div className="mt-3 overflow-auto rounded-2xl border border-slate-100 bg-white">
                            <table className="min-w-full text-left text-sm">
                              <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                                <tr>
                                  <th className="px-4 py-2">Producto</th>
                                  <th className="px-4 py-2">Cantidad</th>
                                  <th className="px-4 py-2">Precio</th>
                                  <th className="px-4 py-2">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ticketDetail.detalles.map((detalle, index) => (
                                  <tr
                                    key={`${ticketDetail.id}-detalle-${index}`}
                                    className="border-t border-slate-100"
                                  >
                                    <td className="px-4 py-2 text-slate-700">
                                      {detalle.producto}
                                    </td>
                                    <td className="px-4 py-2 text-slate-600">
                                      {detalle.cantidad}
                                    </td>
                                    <td className="px-4 py-2 text-slate-600">
                                      RD${" "}
                                      {currencyFormatter.format(
                                        Number(detalle.precioUnitario ?? 0)
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-slate-900">
                                      RD${" "}
                                      {currencyFormatter.format(
                                        Number(detalle.subtotal ?? 0)
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-slate-500">
                            No hay productos asociados a este ticket.
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">
                      {movimientoResumen?.tipoMovimiento === "entrada"
                        ? "Este movimiento es una entrada de inventario y no está asociado a un ticket."
                        : "No se encontró información de ticket para este movimiento."}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
