"use client";

import { useCallback, useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import ManagementSection from "@/components/dashboard/ManagementSection";
import { useAuth } from "@/context/AuthContext";
import useRequireAuth from "@/hooks/useRequireAuth";
import { Brand } from "@/types";
import { createBrand, deleteBrand, fetchBrands, updateBrand } from "@/lib/api";

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
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const handleEdit = (brand: Brand) => {
    setForm({ id: brand.id, nombre: brand.nombre, descripcion: brand.descripcion ?? "" });
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

  const rows = brands.map((brand) => [
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

  return (
    <AdminLayout active="Marcas">
      {message && <p className="mb-4 text-sm text-slate-500">{message}</p>}
      <section className="mb-8 rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Catálogo</p>
        <h2 className="text-xl font-semibold text-slate-900">Marcas principales</h2>
        <p className="text-sm text-slate-500">Mantén el listado actualizado para clasificar los productos.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-slate-500">Nombre</label>
            <Input
              value={form.nombre}
              onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
              placeholder="Ej. Samsung"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-slate-500">Descripción</label>
            <textarea
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-100"
              rows={2}
              value={form.descripcion}
              onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Notas o líneas de productos"
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
