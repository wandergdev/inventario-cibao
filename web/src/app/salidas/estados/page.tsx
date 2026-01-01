"use client";

import { useCallback, useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import useRequireAuth from "@/hooks/useRequireAuth";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { X } from "lucide-react";
import { createSalidaStatus, deleteSalidaStatus, fetchSalidaStatuses, updateSalidaStatus } from "@/lib/api";
import { SalidaStatus } from "@/types";

const initialForm = {
  id: null as string | null,
  nombre: "",
  descripcion: "",
  activo: true
};

export default function SalidaStatusesPage() {
  const { token, role } = useAuth();
  const { hydrated } = useRequireAuth();
  const [statuses, setStatuses] = useState<SalidaStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [showFormModal, setShowFormModal] = useState(false);

  const loadStatuses = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchSalidaStatuses(token);
      setStatuses(data);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadStatuses();
    }
  }, [token, loadStatuses]);

  const handleSubmit = async () => {
    if (!token) return;
    if (!form.nombre.trim()) {
      setMessage("Ingresa el nombre del estado");
      return;
    }
    try {
      if (form.id) {
        await updateSalidaStatus(token, form.id, {
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || null,
          activo: form.activo
        });
        setMessage("Estado actualizado");
      } else {
        await createSalidaStatus(token, {
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || undefined,
          activo: form.activo
        });
        setMessage("Estado creado");
      }
      setForm(initialForm);
      setShowFormModal(false);
      await loadStatuses();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const handleEdit = (status: SalidaStatus) => {
    setForm({
      id: status.id,
      nombre: status.nombre,
      descripcion: status.descripcion ?? "",
      activo: status.activo
    });
    setShowFormModal(true);
  };

  const handleDelete = async (status: SalidaStatus) => {
    if (!token || !status.id) return;
    if (typeof window !== "undefined" && !window.confirm(`¿Eliminar el estado "${status.nombre}"?`)) {
      return;
    }
    try {
      await deleteSalidaStatus(token, status.id);
      setMessage("Estado eliminado");
      if (form.id === status.id) {
        setForm(initialForm);
      }
      await loadStatuses();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  if (!hydrated) {
    return null;
  }

  if (role !== "Administrador") {
    return (
      <AdminLayout active="Estados de salidas">
        <p className="text-sm text-slate-500">Solo los administradores pueden gestionar los estados de salidas.</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout active="Estados de salidas">
      {message && <p className="mb-4 text-sm text-slate-500">{message}</p>}
      <div className="rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Estados registrados</p>
            <h2 className="text-xl font-semibold text-slate-900">Catálogo de estados</h2>
          </div>
          <Button
            variant="accent"
            type="button"
            onClick={() => {
              setForm(initialForm);
              setShowFormModal(true);
            }}
          >
            Nuevo estado
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {loading && <p className="text-sm text-slate-500">Cargando estados...</p>}
          {!loading && !statuses.length && <p className="text-sm text-slate-500">Aún no has registrado estados.</p>}
          {!loading &&
            statuses.map((status) => (
              <div key={status.id} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{status.nombre}</p>
                  <p className="text-xs text-slate-500">{status.descripcion || "Sin descripción"}</p>
                  <p className="text-xs text-slate-500">{status.activo ? "Activo" : "Inactivo"}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="subtle" className="px-2 py-1 text-xs" onClick={() => handleEdit(status)}>
                    Editar
                  </Button>
                  <Button
                    variant="subtle"
                    className="px-2 py-1 text-xs text-rose-600"
                    onClick={() => handleDelete(status)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
        </div>
      </div>
      {showFormModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  {form.id ? "Editar estado" : "Nuevo estado"}
                </p>
                <h2 className="text-xl font-semibold text-slate-900">
                  {form.id ? "Actualizar estado de salida" : "Crear estado de salida"}
                </h2>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:text-slate-700"
                onClick={() => {
                  setForm(initialForm);
                  setShowFormModal(false);
                }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs uppercase text-slate-500">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <Input
                  className="mt-1"
                  value={form.nombre}
                  onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej. Pendiente de entrega"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-slate-500">Descripción</label>
                <textarea
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Detalle opcional"
                />
              </div>
              <label className="flex items-center gap-2 text-xs uppercase text-slate-500">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm((prev) => ({ ...prev, activo: e.target.checked }))}
                />
                Estado activo
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="subtle"
                className="border border-slate-200"
                type="button"
                onClick={() => {
                  setForm(initialForm);
                  setShowFormModal(false);
                }}
              >
                Cancelar
              </Button>
              <Button variant="accent" type="button" onClick={handleSubmit}>
                {form.id ? "Actualizar" : "Guardar estado"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
