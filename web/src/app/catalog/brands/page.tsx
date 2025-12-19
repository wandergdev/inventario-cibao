"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import ManagementSection from "@/components/dashboard/ManagementSection";
import StatsGrid from "@/components/dashboard/StatsGrid";
import { useAuth } from "@/context/AuthContext";
import useRequireAuth from "@/hooks/useRequireAuth";
import { Brand } from "@/types";
import { createBrand, deleteBrand, fetchBrands, updateBrand } from "@/lib/api";
import { Tag, BookOpen, Building2, X } from "lucide-react";

const initialForm = {
  id: null as string | null,
  nombre: "",
  descripcion: ""
};

export default function BrandsPage() {
  const { token, role } = useAuth();
  const { hydrated } = useRequireAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [showFormModal, setShowFormModal] = useState(false);
  const isEditing = Boolean(form.id);

  const loadBrands = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchBrands(token);
      setBrands(data);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadBrands();
    }
  }, [token, loadBrands]);

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
    if (!form.nombre.trim()) {
      setMessage("La marca necesita un nombre");
      return;
    }

    try {
      if (form.id) {
        await updateBrand(token, form.id, {
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || null
        });
        setMessage("Marca actualizada");
      } else {
        await createBrand(token, {
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || undefined
        });
        setMessage("Marca creada");
      }
      setForm(initialForm);
      await loadBrands();
      closeFormModal();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const handleEdit = (brand: Brand) => {
    setForm({ id: brand.id, nombre: brand.nombre, descripcion: brand.descripcion ?? "" });
    setShowFormModal(true);
  };

  const handleDelete = async (brand: Brand) => {
    if (!token) return;
    if (typeof window !== "undefined" && !window.confirm(`¿Eliminar la marca "${brand.nombre}"?`)) {
      return;
    }
    try {
      await deleteBrand(token, brand.id);
      setMessage("Marca eliminada");
      if (form.id === brand.id) {
        setForm(initialForm);
      }
      await loadBrands();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const filteredBrands = useMemo(
    () =>
      brands.filter((brand) =>
        brand.nombre.toLowerCase().includes(search.trim().toLowerCase())
      ),
    [brands, search]
  );

  if (!hydrated) {
    return null;
  }

  if (role !== "Administrador") {
    return (
      <AdminLayout active="Marcas">
        <p className="text-sm text-slate-500">Solo los administradores pueden gestionar los catálogos.</p>
      </AdminLayout>
    );
  }

  const rows = filteredBrands.map((brand) => [
    brand.nombre,
    brand.descripcion ?? "—",
    (
      <div key={brand.id} className="flex gap-2">
        <Button variant="subtle" className="px-3 py-1" onClick={() => handleEdit(brand)}>
          Editar
        </Button>
        <Button
          variant="subtle"
          className="px-3 py-1 text-rose-600"
          onClick={() => handleDelete(brand)}
        >
          Eliminar
        </Button>
      </div>
    )
  ]);

  const totalBrands = brands.length;
  const brandsWithDescription = brands.filter(
    (brand) => (brand.descripcion ?? "").trim().length > 0
  ).length;
  const filteredCount = filteredBrands.length;

  return (
    <AdminLayout active="Marcas">
      {message && <p className="mb-4 text-sm text-slate-500">{message}</p>}
      <StatsGrid
        className="mt-6 gap-6"
        itemClassName="p-5"
        stats={[
          {
            label: "Marcas registradas",
            value: totalBrands.toString(),
            caption: "Disponibles en el catálogo",
            icon: Tag,
            iconClassName: "bg-indigo-50 text-indigo-500",
          },
          {
            label: "Con descripción",
            value: brandsWithDescription.toString(),
            caption: "Con notas o líneas de producto",
            icon: BookOpen,
            iconClassName: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Coincidencias",
            value: filteredCount.toString(),
            caption: "Según tu búsqueda",
            icon: Building2,
            iconClassName: "bg-slate-100 text-slate-600",
          },
        ]}
      />

      <div className="mt-10 mb-4 flex justify-end">
        <Button variant="accent" onClick={openCreateModal}>
          Nueva marca
        </Button>
      </div>

      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                  {isEditing ? "Editar marca" : "Nueva marca"}
                </p>
                <h2 className="text-xl font-semibold text-slate-900">Catálogo de marcas</h2>
                <p className="text-sm text-slate-500">Mantén actualizadas las referencias comerciales.</p>
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
            <div className="mt-4 space-y-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="brand-name" className="text-xs uppercase text-slate-500">
                  Nombre
                </label>
                <Input
                  id="brand-name"
                  value={form.nombre}
                  onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej. Samsung"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="brand-description" className="text-xs uppercase text-slate-500">
                  Descripción
                </label>
                <textarea
                  id="brand-description"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Notas o líneas de productos"
                />
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

      <div className="mb-4 flex flex-col gap-1">
        <label className="text-xs uppercase text-slate-500">Filtrar por nombre</label>
        <Input
          placeholder="Buscar marca..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <ManagementSection
        title="Marcas registradas"
        description="Se muestran en el formulario de productos y modelos."
        headers={["Marca", "Descripción", "Acciones"]}
        rows={rows}
        loading={loading}
      />
    </AdminLayout>
  );
}
