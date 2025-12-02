"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import ManagementSection from "@/components/dashboard/ManagementSection";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import StatsGrid from "@/components/dashboard/StatsGrid";
import { useAuth } from "@/context/AuthContext";
import useRequireAuth from "@/hooks/useRequireAuth";
import { Product, Supplier, ProductType, Brand, Model } from "@/types";
import { createProduct, fetchProducts, fetchSuppliers, fetchProductTypes, fetchBrands, fetchModels } from "@/lib/api";
import { Boxes, Layers, PackageOpen, TrendingDown } from "lucide-react";

const initialFormState = {
  nombre: "",
  descripcion: "",
  tipoId: "",
  marcaId: "",
  modeloId: "",
  modeloNombre: "",
  precioTienda: "",
  precioRuta: "",
  stockActual: "",
  stockMinimo: "",
  suplidorId: "",
  disponible: "disponible" as "disponible" | "no-disponible",
  motivoNoDisponible: ""
};

export default function ProductsPage() {
  const { token, role } = useAuth();
  const { hydrated } = useRequireAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState(initialFormState);
  const isAdmin = role === "Administrador";

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setProducts(await fetchProducts(token));
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void load();
    }
  }, [token, load]);

useEffect(() => {
  if (!token) return;
  const loadAuxData = async () => {
    try {
      const [typesData, brandsData, suppliersData] = await Promise.all([
        fetchProductTypes(token),
        fetchBrands(token),
        isAdmin ? fetchSuppliers(token) : Promise.resolve([] as Supplier[])
      ]);
      setProductTypes(typesData);
      setBrands(brandsData);
      if (isAdmin) {
        setSuppliers(suppliersData as Supplier[]);
      }
    } catch (error) {
      setMessage((error as Error).message);
    }
  };
  void loadAuxData();
}, [token, isAdmin]);

