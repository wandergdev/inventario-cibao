"use client";

import { useCallback, useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import ManagementSection from "@/components/dashboard/ManagementSection";
import { useAuth } from "@/context/AuthContext";
import useRequireAuth from "@/hooks/useRequireAuth";
import { ProductType } from "@/types";
import {
  createProductType,
  deleteProductType,
  fetchProductTypes,
  updateProductType,
} from "@/lib/api";

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

  const rows = types.map((type) => [
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

  return (
    <AdminLayout active="Tipos de producto">
      {message && <p className="mb-4 text-sm text-slate-500">{message}</p>}
      <section className="mb-8 rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
          Catálogo
        </p>
        <h2 className="text-xl font-semibold text-slate-900">
          Tipos de producto
        </h2>
        <p className="text-sm text-slate-500">
          Registra nuevas categorías o actualiza las existentes.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-slate-500">Nombre</label>
            <Input
              value={form.nombre}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, nombre: e.target.value }))
              }
              placeholder="Ej. Televisor"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-slate-500">
              Descripción
            </label>
            <textarea
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-100"
              rows={2}
              value={form.descripcion}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, descripcion: e.target.value }))
              }
              placeholder="Detalle opcional"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <Button onClick={handleSubmit} variant="accent">
            {form.id ? "Actualizar" : "Guardar"}
          </Button>
          {form.id && (
            <Button
              onClick={() => setForm(initialForm)}
              variant="subtle"
              className="border border-slate-200"
            >
              Cancelar
            </Button>
          )}
        </div>
      </section>

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
