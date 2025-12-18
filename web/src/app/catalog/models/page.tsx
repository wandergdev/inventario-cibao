"use client";

import { useCallback, useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import ManagementSection from "@/components/dashboard/ManagementSection";
import { useAuth } from "@/context/AuthContext";
import useRequireAuth from "@/hooks/useRequireAuth";
import { Brand, Model, ProductType } from "@/types";
import { createModel, deleteModel, fetchBrands, fetchModels, fetchProductTypes, updateModel } from "@/lib/api";

const initialForm = {
  id: null as string | null,
  brandId: "",
  typeId: "",
  nombre: "",
  descripcion: ""
};

export default function ModelsPage() {
  const { token, role } = useAuth();
  const { hydrated } = useRequireAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [filterBrand, setFilterBrand] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);

  const loadBrands = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchBrands(token);
      setBrands(data);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }, [token]);

  const loadTypes = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchProductTypes(token);
      setProductTypes(data);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }, [token]);

  const loadModels = useCallback(
    async (filters?: { brandId?: string; typeId?: string }) => {
      if (!token) return;
      setLoading(true);
      try {
        const data = await fetchModels(token, filters);
        setModels(data);
      } catch (error) {
        setMessage((error as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (token) {
      void loadBrands();
      void loadTypes();
    }
  }, [token, loadBrands, loadTypes]);

  useEffect(() => {
    if (token) {
      void loadModels({
        brandId: filterBrand || undefined,
        typeId: filterType || undefined
      });
    }
  }, [token, filterBrand, filterType, loadModels]);

  const handleSubmit = async () => {
    if (!token) return;
    if (!form.brandId) {
      setMessage("Selecciona la marca del modelo");
      return;
    }
    if (!form.typeId) {
      setMessage("Selecciona el tipo de producto");
      return;
    }
    if (!form.nombre.trim()) {
      setMessage("El nombre es obligatorio");
      return;
    }

    try {
      if (form.id) {
        await updateModel(token, form.id, {
          brandId: form.brandId,
          typeId: form.typeId,
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || null
        });
        setMessage("Modelo actualizado");
      } else {
        await createModel(token, {
          brandId: form.brandId,
          typeId: form.typeId,
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || undefined
        });
        setMessage("Modelo creado");
      }
      setForm(initialForm);
      await loadModels({
        brandId: filterBrand || undefined,
        typeId: filterType || undefined
      });
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const handleEdit = (model: Model) => {
    setForm({
      id: model.id,
      brandId: model.brandId,
      typeId: model.typeId,
      nombre: model.nombre,
      descripcion: model.descripcion ?? ""
    });
  };

  const handleDelete = async (model: Model) => {
    if (!token) return;
    if (typeof window !== "undefined" && !window.confirm(`¿Eliminar el modelo "${model.nombre}"?`)) {
      return;
    }
    try {
      await deleteModel(token, model.id);
      setMessage("Modelo eliminado");
      if (form.id === model.id) {
        setForm(initialForm);
      }
      await loadModels({
        brandId: filterBrand || undefined,
        typeId: filterType || undefined
      });
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  if (!hydrated) {
    return null;
  }

  if (role !== "Administrador") {
    return (
      <AdminLayout active="Modelos">
        <p className="text-sm text-slate-500">Solo los administradores pueden gestionar los catálogos.</p>
      </AdminLayout>
    );
  }

  const rows = models.map((model) => [
    model.typeName ?? productTypes.find((type) => type.id === model.typeId)?.nombre ?? "Sin tipo",
    model.brandName ?? brands.find((brand) => brand.id === model.brandId)?.nombre ?? "Sin marca",
    model.nombre,
    model.descripcion ?? "—",
    (
      <div key={model.id} className="flex gap-2">
        <Button variant="subtle" className="px-3 py-1" onClick={() => handleEdit(model)}>
          Editar
        </Button>
        <Button
          variant="subtle"
          className="px-3 py-1 text-rose-600"
          onClick={() => handleDelete(model)}
        >
          Eliminar
        </Button>
      </div>
    )
  ]);

  return (
    <AdminLayout active="Modelos">
      {message && <p className="mb-4 text-sm text-slate-500">{message}</p>}
      <section className="mb-8 rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Catálogo</p>
        <h2 className="text-xl font-semibold text-slate-900">Modelos por marca</h2>
        <p className="text-sm text-slate-500">Relaciona cada modelo con su marca para facilitar la selección en salidas.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-slate-500">Tipo</label>
            <select
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-800"
              value={form.typeId}
              onChange={(e) => setForm((prev) => ({ ...prev, typeId: e.target.value }))}
            >
              <option value="">Selecciona tipo</option>
              {productTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-slate-500">Marca</label>
            <select
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-800"
              value={form.brandId}
              onChange={(e) => setForm((prev) => ({ ...prev, brandId: e.target.value }))}
            >
              <option value="">Selecciona marca</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-slate-500">Modelo</label>
            <Input
              value={form.nombre}
              onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
              placeholder="Ej. Smart TV 55'' UHD"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-slate-500">Descripción</label>
            <textarea
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-100"
              rows={2}
              value={form.descripcion}
              onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Detalle opcional"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <Button onClick={handleSubmit} variant="accent">
            {form.id ? "Actualizar" : "Guardar"}
          </Button>
          {form.id && (
            <Button onClick={() => setForm(initialForm)} variant="subtle" className="border border-slate-200">
              Cancelar
            </Button>
          )}
        </div>
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase text-slate-500">Filtrar por tipo</label>
          <select
            className="mt-1 w-60 rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-800"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            {productTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase text-slate-500">Filtrar por marca</label>
          <select
            className="mt-1 w-60 rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-800"
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
          >
            <option value="">Todas las marcas</option>
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
            Limpiar filtro
          </Button>
        )}
      </div>

      <ManagementSection
        title="Modelos registrados"
        description="Define qué opciones aparecen al registrar un producto o salida."
        headers={["Tipo", "Marca", "Modelo", "Descripción", "Acciones"]}
        rows={rows}
        loading={loading}
      />
    </AdminLayout>
  );
}
