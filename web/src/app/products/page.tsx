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
import { createProduct, updateProduct, fetchProducts, fetchSuppliers, fetchProductTypes, fetchBrands, fetchModels } from "@/lib/api";
import { Boxes, Layers, PackageOpen, TrendingDown, X } from "lucide-react";

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
const [showFormModal, setShowFormModal] = useState(false);
const [editingProductId, setEditingProductId] = useState<string | null>(null);
const [detailProduct, setDetailProduct] = useState<Product | null>(null);
const [detailAvailabilityNote, setDetailAvailabilityNote] = useState("");
const [filterType, setFilterType] = useState("");
const [filterBrand, setFilterBrand] = useState("");
  const isAdmin = role === "Administrador";
  const isEditing = Boolean(editingProductId);

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
  if (!token || !form.marcaId || !form.tipoId) {
    setModels([]);
    return;
  }
  const loadModelsForBrand = async () => {
    try {
      const data = await fetchModels(token, { brandId: form.marcaId, typeId: form.tipoId });
      setModels(data);
    } catch (error) {
      setMessage((error as Error).message);
    }
  };
  void loadModelsForBrand();
}, [token, form.marcaId, form.tipoId]);

useEffect(() => {
  if (detailProduct) {
    setDetailAvailabilityNote(detailProduct.motivoNoDisponible ?? "");
  } else {
    setDetailAvailabilityNote("");
  }
}, [detailProduct]);

const resetFormState = () => {
  setForm(initialFormState);
  setEditingProductId(null);
};

const openCreateModal = () => {
  resetFormState();
  setShowFormModal(true);
};

const openEditModal = (product: Product) => {
  setEditingProductId(product.id);
  setForm({
    nombre: product.nombre,
    descripcion: product.descripcion ?? "",
    tipoId: product.tipoId ?? "",
    marcaId: product.marcaId ?? "",
    modeloId: product.modeloId ?? "",
    modeloNombre: "",
    precioTienda: product.precioTienda?.toString() ?? "",
    precioRuta: product.precioRuta?.toString() ?? "",
    stockActual: product.stockActual?.toString() ?? "",
    stockMinimo: product.stockMinimo?.toString() ?? "",
    suplidorId: product.suplidorId ?? "",
    disponible: product.disponible ? "disponible" : "no-disponible",
    motivoNoDisponible: product.motivoNoDisponible ?? ""
  });
  setShowFormModal(true);
};

const closeFormModal = () => {
  setShowFormModal(false);
  resetFormState();
};

const openDetailModal = (product: Product) => {
  setDetailProduct(product);
};

