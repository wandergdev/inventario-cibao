"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import useRequireAuth from "@/hooks/useRequireAuth";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import SearchableSelect from "@/components/ui/SearchableSelect";
import Alert from "@/components/ui/Alert";
import {
  fetchPricingSettings,
  updatePricingSettings,
  fetchPricingOverrides,
  updatePricingOverride,
  deletePricingOverride,
  fetchProducts,
  fetchPricingTypeOverrides,
  updatePricingTypeOverride,
  deletePricingTypeOverride,
  fetchProductTypes
} from "@/lib/api";
import type {
  PricingSettings,
  Product,
  ProductPricingOverride,
  ProductTypePricingOverride,
  ProductType
} from "@/types";

const formatPercent = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return `${value.toFixed(2)}%`;
};

export default function PricingSettingsPage() {
  const { hydrated } = useRequireAuth();
  const { token, role } = useAuth();
  const [settings, setSettings] = useState<PricingSettings | null>(null);
  const [generalForm, setGeneralForm] = useState({ tienda: "", ruta: "" });
  const [generalSaving, setGeneralSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<"info" | "success" | "error">("info");
  const [overrides, setOverrides] = useState<ProductPricingOverride[]>([]);
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [typeOverrides, setTypeOverrides] = useState<ProductTypePricingOverride[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [overrideForm, setOverrideForm] = useState({ tienda: "", ruta: "" });
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideSearch, setOverrideSearch] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [typeForm, setTypeForm] = useState({ tienda: "", ruta: "" });
  const [typeSaving, setTypeSaving] = useState(false);

  const showAlert = (text: string | null, variant: "info" | "success" | "error" = "info") => {
    setMessage(text);
    if (text) {
      setMessageVariant(variant);
    }
  };

  const loadSettings = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchPricingSettings(token);
      setSettings(data);
      setGeneralForm({
        tienda: data.porcentajeTienda.toString(),
        ruta: data.porcentajeRuta.toString()
      });
    } catch (error) {
      showAlert((error as Error).message, "error");
    }
  }, [token]);

  const loadOverrides = useCallback(
    async (searchTerm = "") => {
      if (!token) return;
      setOverrideLoading(true);
      try {
        const data = await fetchPricingOverrides(token, searchTerm);
        setOverrides(data);
      } catch (error) {
        showAlert((error as Error).message, "error");
      } finally {
        setOverrideLoading(false);
      }
    },
    [token]
  );

  const loadProducts = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchProducts(token);
      setProducts(data);
    } catch (error) {
      showAlert((error as Error).message, "error");
    }
  }, [token]);

  const loadProductTypes = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchProductTypes(token);
      setProductTypes(data);
    } catch (error) {
      showAlert((error as Error).message, "error");
    }
  }, [token]);

  const loadTypeOverrides = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchPricingTypeOverrides(token);
      setTypeOverrides(data);
    } catch (error) {
      showAlert((error as Error).message, "error");
    }
  }, [token]);

  useEffect(() => {
    if (hydrated && token && role === "Administrador") {
      void loadSettings();
      void loadOverrides();
      void loadProducts();
      void loadProductTypes();
      void loadTypeOverrides();
    }
  }, [hydrated, token, role, loadSettings, loadOverrides, loadProducts, loadProductTypes, loadTypeOverrides]);

  useEffect(() => {
    if (!selectedProductId) {
      setOverrideForm({ tienda: "", ruta: "" });
      return;
    }
    const override = overrides.find((item) => item.productoId === selectedProductId);
    if (override) {
      setOverrideForm({
        tienda: override.porcentajeTienda?.toString() ?? "",
        ruta: override.porcentajeRuta?.toString() ?? ""
      });
    } else {
      setOverrideForm({ tienda: "", ruta: "" });
    }
  }, [selectedProductId, overrides]);

  const productOptions = useMemo(
    () =>
      products.map((product) => {
        const details = [product.marcaNombre, product.modeloNombre].filter(Boolean).join(" • ");
        const label = details ? `${product.nombre} • ${details}` : product.nombre;
        return { value: product.id, label };
      }),
    [products]
  );

  const typeOptions = useMemo(
    () => productTypes.map((type) => ({ value: type.id, label: type.nombre })),
    [productTypes]
  );

  useEffect(() => {
    if (!selectedTypeId) {
      setTypeForm({ tienda: "", ruta: "" });
      return;
    }
    const override = typeOverrides.find((item) => item.tipoId === selectedTypeId);
    if (override) {
      setTypeForm({
        tienda: override.porcentajeTienda?.toString() ?? "",
        ruta: override.porcentajeRuta?.toString() ?? ""
      });
    } else {
      setTypeForm({ tienda: "", ruta: "" });
    }
  }, [selectedTypeId, typeOverrides]);

  const handleGeneralSubmit = async () => {
    if (!token) return;
    const parseValue = (value: string) => Number.parseFloat(value.replace(",", "."));
    const tiendaPercent = parseValue(generalForm.tienda);
    const rutaPercent = parseValue(generalForm.ruta);
    if (!Number.isFinite(tiendaPercent) || tiendaPercent < 0 || !Number.isFinite(rutaPercent) || rutaPercent < 0) {
      return showAlert("Ingresa porcentajes válidos (0 o mayores).", "error");
    }
    setGeneralSaving(true);
    showAlert(null);
    try {
      const updated = await updatePricingSettings(token, { tiendaPercent, rutaPercent });
      setSettings(updated);
      showAlert("Porcentajes generales actualizados.", "success");
    } catch (error) {
      showAlert((error as Error).message, "error");
    } finally {
      setGeneralSaving(false);
    }
  };

  const handleOverrideSubmit = async () => {
    if (!token || !selectedProductId) return;
    const parseValue = (value: string) => Number.parseFloat(value.replace(",", "."));
    const tiendaPercent = parseValue(overrideForm.tienda);
    const rutaPercent = parseValue(overrideForm.ruta);
    if (!Number.isFinite(tiendaPercent) || tiendaPercent < 0 || !Number.isFinite(rutaPercent) || rutaPercent < 0) {
      return showAlert("Define porcentajes válidos para el producto.", "error");
    }
    setOverrideSaving(true);
    showAlert(null);
    try {
      await updatePricingOverride(token, selectedProductId, { tiendaPercent, rutaPercent });
      await loadOverrides(overrideSearch);
      showAlert("Porcentaje personalizado actualizado.", "success");
    } catch (error) {
      showAlert((error as Error).message, "error");
    } finally {
      setOverrideSaving(false);
    }
  };

  const handleOverrideDelete = async () => {
    if (!token || !selectedProductId) return;
    setOverrideSaving(true);
    showAlert(null);
    try {
      await deletePricingOverride(token, selectedProductId);
      setOverrideForm({ tienda: "", ruta: "" });
      await loadOverrides(overrideSearch);
      showAlert("Porcentaje personalizado eliminado. El producto volverá a usar el porcentaje general.", "success");
    } catch (error) {
      showAlert((error as Error).message, "error");
    } finally {
      setOverrideSaving(false);
    }
  };

  const overrideExists = overrides.some((override) => override.productoId === selectedProductId);

  const handleTypeSubmit = async () => {
    if (!token || !selectedTypeId) return;
    const parseValue = (value: string) => Number.parseFloat(value.replace(",", "."));
    const tiendaPercent = parseValue(typeForm.tienda);
    const rutaPercent = parseValue(typeForm.ruta);
    if (!Number.isFinite(tiendaPercent) || tiendaPercent < 0 || !Number.isFinite(rutaPercent) || rutaPercent < 0) {
      return showAlert("Define porcentajes válidos para el tipo de producto.", "error");
    }
    setTypeSaving(true);
    showAlert(null);
    try {
      await updatePricingTypeOverride(token, selectedTypeId, { tiendaPercent, rutaPercent });
      await loadTypeOverrides();
      showAlert("Porcentaje por tipo actualizado.", "success");
    } catch (error) {
      showAlert((error as Error).message, "error");
    } finally {
      setTypeSaving(false);
    }
  };

  const handleTypeDelete = async () => {
    if (!token || !selectedTypeId) return;
    setTypeSaving(true);
    showAlert(null);
    try {
      await deletePricingTypeOverride(token, selectedTypeId);
      setTypeForm({ tienda: "", ruta: "" });
      await loadTypeOverrides();
      showAlert("Porcentaje por tipo eliminado. Los productos usarán el porcentaje general o su ajuste individual.", "success");
    } catch (error) {
      showAlert((error as Error).message, "error");
    } finally {
      setTypeSaving(false);
    }
  };

  const typeOverrideExists = typeOverrides.some((override) => override.tipoId === selectedTypeId);

  if (!hydrated || role !== "Administrador") {
    return null;
  }

  return (
    <AdminLayout active="Porcentajes de precios">
      {message && (
        <div className="mb-4">
          <Alert variant={messageVariant} onDismiss={() => showAlert(null)}>
            {message}
          </Alert>
        </div>
      )}

      <section className="rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Porcentajes generales</h2>
          <p className="text-sm text-slate-500">
            Estos valores se aplican automáticamente a todos los productos que no tengan un porcentaje personalizado cuando se
            recibe un pedido con precio de costo.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase text-slate-500">Margen tienda (%)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={generalForm.tienda}
              onChange={(event) => setGeneralForm((prev) => ({ ...prev, tienda: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs uppercase text-slate-500">Margen ruta (%)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={generalForm.ruta}
              onChange={(event) => setGeneralForm((prev) => ({ ...prev, ruta: event.target.value }))}
            />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
          <span>
            Última actualización:{" "}
            {settings?.actualizadoEn ? new Date(settings.actualizadoEn).toLocaleString("es-DO") : "sin definir"}
          </span>
          <Button variant="accent" onClick={handleGeneralSubmit} disabled={generalSaving}>
            {generalSaving ? "Guardando..." : "Guardar porcentajes"}
          </Button>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Porcentajes por categoría</h2>
          <p className="text-sm text-slate-500">
            Aplica un margen específico a todos los productos de un tipo (por ejemplo, todos los aires acondicionados). Si alguno de
            esos productos tiene un ajuste individual, se respetará su configuración particular.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs uppercase text-slate-500">Tipo de producto</label>
            <SearchableSelect
              value={selectedTypeId}
              onChange={(value) => setSelectedTypeId(value)}
              options={[{ value: "", label: "Selecciona un tipo" }, ...typeOptions]}
              placeholder="Selecciona tipo"
              searchPlaceholder="Buscar tipo"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-slate-500">Margen tienda (%)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={typeForm.tienda}
              onChange={(event) => setTypeForm((prev) => ({ ...prev, tienda: event.target.value }))}
              disabled={!selectedTypeId}
            />
          </div>
          <div>
            <label className="text-xs uppercase text-slate-500">Margen ruta (%)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={typeForm.ruta}
              onChange={(event) => setTypeForm((prev) => ({ ...prev, ruta: event.target.value }))}
              disabled={!selectedTypeId}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="accent" onClick={handleTypeSubmit} disabled={!selectedTypeId || typeSaving}>
            {typeSaving ? "Guardando..." : "Guardar porcentaje"}
          </Button>
          {typeOverrideExists && (
            <Button variant="subtle" className="border border-slate-200" onClick={handleTypeDelete} disabled={typeSaving}>
              Quitar porcentaje por tipo
            </Button>
          )}
        </div>
        <div className="mt-6 overflow-auto">
          {typeOverrides.length === 0 ? (
            <p className="text-sm text-slate-500">No hay tipos de producto con porcentajes personalizados.</p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-2">Tipo</th>
                  <th className="px-4 py-2">Margen tienda</th>
                  <th className="px-4 py-2">Margen ruta</th>
                  <th className="px-4 py-2">Actualizado</th>
                </tr>
              </thead>
              <tbody>
                {typeOverrides.map((override) => (
                  <tr key={override.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-800">{override.tipo}</td>
                    <td className="px-4 py-2 text-slate-600">{formatPercent(override.porcentajeTienda)}</td>
                    <td className="px-4 py-2 text-slate-600">{formatPercent(override.porcentajeRuta)}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {new Date(override.actualizadoEn).toLocaleString("es-DO")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Porcentajes por producto</h2>
          <p className="text-sm text-slate-500">
            Usa esta sección para asignar un margen específico a un producto en particular. Si eliminas el ajuste, volverá a
            utilizar el porcentaje general.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs uppercase text-slate-500">Producto</label>
            <SearchableSelect
              value={selectedProductId}
              onChange={(value) => setSelectedProductId(value)}
              options={[{ value: "", label: "Selecciona producto" }, ...productOptions]}
              placeholder="Selecciona producto"
              searchPlaceholder="Buscar producto"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-slate-500">Margen tienda (%)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={overrideForm.tienda}
              onChange={(event) => setOverrideForm((prev) => ({ ...prev, tienda: event.target.value }))}
              disabled={!selectedProductId}
            />
          </div>
          <div>
            <label className="text-xs uppercase text-slate-500">Margen ruta (%)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={overrideForm.ruta}
              onChange={(event) => setOverrideForm((prev) => ({ ...prev, ruta: event.target.value }))}
              disabled={!selectedProductId}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="accent" onClick={handleOverrideSubmit} disabled={!selectedProductId || overrideSaving}>
            {overrideSaving ? "Guardando..." : "Guardar porcentaje"}
          </Button>
          {overrideExists && (
            <Button variant="subtle" className="border border-slate-200" onClick={handleOverrideDelete} disabled={overrideSaving}>
              Quitar porcentaje personalizado
            </Button>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Productos con porcentaje personalizado</h3>
            <p className="text-sm text-slate-500">
              Actualmente {overrides.length} producto{overrides.length === 1 ? "" : "s"} tiene ajustes especiales.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Buscar por nombre"
              value={overrideSearch}
              onChange={(event) => setOverrideSearch(event.target.value)}
            />
            <Button variant="subtle" onClick={() => void loadOverrides(overrideSearch)}>
              Buscar
            </Button>
          </div>
        </div>
        <div className="mt-4 overflow-auto">
          {overrideLoading ? (
            <p className="text-sm text-slate-500">Cargando porcentajes personalizados...</p>
          ) : overrides.length === 0 ? (
            <p className="text-sm text-slate-500">No hay productos con porcentaje personalizado.</p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-2">Producto</th>
                  <th className="px-4 py-2">Margen tienda</th>
                  <th className="px-4 py-2">Margen ruta</th>
                  <th className="px-4 py-2">Actualizado</th>
                </tr>
              </thead>
              <tbody>
                {overrides.map((override) => (
                  <tr key={override.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-800">{override.producto}</td>
                    <td className="px-4 py-2 text-slate-600">{formatPercent(override.porcentajeTienda)}</td>
                    <td className="px-4 py-2 text-slate-600">{formatPercent(override.porcentajeRuta)}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {new Date(override.actualizadoEn).toLocaleString("es-DO")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </AdminLayout>
  );
}
