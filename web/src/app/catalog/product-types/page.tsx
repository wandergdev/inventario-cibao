"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import ManagementSection from "@/components/dashboard/ManagementSection";
import StatsGrid from "@/components/dashboard/StatsGrid";
import { useAuth } from "@/context/AuthContext";
import useRequireAuth from "@/hooks/useRequireAuth";
import { ProductType } from "@/types";
import {
  createProductType,
  deleteProductType,
  fetchProductTypes,
  updateProductType,
} from "@/lib/api";
import { Layers, FileText, Tag, X } from "lucide-react";

const initialForm = {
  id: null as string | null,
  nombre: "",
  descripcion: "",
};

export default function ProductTypesPage() {
  const { token, role } = useAuth();
  const { hydrated } = useRequireAuth();
  const [types, setTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [showFormModal, setShowFormModal] = useState(false);
  const isEditing = Boolean(form.id);

  const loadTypes = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchProductTypes(token);
      setTypes(data);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadTypes();
    }
  }, [token, loadTypes]);

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
      setMessage("El nombre es obligatorio");
      return;
    }

    try {
      if (form.id) {
        await updateProductType(token, form.id, {
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || null,
        });
        setMessage("Tipo actualizado");
      } else {
        await createProductType(token, {
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || undefined,
        });
        setMessage("Tipo creado");
      }
      setForm(initialForm);
      await loadTypes();
      closeFormModal();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const handleEdit = (type: ProductType) => {
    setForm({
      id: type.id,
      nombre: type.nombre,
      descripcion: type.descripcion ?? "",
    });
    setShowFormModal(true);
  };

  const handleDelete = async (type: ProductType) => {
    if (!token) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `¿Eliminar "${type.nombre}"? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    try {
      await deleteProductType(token, type.id);
      setMessage("Tipo eliminado");
      if (form.id === type.id) {
        setForm(initialForm);
      }
      await loadTypes();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const filteredTypes = useMemo(
    () =>
      types.filter((type) =>
        type.nombre.toLowerCase().includes(search.trim().toLowerCase())
      ),
    [types, search]
  );

  if (!hydrated) {
    return null;
  }

  if (role !== "Administrador") {
    return (
      <AdminLayout active="Tipos de producto">
        <p className="text-sm text-slate-500">
          Solo los administradores pueden gestionar los catálogos.
        </p>
      </AdminLayout>
    );
  }

  const rows = filteredTypes.map((type) => [
    type.nombre,
    type.descripcion ?? "—",
    <div key={type.id} className="flex gap-2">
      <Button
        variant="subtle"
        className="px-3 py-1"
        onClick={() => handleEdit(type)}
      >
        Editar
      </Button>
      <Button
        variant="subtle"
        className="px-3 py-1 text-rose-600"
        onClick={() => handleDelete(type)}
      >
        Eliminar
      </Button>
    </div>,
  ]);

  const totalTypes = types.length;
  const typesWithDescription = types.filter(
    (type) => (type.descripcion ?? "").trim().length > 0
  ).length;
  const filteredCount = filteredTypes.length;

  return (
    <AdminLayout active="Tipos de producto">
      {message && <p className="mb-4 text-sm text-slate-500">{message}</p>}
      <StatsGrid
        className="mt-6 gap-6"
        itemClassName="p-5"
        stats={[
          {
            label: "Tipos registrados",
            value: totalTypes.toString(),
            caption: "Disponibles para productos",
            icon: Layers,
            iconClassName: "bg-indigo-50 text-indigo-500",
          },
          {
            label: "Con descripción",
            value: typesWithDescription.toString(),
            caption: "Documentados para ventas",
            icon: FileText,
            iconClassName: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Coincidencias",
            value: filteredCount.toString(),
            caption: "Según tu búsqueda",
            icon: Tag,
            iconClassName: "bg-slate-100 text-slate-600",
          },
        ]}
      />

      <div className="mt-10 mb-4 flex justify-end">
        <Button variant="accent" onClick={openCreateModal}>
          Nuevo tipo
        </Button>
      </div>

      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                  {isEditing ? "Editar tipo" : "Nuevo tipo"}
                </p>
                <h2 className="text-xl font-semibold text-slate-900">
                  Clasifica tus productos
                </h2>
                <p className="text-sm text-slate-500">
                  Mantén ordenado el catálogo para facilitar los registros.
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
            <div className="mt-4 space-y-4">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="type-name"
                  className="text-xs uppercase text-slate-500"
                >
                  Nombre
                </label>
                <Input
                  id="type-name"
                  value={form.nombre}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, nombre: e.target.value }))
                  }
                  placeholder="Ej. Televisor"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="type-description"
                  className="text-xs uppercase text-slate-500"
                >
                  Descripción
                </label>
                <textarea
                  id="type-description"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      descripcion: e.target.value,
                    }))
                  }
                  placeholder="Detalle opcional"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="subtle"
                className="border border-slate-200"
                onClick={closeFormModal}
              >
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
        <label className="text-xs uppercase text-slate-500">
          Filtrar por nombre
        </label>
        <Input
          placeholder="Buscar tipo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <ManagementSection
        title="Tipos registrados"
        description="Listado disponible para asignar a nuevos productos."
        headers={["Nombre", "Descripción", "Acciones"]}
        rows={rows}
        loading={loading}
      />
    </AdminLayout>
  );
}