useEffect(() => {
  if (!token || !form.marcaId) {
    setModels([]);
    setForm((prev) => ({ ...prev, modeloId: "", modeloNombre: "" }));
    return;
  }
  const loadModelsForBrand = async () => {
    try {
      const data = await fetchModels(token, form.marcaId);
      setModels(data);
    } catch (error) {
      setMessage((error as Error).message);
    }
  };
  void loadModelsForBrand();
}, [token, form.marcaId]);

  const formatCurrency = useMemo(
    () => (value: number) => `RD$ ${value.toLocaleString("es-DO", { minimumFractionDigits: 2 })}`,
    []
  );

  const handleSubmit = async () => {
    if (!token || !isAdmin) return;
    if (!form.nombre.trim()) {
      return setMessage("Ingresa el nombre del producto");
    }
    if (!form.tipoId.trim() || !form.marcaId.trim()) {
      return setMessage("Selecciona tipo y marca del producto");
    }
    if (!form.modeloId && !form.modeloNombre.trim()) {
      return setMessage("Selecciona un modelo o escribe uno nuevo");
    }
    if (!form.precioTienda || !form.precioRuta) {
      return setMessage("Define los precios de tienda y ruta");
    }
    if (form.disponible === "no-disponible" && !form.motivoNoDisponible.trim()) {
      return setMessage("Agrega el motivo de indisponibilidad");
    }

    try {
      await createProduct(token, {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || undefined,
        tipoId: form.tipoId.trim(),
        marcaId: form.marcaId.trim(),
        modeloId: form.modeloId || undefined,
        modeloNombre: !form.modeloId ? form.modeloNombre.trim() || undefined : undefined,
        precioTienda: Number(form.precioTienda),
        precioRuta: Number(form.precioRuta),
        stockActual: Number(form.stockActual || 0),
        stockMinimo: Number(form.stockMinimo || 0),
        suplidorId: form.suplidorId || undefined,
        disponible: form.disponible === "disponible",
        motivoNoDisponible:
          form.disponible === "disponible" ? undefined : form.motivoNoDisponible.trim() || undefined
      });
      setForm(initialFormState);
      setMessage("Producto registrado correctamente");
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  if (!hydrated) {
    return null;
  }

  const headers = ["Producto", "Tipo / Marca", "Suplidor", "Stock", "Precio tienda", "Precio ruta", "Disponibilidad"];
  const rows = products.map((product) => [
    product.nombre,
    product.tipoNombre ? `${product.tipoNombre}${product.marcaNombre ? ` • ${product.marcaNombre} ${product.modeloNombre ?? ""}` : ""}` : "—",
    product.suplidor ?? "Sin suplidor",
    `${product.stockActual} (mín. ${product.stockMinimo})`,
    formatCurrency(product.precioTienda),
    formatCurrency(product.precioRuta),
    product.disponible ? "Disponible" : product.motivoNoDisponible ?? "No disponible"
  ]);

  return (
    <AdminLayout active="Productos">
      {message && <p className="text-sm text-slate-500">{message}</p>}
      <StatsGrid
        stats={[
          {
            label: "Productos activos",
            value: products.filter((p) => p.disponible).length.toString(),
            caption: "Listos para vender",
            icon: Boxes
          },
          {
            label: "Fuera de stock",
            value: products.filter((p) => p.stockActual <= 0).length.toString(),
            caption: "Revisar pedidos",
            icon: PackageOpen,
            iconClassName: "bg-rose-50 text-rose-500"
          },
          {
            label: "Bajo mínimo",
            value: products.filter((p) => p.stockActual <= p.stockMinimo).length.toString(),
            caption: "Necesitan reposición",
            icon: TrendingDown,
            iconClassName: "bg-amber-50 text-amber-500"
          },
          {
            label: "Total inventario",
            value: products.length.toString(),
            caption: "Registrados en el sistema",
            icon: Layers,
            iconClassName: "bg-indigo-50 text-indigo-500"
          }
        ]}
      />

      {isAdmin && (
        <section className="mt-6 rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Nuevo producto</p>
            <h2 className="text-xl font-semibold text-slate-900">Registrar producto y existencias</h2>
            <p className="text-sm text-slate-500">
              Completa la ficha con la información que verán los vendedores en tienda y ruta.
            </p>
          </div>
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase text-slate-400">Datos generales</p>
              <div className="mt-3 grid gap-4 md:grid-cols-4">
                <div className="md:col-span-2">
                  <label className="text-xs uppercase text-slate-500">Nombre comercial</label>
                  <Input
                    placeholder="Ej. Nevera Samsung 11ft"
                    value={form.nombre}
                    onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-500">Tipo</label>
                  <select
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-800"
                    value={form.tipoId}
                    onChange={(e) => setForm((prev) => ({ ...prev, tipoId: e.target.value }))}
                  >
                    <option value="">Selecciona tipo</option>
                    {productTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-500">Marca</label>
                  <select
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-800"
                    value={form.marcaId}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, marcaId: e.target.value, modeloId: "", modeloNombre: "" }))
                    }
                  >
                    <option value="">Selecciona marca</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-500">Modelo</label>
                  <select
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-800"
                    value={form.modeloId}
                    onChange={(e) => setForm((prev) => ({ ...prev, modeloId: e.target.value }))}
                    disabled={!form.marcaId}
                  >
                    <option value="">Selecciona modelo</option>
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.nombre}
                      </option>
                    ))}
                  </select>
                  <Input
                    className="mt-2"
                    placeholder="Nuevo modelo (si no aparece)"
                    value={form.modeloNombre}
                    onChange={(e) => setForm((prev) => ({ ...prev, modeloNombre: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="text-xs uppercase text-slate-500">Descripción</label>
                  <textarea
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-100"
                    rows={3}
                    placeholder="Detalles relevantes, color, tipo de cliente, etc."
                    value={form.descripcion}
                    onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">Precios y cantidades</p>
              <div className="mt-3 grid gap-4 md:grid-cols-4">
                <div>
                  <label className="text-xs uppercase text-slate-500">Precio tienda</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ej. 12500"
                    value={form.precioTienda}
                    onChange={(e) => setForm((prev) => ({ ...prev, precioTienda: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-500">Precio ruta</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ej. 12900"
                    value={form.precioRuta}
                    onChange={(e) => setForm((prev) => ({ ...prev, precioRuta: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-500">Stock actual</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Unidades disponibles"
                    value={form.stockActual}
                    onChange={(e) => setForm((prev) => ({ ...prev, stockActual: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-500">Stock mínimo</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Ej. 5"
                    value={form.stockMinimo}
                    onChange={(e) => setForm((prev) => ({ ...prev, stockMinimo: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">Disponibilidad y suplidor</p>
              <div className="mt-3 grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-xs uppercase text-slate-500">Suplidor</label>
                  <select
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-800"
                    value={form.suplidorId}
                    onChange={(e) => setForm((prev) => ({ ...prev, suplidorId: e.target.value }))}
                  >
                    <option value="">Selecciona un suplidor</option>
                    {suppliers.filter((supplier) => supplier.activo).map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.nombreEmpresa}
                      </option>
                    ))}
                  </select>
                  {suppliers.filter((supplier) => supplier.activo).length === 0 && (
                    <p className="mt-1 text-xs text-amber-600">No hay suplidores activos disponibles.</p>
                  )}
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-500">Estado</label>
                  <select
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-800"
                    value={form.disponible}
                    onChange={(e) => setForm((prev) => ({ ...prev, disponible: e.target.value as typeof prev.disponible }))}
                  >
                    <option value="disponible">Disponible para vender</option>
                    <option value="no-disponible">No disponible / apartado</option>
                  </select>
                </div>
                {form.disponible === "no-disponible" && (
                  <div>
                    <label className="text-xs uppercase text-slate-500">Motivo</label>
                    <Input
                      placeholder="Ej. En reparación, apartado..."
                      value={form.motivoNoDisponible}
                      onChange={(e) => setForm((prev) => ({ ...prev, motivoNoDisponible: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          <Button onClick={handleSubmit} className="mt-6" variant="accent">
            Guardar producto
          </Button>
        </section>
      )}

      <ManagementSection
        title="Inventario registrado"
        description={
          isAdmin
            ? "Consulta el catálogo actual y verifica su disponibilidad para tienda y ruta."
            : "Listado disponible para tus salidas. Solicita al administrador cualquier ajuste."
        }
        headers={headers}
        rows={rows}
        loading={loading}
      />
    </AdminLayout>
  );
}
