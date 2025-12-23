"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import ManagementSection from "@/components/dashboard/ManagementSection";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import SearchableSelect from "@/components/ui/SearchableSelect";
import StatsGrid from "@/components/dashboard/StatsGrid";
import { useAuth } from "@/context/AuthContext";
import useRequireAuth from "@/hooks/useRequireAuth";
import { Product, Supplier, ProductType, Brand, Model } from "@/types";
import { createProduct, updateProduct, fetchProducts, fetchSuppliers, fetchProductTypes, fetchBrands, fetchModels } from "@/lib/api";
import { Layers, PackageOpen, TrendingDown, X } from "lucide-react";

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
  stockNoDisponible: "",
  stockMinimo: "",
  suplidorId: "",
  disponible: "disponible" as "disponible" | "no-disponible"
};

export default function ProductsPage() {
  const { token, role } = useAuth();
  const { hydrated } = useRequireAuth();
const [products, setProducts] = useState<Product[]>([]);
const [suppliers, setSuppliers] = useState<Supplier[]>([]);
const [productTypes, setProductTypes] = useState<ProductType[]>([]);
const [brands, setBrands] = useState<Brand[]>([]);
const [models, setModels] = useState<Model[]>([]);
const [modelNames, setModelNames] = useState<Record<string, string>>({});
const [loading, setLoading] = useState(false);
const [message, setMessage] = useState<string | null>(null);
const [form, setForm] = useState(initialFormState);
const [showFormModal, setShowFormModal] = useState(false);
const [editingProductId, setEditingProductId] = useState<string | null>(null);
const [detailProduct, setDetailProduct] = useState<Product | null>(null);
const [filterType, setFilterType] = useState("");
const [filterBrand, setFilterBrand] = useState("");
const [filterSearch, setFilterSearch] = useState("");
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

  const loadModelNames = useCallback(async () => {
    if (!token) return;
    try {
      const catalog = await fetchModels(token);
      setModelNames(
        catalog.reduce((acc, model) => {
          acc[model.id] = model.nombre;
          return acc;
        }, {} as Record<string, string>)
      );
    } catch (error) {
      setMessage((error as Error).message);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void load();
    }
  }, [token, load]);

  useEffect(() => {
    if (token) {
      void loadModelNames();
    }
  }, [token, loadModelNames]);

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

const resolveModelName = useCallback(
  (item: { modeloId?: string | null; modeloNombre?: string | null }) => {
    if (item.modeloId && modelNames[item.modeloId]) {
      return modelNames[item.modeloId];
    }
    return item.modeloNombre ?? "";
  },
  [modelNames]
);

const getAvailableUnits = (item: { stockActual: number; stockNoDisponible?: number | null }) =>
  Math.max(item.stockActual - (item.stockNoDisponible ?? 0), 0);

const getUnavailableUnits = (item: { stockActual: number; stockNoDisponible?: number | null }) =>
  Math.max(Math.min(item.stockNoDisponible ?? 0, item.stockActual), 0);

const activeSuppliers = useMemo(() => suppliers.filter((supplier) => supplier.activo), [suppliers]);

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
    stockNoDisponible: product.stockNoDisponible?.toString() ?? "",
    stockMinimo: product.stockMinimo?.toString() ?? "",
    suplidorId: product.suplidorId ?? "",
    disponible: product.disponible ? "disponible" : "no-disponible"
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
    const parsedStockActual = Number(form.stockActual || 0);
    const parsedStockUnavailable = Number(form.stockNoDisponible || 0);
    if (parsedStockUnavailable < 0) {
      return setMessage("Las unidades inactivas no pueden ser negativas");
    }
    if (parsedStockUnavailable > parsedStockActual) {
      return setMessage("Las unidades inactivas no pueden superar el stock actual");
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
      stockActual: parsedStockActual,
      stockNoDisponible: parsedStockUnavailable || 0,
      stockMinimo: Number(form.stockMinimo || 0),
      suplidorId: form.suplidorId || undefined,
      disponible: form.disponible === "disponible"
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
      await loadModelNames();
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
        if (filterSearch) {
          const normalized = filterSearch.trim().toLowerCase();
          if (!product.nombre.toLowerCase().includes(normalized)) {
            return false;
          }
        }
        if (filterType && product.tipoId !== filterType) {
          return false;
        }
        if (filterBrand && product.marcaId !== filterBrand) {
          return false;
        }
        return true;
      }),
    [products, filterType, filterBrand, filterSearch]
  );

  const rows = displayedProducts.map((product) => [
    product.nombre,
    product.tipoNombre ?? "—",
    (() => {
      const modelLabel = resolveModelName(product);
      return product.marcaNombre
        ? `${product.marcaNombre}${modelLabel ? ` • ${modelLabel}` : ""}`
        : modelLabel || "—";
    })(),
    `${product.stockActual} (mín. ${product.stockMinimo})`,
    formatCurrency(product.precioTienda),
    formatCurrency(product.precioRuta),
    (() => {
      const availableUnits = getAvailableUnits(product);
      const inactiveUnits = getUnavailableUnits(product);
      if (!product.disponible) {
        return `No disponible${inactiveUnits ? ` • Inactivas (${inactiveUnits})` : ""}`;
      }
      return `Disponibles (${availableUnits})${
        inactiveUnits ? ` • Inactivas (${inactiveUnits})` : ""
      }`;
    })(),
    <div key={product.id} className="flex gap-2">
      <Button variant="subtle" className="px-3 py-1" onClick={() => openDetailModal(product)}>
        Detalles
      </Button>
      {!hydrated ? null : isAdmin && (
        <Button variant="subtle" className="px-3 py-1" onClick={() => openEditModal(product)}>
          Editar
        </Button>
      )}

    </div>
  ]);

  const detailModal = detailProduct ? (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-4">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Detalle del producto</p>
            <h2 className="text-xl font-semibold text-slate-900">{detailProduct.nombre}</h2>
            <p className="text-sm text-slate-500">
              {detailProduct.disponible ? "Disponible para venta" : "Producto inactivo"}
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
              {(() => {
                const modelLabel = resolveModelName(detailProduct);
                return modelLabel ? ` • ${modelLabel}` : "";
              })()}
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
            <p className="text-xs text-slate-500">
              Disponibles: {getAvailableUnits(detailProduct)} • Inactivas: {getUnavailableUnits(detailProduct)}
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
        <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
          <p className="text-xs uppercase text-slate-400">Disponibilidad</p>
          <p className="text-sm text-slate-900">
            Disponibles: {getAvailableUnits(detailProduct)} • Inactivas: {getUnavailableUnits(detailProduct)}
          </p>
          <p className="text-xs text-slate-500">Ajusta las unidades inactivas desde la opción de editar producto.</p>
          {isAdmin && (
            <Button
              variant="subtle"
              className="mt-4 border border-slate-200"
              onClick={() => {
                closeDetailModal();
                openEditModal(detailProduct);
              }}
              type="button"
            >
              Editar producto
            </Button>
          )}
        </div>
      </div>
    </div>
  ) : null;

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
            <SearchableSelect
              className="mt-1"
              value={form.tipoId}
              onChange={(nextTipo) =>
                setForm((prev) => ({
                  ...prev,
                  tipoId: nextTipo,
                  marcaId: "",
                  modeloId: "",
                  modeloNombre: ""
                }))
              }
              options={[
                { value: "", label: "Selecciona tipo" },
                ...productTypes.map((type) => ({ value: type.id, label: type.nombre }))
              ]}
              placeholder="Selecciona tipo"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-slate-500">Marca</label>
            <SearchableSelect
              className="mt-1"
              value={form.marcaId}
              onChange={(nextMarca) =>
                setForm((prev) => ({ ...prev, marcaId: nextMarca, modeloId: "", modeloNombre: "" }))
              }
              options={[
                { value: "", label: "Selecciona marca" },
                ...brands.map((brand) => ({ value: brand.id, label: brand.nombre }))
              ]}
              placeholder="Selecciona marca"
              disabled={!form.tipoId}
            />
          </div>
          <div>
            <label className="text-xs uppercase text-slate-500">Modelo</label>
            <SearchableSelect
              className="mt-1"
              value={form.modeloId}
              onChange={(nextModelo) => setForm((prev) => ({ ...prev, modeloId: nextModelo }))}
              options={[
                { value: "", label: "Selecciona modelo" },
                ...models.map((model) => ({ value: model.id, label: model.nombre }))
              ]}
              placeholder="Selecciona modelo"
              disabled={!form.marcaId || !form.tipoId}
            />
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
        <div className="mt-3 grid gap-4 md:grid-cols-4">
          <div>
            <label className="text-xs uppercase text-slate-500">Suplidor</label>
            <SearchableSelect
              className="mt-1"
              value={form.suplidorId}
              onChange={(next) => setForm((prev) => ({ ...prev, suplidorId: next }))}
              options={[
                { value: "", label: "Selecciona un suplidor" },
                ...activeSuppliers.map((supplier) => ({
                  value: supplier.id,
                  label: supplier.nombreEmpresa
                }))
              ]}
              placeholder="Selecciona un suplidor"
            />
            {activeSuppliers.length === 0 && (
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
          <div>
            <label className="text-xs uppercase text-slate-500">Unidades inactivas</label>
            <Input
              type="number"
              min="0"
              max={form.stockActual ? Number(form.stockActual) : undefined}
              placeholder="Ej. 2"
              className="mt-1"
              value={form.stockNoDisponible}
              onChange={(e) => setForm((prev) => ({ ...prev, stockNoDisponible: e.target.value }))}
            />
            <p className="mt-1 text-xs text-slate-500">
              Disponibles estimadas:{" "}
              {Math.max(Number(form.stockActual || 0) - Number(form.stockNoDisponible || 0), 0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout active="Productos">
      {message && <p className="text-sm text-slate-500">{message}</p>}
      {detailModal}
      <StatsGrid
        stats={[
          {
            label: "Total inventario",
            value: products.length.toString(),
            caption: "Registrados en el sistema",
            icon: Layers,
            iconClassName: "bg-indigo-50 text-indigo-500"
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
          <label className="text-xs uppercase text-slate-400">Filtrar por nombre</label>
          <Input
            className="w-64"
            placeholder="Buscar producto..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase text-slate-400">Filtrar por tipo</label>
          <SearchableSelect
            value={filterType}
            onChange={(nextTipo) => {
              setFilterType(nextTipo);
              setFilterBrand("");
            }}
            options={[
              { value: "", label: "Todos" },
              ...productTypes.map((type) => ({ value: type.id, label: type.nombre }))
            ]}
            placeholder="Todos"
            className="w-48"
            searchPlaceholder="Buscar tipo"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase text-slate-400">Filtrar por marca</label>
          <SearchableSelect
            value={filterBrand}
            onChange={(nextBrand) => setFilterBrand(nextBrand)}
            options={[
              { value: "", label: "Todas" },
              ...brands.map((brand) => ({ value: brand.id, label: brand.nombre }))
            ]}
            placeholder="Todas"
            className="w-48"
            searchPlaceholder="Buscar marca"
            disabled={!brands.length}
          />
        </div>
        {(filterBrand || filterType || filterSearch) && (
          <Button
            variant="subtle"
            className="border border-slate-200"
            onClick={() => {
              setFilterBrand("");
              setFilterType("");
              setFilterSearch("");
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
