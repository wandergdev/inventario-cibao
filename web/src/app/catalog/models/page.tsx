"use client";

import { useCallback, useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import SearchableSelect from "@/components/ui/SearchableSelect";
import ManagementSection from "@/components/dashboard/ManagementSection";
import StatsGrid from "@/components/dashboard/StatsGrid";
import { useAuth } from "@/context/AuthContext";
import useRequireAuth from "@/hooks/useRequireAuth";
import { Brand, Model, ProductType } from "@/types";
import { createModel, deleteModel, fetchBrands, fetchModels, fetchProductTypes, updateModel } from "@/lib/api";
import { PackageSearch, Factory, Tag, Filter, X } from "lucide-react";

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
  const [showFormModal, setShowFormModal] = useState(false);
  const isEditing = Boolean(form.id);

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

  const openCreateModal = () => {
    setForm(initialForm);
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setForm(initialForm);
  };

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
      closeFormModal();
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
    setShowFormModal(true);
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

  const filteredCount = models.length;
  const totalBrands = brands.length;
  const totalTypes = productTypes.length;
  const activeFilters = Number(Boolean(filterBrand)) + Number(Boolean(filterType));

  return (
    <AdminLayout active="Modelos">
      {message && <p className="mb-4 text-sm text-slate-500">{message}</p>}
      <StatsGrid
        className="mt-6 gap-6"
        itemClassName="p-5"
        stats={[
          {
            label: "Modelos listados",
            value: filteredCount.toString(),
            caption: filterBrand || filterType ? "Según filtros aplicados" : "Total registrados",
            icon: PackageSearch,
            iconClassName: "bg-indigo-50 text-indigo-500",
          },
          {
            label: "Marcas registradas",
            value: totalBrands.toString(),
            caption: "Disponibles para asociar",
            icon: Factory,
            iconClassName: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Tipos disponibles",
            value: totalTypes.toString(),
            caption: "Categorías activas",
            icon: Tag,
            iconClassName: "bg-slate-100 text-slate-600",
          },
          {
            label: "Filtros activos",
            value: activeFilters.toString(),
            caption: activeFilters ? "Personaliza la vista" : "Sin filtros",
            icon: Filter,
            iconClassName: "bg-amber-50 text-amber-600",
          },
        ]}
      />

      <div className="mt-10 mb-4 flex justify-end">
        <Button variant="accent" onClick={openCreateModal}>
          Nuevo modelo
        </Button>
      </div>

      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                  {isEditing ? "Editar modelo" : "Nuevo modelo"}
                </p>
                <h2 className="text-xl font-semibold text-slate-900">Catálogo de modelos</h2>
                <p className="text-sm text-slate-500">Relaciona cada modelo con su marca y tipo.</p>
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
            <div className="mt-4 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="model-type" className="text-xs uppercase text-slate-500">
                    Tipo
                  </label>
                  <SearchableSelect
                    className="mt-1"
                    value={form.typeId}
                    onChange={(next) => setForm((prev) => ({ ...prev, typeId: next }))}
                    options={[
                      { value: "", label: "Selecciona tipo" },
                      ...productTypes.map((type) => ({ value: type.id, label: type.nombre }))
                    ]}
                    placeholder="Selecciona tipo"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="model-brand" className="text-xs uppercase text-slate-500">
                    Marca
                  </label>
                  <SearchableSelect
                    className="mt-1"
                    value={form.brandId}
                    onChange={(next) => setForm((prev) => ({ ...prev, brandId: next }))}
                    options={[
                      { value: "", label: "Selecciona marca" },
                      ...brands.map((brand) => ({ value: brand.id, label: brand.nombre }))
                    ]}
                    placeholder="Selecciona marca"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="model-name" className="text-xs uppercase text-slate-500">
                    Modelo
                  </label>
                  <Input
                    id="model-name"
                    value={form.nombre}
                    onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Ej. Smart TV 55'' UHD"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="model-description" className="text-xs uppercase text-slate-500">
                    Descripción
                  </label>
                  <textarea
                    id="model-description"
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-100"
                    rows={3}
                    value={form.descripcion}
                    onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                    placeholder="Detalle opcional"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="subtle" className="border border-slate-200" onClick={closeFormModal}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} variant="accent">
                {isEditing ? "Actualizar" : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase text-slate-500">Filtrar por tipo</label>
          <SearchableSelect
            className="mt-1 w-60"
            value={filterType}
            onChange={(next) => setFilterType(next)}
            options={[
              { value: "", label: "Todos los tipos" },
              ...productTypes.map((type) => ({ value: type.id, label: type.nombre }))
            ]}
            placeholder="Todos los tipos"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase text-slate-500">Filtrar por marca</label>
          <SearchableSelect
            className="mt-1 w-60"
            value={filterBrand}
            onChange={(next) => setFilterBrand(next)}
            options={[
              { value: "", label: "Todas las marcas" },
              ...brands.map((brand) => ({ value: brand.id, label: brand.nombre }))
            ]}
            placeholder="Todas las marcas"
          />
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