const closeDetailModal = () => {
  setDetailProduct(null);
};

  const formatCurrency = useMemo(() => {
    const formatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (value: number) => `RD$ ${formatter.format(value)}`;
  }, []);

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

    const payload = {
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
    };

    try {
      if (editingProductId) {
        await updateProduct(token, editingProductId, payload);
        setMessage("Producto actualizado correctamente");
      } else {
        await createProduct(token, payload);
        setMessage("Producto registrado correctamente");
      }
      resetFormState();
      setShowFormModal(false);
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const handleToggleAvailability = async (available: boolean) => {
    if (!token || !detailProduct) return;
    if (!available && !detailAvailabilityNote.trim()) {
      setMessage("Agrega el motivo de indisponibilidad antes de desactivar el producto.");
      return;
    }

    try {
      const updated = await updateProduct(token, detailProduct.id, {
        disponible: available,
        motivoNoDisponible: available ? null : detailAvailabilityNote.trim()
      });
      setDetailProduct(updated);
      setMessage(available ? "Producto reactivado" : "Producto marcado como no disponible");
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const headers = [
    "Producto",
    "Tipo",
    "Marca / Modelo",
    "Stock",
    "Precio tienda",
    "Precio ruta",
    "Disponibilidad",
    "Acciones"
  ];
  const displayedProducts = useMemo(
    () =>
      products.filter((product) => {
        if (filterType && product.tipoId !== filterType) {
          return false;
        }
        if (filterBrand && product.marcaId !== filterBrand) {
          return false;
        }
        return true;
      }),
    [products, filterType, filterBrand]
  );

  const rows = displayedProducts.map((product) => [
    product.nombre,
    product.tipoNombre ?? "—",
    product.marcaNombre ? `${product.marcaNombre}${product.modeloNombre ? ` • ${product.modeloNombre}` : ""}` : "—",
    `${product.stockActual} (mín. ${product.stockMinimo})`,
    formatCurrency(product.precioTienda),
    formatCurrency(product.precioRuta),
    product.disponible ? "Disponible" : product.motivoNoDisponible ?? "No disponible",
    <div key={product.id} className="flex gap-2">
      <Button variant="subtle" className="px-3 py-1" onClick={() => openDetailModal(product)}>
        Detalles
      </Button>
      {!hydrated ? null : isAdmin && (
        <Button variant="subtle" className="px-3 py-1" onClick={() => openEditModal(product)}>
          Editar
        </Button>
      )}

      {detailProduct && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Detalle del producto</p>
                <h2 className="text-xl font-semibold text-slate-900">{detailProduct.nombre}</h2>
                <p className="text-sm text-slate-500">
                  {detailProduct.disponible ? "Disponible para venta" : detailProduct.motivoNoDisponible ?? "No disponible"}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:text-slate-700"
                onClick={closeDetailModal}
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-slate-400">Tipo</p>
                <p className="text-sm font-semibold text-slate-900">{detailProduct.tipoNombre ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Marca / Modelo</p>
                <p className="text-sm font-semibold text-slate-900">
                  {detailProduct.marcaNombre ?? "—"}
                  {detailProduct.modeloNombre ? ` • ${detailProduct.modeloNombre}` : ""}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Suplidor</p>
                <p className="text-sm text-slate-900">{detailProduct.suplidor ?? "Sin suplidor"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Stock</p>
                <p className="text-sm text-slate-900">
                  {detailProduct.stockActual} unidades (mínimo {detailProduct.stockMinimo})
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Precio tienda</p>
                <p className="text-sm text-slate-900">{formatCurrency(detailProduct.precioTienda)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Precio ruta</p>
                <p className="text-sm text-slate-900">{formatCurrency(detailProduct.precioRuta)}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs uppercase text-slate-400">Descripción</p>
                <p className="text-sm text-slate-900">{detailProduct.descripcion ?? "Sin descripción"}</p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <div>
              <label className="text-xs uppercase text-slate-400">Motivo / Nota</label>
              {isAdmin ? (
                <textarea
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  rows={2}
                  value={detailAvailabilityNote}
                  onChange={(e) => setDetailAvailabilityNote(e.target.value)}
                  placeholder="Ej. sin stock, reservado, en reparación..."
                />
              ) : (
                <p className="text-sm text-slate-900">{detailProduct.motivoNoDisponible ?? "—"}</p>
              )}
              {isAdmin && detailProduct.disponible && !detailAvailabilityNote.trim() && (
                <p className="mt-1 text-xs text-rose-500">Escribe un motivo antes de marcarlo como no disponible.</p>
              )}
            </div>
            {isAdmin && (
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <Button
                  variant="subtle"
                  className="border border-slate-200"
                  onClick={() => {
                    closeDetailModal();
                    openEditModal(detailProduct);
                  }}
                  type="button"
                >
                  Editar producto
                </Button>
                <div className="flex gap-3">
                  {detailProduct.disponible ? (
                    <Button
                      variant="subtle"
                      className="border border-amber-200 text-amber-600"
                      onClick={() => handleToggleAvailability(false)}
                      disabled={!detailAvailabilityNote.trim()}
                      type="button"
                    >
                      Marcar como no disponible
                    </Button>
                  ) : (
                    <Button variant="accent" onClick={() => handleToggleAvailability(true)} type="button">
                      Reactivar
                    </Button>
                  )}
                </div>
              </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  ]);

  if (!hydrated) {
    return null;
  }

  const formFields = (
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
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  tipoId: e.target.value,
                  marcaId: "",
                  modeloId: "",
                  modeloNombre: ""
                }))
              }
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
              disabled={!form.tipoId}
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
              disabled={!form.marcaId || !form.tipoId}
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
  );

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
        <div className="mt-10 mb-4 flex justify-end">
          <Button variant="accent" onClick={openCreateModal}>
            Nuevo producto
          </Button>
        </div>
      )}

      {isAdmin && showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-5xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Nuevo producto</p>
                <h2 className="text-xl font-semibold text-slate-900">
                  {isEditing ? "Editar producto" : "Registrar producto y existencias"}
                </h2>
                <p className="text-sm text-slate-500">
                  Completa la ficha con la información que verán los vendedores en tienda y ruta.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:text-slate-700"
                onClick={closeFormModal}
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-4 max-h-[70vh] space-y-6 overflow-y-auto pr-2">{formFields}</div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="subtle" className="border border-slate-200" onClick={closeFormModal}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} variant="accent">
                {isEditing ? "Actualizar" : "Guardar producto"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-3xl border border-slate-100 bg-white/80 p-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase text-slate-400">Filtrar por tipo</label>
          <select
            className="w-48 rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-800"
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setFilterBrand("");
            }}
          >
            <option value="">Todos</option>
            {productTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase text-slate-400">Filtrar por marca</label>
          <select
            className="w-48 rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-800"
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
            disabled={!brands.length}
          >
            <option value="">Todas</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.nombre}
              </option>
            ))}
          </select>
        </div>
        {(filterBrand || filterType) && (
          <Button
            variant="subtle"
            className="border border-slate-200"
            onClick={() => {
              setFilterBrand("");
              setFilterType("");
            }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

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
