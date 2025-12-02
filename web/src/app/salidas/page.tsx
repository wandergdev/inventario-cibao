"use client";

import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import useRequireAuth from "@/hooks/useRequireAuth";
import { useAuth } from "@/context/AuthContext";
import { createSalida, fetchProducts, fetchSalidas } from "@/lib/api";
import { Product, Salida } from "@/types";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import DataTable from "@/components/ui/DataTable";

const formatProductLabel = (product: Product) => {
  const brandModel =
    product.marca && product.modelo ? `${product.marca} ${product.modelo}` : product.marca ?? product.modelo ?? "";
  const typePart = product.tipoNombre ? `${product.tipoNombre} - ` : "";
  return `${typePart}${product.nombre}${brandModel ? ` (${brandModel.trim()})` : ""}`;
};

export default function SalidasPage() {
  const { hydrated } = useRequireAuth();
  const { token, role } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [salidas, setSalidas] = useState<Salida[]>([]);
  const [form, setForm] = useState({ tipoSalida: "tienda", fechaEntrega: "", productId: "", cantidad: 1 });
  const [lineItems, setLineItems] = useState<Array<{ productId: string; nombre: string; cantidad: number }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const [productsData, salidasData] = await Promise.all([fetchProducts(token), fetchSalidas(token)]);
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

  const addLineItem = (productId: string, cantidad: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    if (cantidad <= 0) return;
    setLineItems((prev) => [...prev, { productId, nombre: product.nombre, cantidad }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!token) return;
    if (lineItems.length === 0) {
      return setMessage("Agrega al menos un producto a la salida");
    }
    try {
      await createSalida(token, {
        tipoSalida: form.tipoSalida as "tienda" | "ruta",
        fechaEntrega: form.fechaEntrega || undefined,
        productos: lineItems.map((item) => ({ productId: item.productId, cantidad: item.cantidad }))
      });
      setMessage("Salida registrada");
      setLineItems([]);
      const updated = await fetchSalidas(token);
      setSalidas(updated);
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const recentRows = salidas.slice(0, 10).map((s) => [s.ticket, s.vendedor, s.estado, `RD$ ${s.total.toLocaleString("es-DO")}`]);

  const totalItems = useMemo(() => lineItems.reduce((sum, item) => sum + item.cantidad, 0), [lineItems]);

  const canCreate = role === "Administrador" || role === "Vendedor";

  if (!hydrated) {
    return null;
  }

  return (
    <AdminLayout active="Salidas">
      {message && <p className="mb-4 text-sm text-slate-500">{message}</p>}
      {canCreate && (
        <section className="mb-6 rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Registrar salida</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div>
              <label className="text-xs uppercase text-slate-400">Tipo de salida</label>
              <select
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                value={form.tipoSalida}
                onChange={(e) => setForm((prev) => ({ ...prev, tipoSalida: e.target.value }))}
              >
                <option value="tienda">Tienda</option>
                <option value="ruta">Ruta</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase text-slate-400">Fecha entrega (opcional)</label>
              <Input
                type="date"
                value={form.fechaEntrega}
                onChange={(e) => setForm((prev) => ({ ...prev, fechaEntrega: e.target.value }))}
              />
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-700">Productos</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <select
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                value={form.productId}
                onChange={(e) => setForm((prev) => ({ ...prev, productId: e.target.value }))}
              >
                <option value="">Selecciona producto</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {formatProductLabel(product)}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                placeholder="Cantidad"
                className="w-32"
                value={form.cantidad}
                onChange={(e) => setForm((prev) => ({ ...prev, cantidad: Number(e.target.value) }))}
              />
              <Button
                type="button"
                variant="accent"
                onClick={() => {
                  if (!form.productId) return;
                  addLineItem(form.productId, form.cantidad);
                  setForm((prev) => ({ ...prev, productId: "", cantidad: 1 }));
                }}
              >
                Agregar
              </Button>
            </div>
            {lineItems.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm">
                {lineItems.map((item, index) => (
                  <li key={`${item.productId}-${index}`} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-2">
                    <div>
                      <p className="font-semibold text-slate-800">{item.nombre}</p>
                      <p className="text-xs text-slate-500">Cantidad: {item.cantidad}</p>
                    </div>
                    <Button variant="subtle" onClick={() => removeLineItem(index)}>
                      Quitar
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-xs text-slate-500">Agrega productos para generar la salida.</p>
            )}
            <p className="mt-4 text-xs uppercase text-slate-400">Total artículos: {totalItems}</p>
            <Button type="button" className="mt-4" onClick={handleSubmit} disabled={!lineItems.length}>
              Guardar salida
            </Button>
          </div>
        </section>
      )}
      <section className="rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Salidas Registradas</h2>
        <p className="text-sm text-slate-500">Últimos movimientos registrados</p>
        <div className="mt-4">
          <DataTable headers={["Ticket", "Vendedor", "Estado", "Monto"]} rows={recentRows} loading={loading} />
        </div>
      </section>
    </AdminLayout>
  );
}
