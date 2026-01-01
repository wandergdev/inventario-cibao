"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import useRequireAuth from "@/hooks/useRequireAuth";
import { useAuth } from "@/context/AuthContext";
import {
  createSalida,
  fetchProducts,
  fetchSalidas,
  fetchSalidaStatuses,
  updateSalida,
} from "@/lib/api";
import { Product, Salida, SalidaStatus } from "@/types";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import DataTable from "@/components/ui/DataTable";
import SearchableSelect from "@/components/ui/SearchableSelect";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatProductLabel = (product: Product) => {
  const brandModel =
    product.marcaNombre && product.modeloNombre
      ? `${product.marcaNombre} ${product.modeloNombre}`
      : product.marcaNombre ?? product.modeloNombre ?? "";
  const typePart = product.tipoNombre ? `${product.tipoNombre} - ` : "";
  return `${typePart}${product.nombre}${
    brandModel ? ` (${brandModel.trim()})` : ""
  }`;
};

const formatTipoVenta = (tipo?: string) => {
  return tipo === "credito" ? "Crédito" : "Contado";
};

export default function SalidasPage() {
  const { hydrated } = useRequireAuth();
  const { token, role } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [salidas, setSalidas] = useState<Salida[]>([]);
  const [statuses, setStatuses] = useState<SalidaStatus[]>([]);
  const [form, setForm] = useState({
    tipoSalida: "tienda",
    tipoVenta: "contado",
    fechaEntrega: "",
    estado: "",
    productId: "",
    cantidad: 1,
  });
  const [lineItems, setLineItems] = useState<
    Array<{ productId: string; nombre: string; cantidad: number }>
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterEstado, setFilterEstado] = useState("");
  const [editingSalida, setEditingSalida] = useState<Salida | null>(null);
  const [editEstado, setEditEstado] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const [productsData, salidasData] = await Promise.all([
          fetchProducts(token),
          fetchSalidas(token),
        ]);
        setProducts(productsData);
        setSalidas(salidasData);
      } catch (error) {
        setMessage((error as Error).message);
      } finally {
        setLoading(false);
      }
    };
    if (hydrated && token) {
      void load();
    }
  }, [token, hydrated]);
  const loadStatuses = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchSalidaStatuses(token);
      setStatuses(data);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadStatuses();
    }
  }, [token, loadStatuses]);

  useEffect(() => {
    const firstActive = statuses.find((status) => status.activo);
    if (firstActive && !form.estado) {
      setForm((prev) => ({ ...prev, estado: firstActive.nombre }));
    }
  }, [statuses, form.estado]);

  const addLineItem = (productId: string, cantidad: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    if (cantidad <= 0) return;
    setLineItems((prev) => [
      ...prev,
      { productId, nombre: product.nombre, cantidad },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const resetCreateForm = () => {
    setForm((prev) => ({
      ...prev,
      tipoSalida: "tienda",
      tipoVenta: "contado",
      fechaEntrega: "",
      estado: statuses.find((status) => status.activo)?.nombre ?? prev.estado,
      productId: "",
      cantidad: 1,
    }));
    setLineItems([]);
  };

  const handleSubmit = async () => {
    if (!token) return;
    if (lineItems.length === 0) {
      return setMessage("Agrega al menos un producto a la salida");
    }
    if (!form.estado) {
      return setMessage("Selecciona el estado de la salida");
    }
    try {
      await createSalida(token, {
        tipoSalida: form.tipoSalida as "tienda" | "ruta",
        tipoVenta: form.tipoVenta as "contado" | "credito",
        fechaEntrega: form.fechaEntrega || undefined,
        estado: form.estado,
        productos: lineItems.map((item) => ({
          productId: item.productId,
          cantidad: item.cantidad,
        })),
      });
      setMessage("Salida registrada");
      resetCreateForm();
      setShowCreateModal(false);
      const updated = await fetchSalidas(token);
      setSalidas(updated);
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const canCreate = role === "Administrador" || role === "Vendedor";

  const filteredSalidas = useMemo(
    () =>
      salidas.filter((salida) =>
        filterEstado ? salida.estado === filterEstado : true
      ),
    [salidas, filterEstado]
  );

  const recentRows = filteredSalidas.slice(0, 10).map((s) => [
    s.ticket,
    s.vendedor,
    s.estado,
    formatTipoVenta(s.tipo_venta ?? s.tipoVenta),
    `RD$ ${currencyFormatter.format(s.total)}`,
    canCreate ? (
      <Button
        variant="subtle"
        className="px-3 py-1 text-xs"
        onClick={() => openEditSalida(s)}
      >
        Editar
      </Button>
    ) : (
      "—"
    ),
  ]);

  const totalItems = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.cantidad, 0),
    [lineItems]
  );
  const productOptions = useMemo(
    () => [
      { value: "", label: "Selecciona producto" },
      ...products.map((product) => ({
        value: product.id,
        label: formatProductLabel(product),
      })),
    ],
    [products]
  );
  const statusOptions = useMemo(
    () =>
      statuses
        .filter((status) => status.activo)
        .map((status) => ({ value: status.nombre, label: status.nombre })),
    [statuses]
  );
  const allStatusOptions = useMemo(
    () =>
      statuses.map((status) => ({
        value: status.nombre,
        label: status.nombre,
      })),
    [statuses]
  );
  const filterStatusOptions = useMemo(() => {
    const unique = Array.from(new Set(salidas.map((salida) => salida.estado)));
    return [
      { value: "", label: "Todos los estados" },
      ...unique.map((estado) => ({ value: estado, label: estado })),
    ];
  }, [salidas]);

  const openEditSalida = (salida: Salida) => {
    setEditingSalida(salida);
    setEditEstado(salida.estado);
  };

  const closeEditSalida = () => {
    setEditingSalida(null);
    setEditEstado("");
    setSavingEdit(false);
  };

  const handleSaveSalidaEstado = async () => {
    if (!token || !editingSalida) return;
    if (!editEstado) {
      setMessage("Selecciona un estado");
      return;
    }
    setSavingEdit(true);
    try {
      await updateSalida(token, editingSalida.id, { estado: editEstado });
      setMessage("Estado de salida actualizado");
      closeEditSalida();
      const updated = await fetchSalidas(token);
      setSalidas(updated);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setSavingEdit(false);
    }
  };

  if (!hydrated) {
    return null;
  }

  return (
    <AdminLayout active="Salidas">
      {message && <p className="mb-4 text-sm text-slate-500">{message}</p>}
      {canCreate && (
        <div className="mb-4 flex justify-end">
          <Button variant="accent" onClick={() => setShowCreateModal(true)}>
            Registrar salida
          </Button>
        </div>
      )}
      <section className="rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Salidas Registradas
        </h2>
        <p className="text-sm text-slate-500">
          Últimos movimientos registrados
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-slate-400">
              Filtrar por estado
            </label>
            <SearchableSelect
              className="w-60"
              value={filterEstado}
              onChange={(value) => setFilterEstado(value)}
              options={filterStatusOptions}
              placeholder="Todos los estados"
            />
          </div>
          {filterEstado && (
            <Button
              variant="subtle"
              className="border border-slate-200"
              onClick={() => setFilterEstado("")}
            >
              Limpiar filtro
            </Button>
          )}
        </div>
        <div className="mt-4">
          <DataTable
            headers={[
              "Ticket",
              "Vendedor",
              "Estado",
              "Tipo de venta",
              "Monto",
              "Acciones",
            ]}
            rows={recentRows}
            loading={loading}
          />
        </div>
      </section>
      {(editingSalida || showCreateModal) && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-4">
          {editingSalida ? (
            <div className="w-full max-w-xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Actualizar estado
                  </p>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {editingSalida.ticket}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingSalida.vendedor}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:text-slate-700"
                  onClick={closeEditSalida}
                >
                  ✕
                </button>
              </div>
              <div className="mt-4 space-y-4">
                <div>
                    <label className="text-xs uppercase text-slate-500">
                      Estado <span className="text-red-500">*</span>
                    </label>
                  <SearchableSelect
                    className="mt-1"
                    value={editEstado}
                    onChange={(next) => setEditEstado(next)}
                    options={allStatusOptions}
                    placeholder="Selecciona estado"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  variant="subtle"
                  className="border border-slate-200"
                  type="button"
                  onClick={closeEditSalida}
                >
                  Cancelar
                </Button>
                <Button
                  variant="accent"
                  type="button"
                  onClick={handleSaveSalidaEstado}
                  disabled={savingEdit}
                >
                  {savingEdit ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-3xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Registrar salida
                  </p>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Nueva salida
                  </h3>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:text-slate-700"
                  onClick={() => {
                    resetCreateForm();
                    setShowCreateModal(false);
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="text-xs uppercase text-slate-400">
                    Tipo de salida <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                    value={form.tipoSalida}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        tipoSalida: e.target.value,
                      }))
                    }
                  >
                    <option value="tienda">Tienda</option>
                    <option value="ruta">Ruta</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-400">
                    Tipo de venta <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                    value={form.tipoVenta}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        tipoVenta: e.target.value,
                      }))
                    }
                  >
                    <option value="contado">Contado</option>
                    <option value="credito">Crédito</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-400">
                    Fecha entrega
                  </label>
                  <Input
                    type="date"
                    value={form.fechaEntrega}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        fechaEntrega: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-400">
                    Estado <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    className="mt-1"
                    value={form.estado}
                    onChange={(next) =>
                      setForm((prev) => ({ ...prev, estado: next }))
                    }
                    options={[
                      { value: "", label: "Selecciona estado" },
                      ...statusOptions,
                    ]}
                    placeholder="Selecciona estado"
                  />
                  {!statusOptions.length && (
                    <p className="mt-1 text-xs text-amber-600">
                      Agrega al menos un estado activo para registrar salidas.
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-700">
                  Productos <span className="text-red-500">*</span>
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <SearchableSelect
                    className="w-64"
                    value={form.productId}
                    onChange={(next) =>
                      setForm((prev) => ({ ...prev, productId: next }))
                    }
                    options={productOptions}
                    placeholder="Selecciona producto"
                  />
                  <div className="flex w-32 flex-col gap-1">
                    <label className="text-xs uppercase text-slate-400">
                      Cantidad <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      placeholder="Cantidad"
                      min={1}
                      step={1}
                      value={form.cantidad}
                      onChange={(e) => {
                        const parsed = Number(e.target.value);
                        setForm((prev) => ({
                          ...prev,
                          cantidad: Number.isNaN(parsed)
                            ? 1
                            : Math.max(1, parsed),
                        }));
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="accent"
                    onClick={() => {
                      if (!form.productId) return;
                      addLineItem(form.productId, form.cantidad);
                      setForm((prev) => ({
                        ...prev,
                        productId: "",
                        cantidad: 1,
                      }));
                    }}
                    disabled={!form.productId || !form.estado}
                  >
                    Agregar
                  </Button>
                </div>
                {lineItems.length > 0 ? (
                  <ul className="mt-4 space-y-2 text-sm">
                    {lineItems.map((item, index) => (
                      <li
                        key={`${item.productId}-${index}`}
                        className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-2"
                      >
                        <div>
                          <p className="font-semibold text-slate-800">
                            {item.nombre}
                          </p>
                          <p className="text-xs text-slate-500">
                            Cantidad: {item.cantidad}
                          </p>
                        </div>
                        <Button
                          variant="subtle"
                          onClick={() => removeLineItem(index)}
                        >
                          Quitar
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-xs text-slate-500">
                    Agrega productos para generar la salida.
                  </p>
                )}
                <p className="mt-4 text-xs uppercase text-slate-400">
                  Total artículos: {totalItems}
                </p>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  variant="subtle"
                  className="border border-slate-200"
                  onClick={() => {
                    resetCreateForm();
                    setShowCreateModal(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!lineItems.length}
                >
                  Guardar salida
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
