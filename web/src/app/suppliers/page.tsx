"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import ManagementSection from "@/components/dashboard/ManagementSection";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import StatsGrid from "@/components/dashboard/StatsGrid";
import { useAuth } from "@/context/AuthContext";
import useRequireAuth from "@/hooks/useRequireAuth";
import { Supplier } from "@/types";
import { createSupplier, fetchSuppliers, updateSupplier } from "@/lib/api";
import { Building2, Edit2, PhoneCall, Scale, UserCheck, X } from "lucide-react";

const initialForm = {
  nombreEmpresa: "",
  direccion: "",
  telefono: "",
  contactoVendedor: "",
  diasCredito: "",
  activo: "true" as "true" | "false"
};

export default function SuppliersPage() {
  const { token, role } = useAuth();
  const { hydrated } = useRequireAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState<string | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editForm, setEditForm] = useState(initialForm);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const isAdmin = role === "Administrador";

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setSuppliers(await fetchSuppliers(token));
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

  const averageCredit = useMemo(() => {
    const credits = suppliers
      .map((s) => s.diasCredito ?? 0)
      .filter((value) => value > 0);
    if (!credits.length) return 0;
    return Math.round(
      credits.reduce((sum, days) => sum + days, 0) / credits.length
    );
  }, [suppliers]);
  const withoutContact = suppliers.filter((s) => !s.contactoVendedor).length;

  const openCreateModal = () => {
    setForm(initialForm);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setForm(initialForm);
  };

  const handleSubmit = async () => {
    if (!token || !isAdmin) return;
    if (!form.nombreEmpresa.trim()) {
      return setMessage("Ingresa el nombre de la empresa");
    }
    try {
      await createSupplier(token, {
        nombreEmpresa: form.nombreEmpresa.trim(),
        direccion: form.direccion.trim() || undefined,
        telefono: form.telefono.trim() || undefined,
        contactoVendedor: form.contactoVendedor.trim() || undefined,
        diasCredito: form.diasCredito ? Number(form.diasCredito) : undefined,
        activo: form.activo === "true"
      });
      setMessage("Suplidor registrado");
      closeCreateModal();
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const startEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setEditForm({
      nombreEmpresa: supplier.nombreEmpresa,
      direccion: supplier.direccion ?? "",
      telefono: supplier.telefono ?? "",
      contactoVendedor: supplier.contactoVendedor ?? "",
      diasCredito: supplier.diasCredito ? String(supplier.diasCredito) : "",
      activo: supplier.activo ? "true" : "false"
    });
  };

  const cancelEdit = () => {
    setEditingSupplier(null);
  };

  const handleEditSubmit = async () => {
    if (!token || !editingSupplier) return;
    if (!editForm.nombreEmpresa.trim()) {
      return setMessage("Ingresa el nombre de la empresa");
    }
    try {
      await updateSupplier(token, editingSupplier.id, {
        nombreEmpresa: editForm.nombreEmpresa.trim(),
        direccion: editForm.direccion.trim() || undefined,
        telefono: editForm.telefono.trim() || undefined,
        contactoVendedor: editForm.contactoVendedor.trim() || undefined,
        diasCredito: editForm.diasCredito ? Number(editForm.diasCredito) : undefined,
        activo: editForm.activo === "true"
      });
      setMessage("Cambios guardados");
      setEditingSupplier(null);
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const headers = isAdmin
    ? ["Empresa", "Contacto", "Teléfono", "Crédito", "Estado", ""]
    : ["Empresa", "Contacto", "Teléfono", "Crédito", "Estado"];
  const rows = suppliers.map((supplier) => {
    const cells: Array<string | React.ReactNode> = [
      supplier.nombreEmpresa,
      supplier.contactoVendedor ?? "Sin contacto",
      supplier.telefono ?? "—",
      supplier.diasCredito ? `${supplier.diasCredito} días` : "Sin definir",
      supplier.activo ? "Activo" : "Inactivo"
    ];

    if (isAdmin) {
      cells.push(
        <button
          type="button"
          onClick={() => startEdit(supplier)}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <Edit2 size={12} />
          Editar
        </button>
      );
    }

    return cells;
  });

  if (!hydrated) {
    return null;
  }

  if (!isAdmin) {
    return (
      <AdminLayout active="Suplidores">
        <p className="text-sm text-slate-500">Solo los administradores pueden consultar y gestionar los suplidores.</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout active="Suplidores">
      {message && <p className="text-sm text-slate-500">{message}</p>}
      <StatsGrid
        className="mt-6 gap-6"
        itemClassName="p-5"
        stats={[
          {
            label: "Suplidores activos",
            value: suppliers.filter((s) => s.activo).length.toString(),
            caption: "Disponibles para compras",
            icon: UserCheck,
          },
          {
            label: "Sin contacto",
            value: withoutContact.toString(),
            caption: "Agrega responsable",
            icon: PhoneCall,
            iconClassName: "bg-amber-50 text-amber-600",
          },
          {
            label: "Crédito promedio",
            value: `${averageCredit} días`,
            caption: "Basado en convenios",
            icon: Scale,
            iconClassName: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Total de empresas",
            value: suppliers.length.toString(),
            caption: "Activos e inactivos",
            icon: Building2,
            iconClassName: "bg-indigo-50 text-indigo-500",
          },
        ]}
      />

      {isAdmin && (
        <div className="mt-10 mb-4 flex justify-end">
          <Button variant="accent" onClick={openCreateModal}>
            Registrar suplidor
          </Button>
        </div>
      )}

      {isAdmin && showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Nuevo suplidor</p>
                <h2 className="text-xl font-semibold text-slate-900">Registra una empresa aliada</h2>
                <p className="text-sm text-slate-500">
                  Comparte los datos de contacto y crédito para vincular compras y pedidos.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:text-slate-700"
                onClick={closeCreateModal}
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-4 space-y-5">
              <div>
                <p className="text-xs uppercase text-slate-400">Datos de la empresa</p>
                <div className="mt-2 grid gap-3 lg:grid-cols-3">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="new-supplier-name" className="text-xs uppercase text-slate-500">
                      Nombre de la empresa <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="new-supplier-name"
                      placeholder="Nombre empresa"
                      value={form.nombreEmpresa}
                      onChange={(e) => setForm((prev) => ({ ...prev, nombreEmpresa: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="new-supplier-address" className="text-xs uppercase text-slate-500">
                      Dirección
                    </label>
                    <Input
                      id="new-supplier-address"
                      placeholder="Dirección"
                      value={form.direccion}
                      onChange={(e) => setForm((prev) => ({ ...prev, direccion: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="new-supplier-phone" className="text-xs uppercase text-slate-500">
                      Teléfono
                    </label>
                    <Input
                      id="new-supplier-phone"
                      placeholder="Teléfono"
                      value={form.telefono}
                      onChange={(e) => setForm((prev) => ({ ...prev, telefono: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Contacto y condiciones</p>
                <div className="mt-2 grid gap-3 lg:grid-cols-3">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="new-supplier-contact" className="text-xs uppercase text-slate-500">
                      Contacto
                    </label>
                    <Input
                      id="new-supplier-contact"
                      placeholder="Nombre del contacto en el suplidor"
                      value={form.contactoVendedor}
                      onChange={(e) => setForm((prev) => ({ ...prev, contactoVendedor: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="new-supplier-credit" className="text-xs uppercase text-slate-500">
                      Días de crédito
                    </label>
                    <Input
                      id="new-supplier-credit"
                      type="number"
                      min="0"
                      placeholder="Días de crédito"
                      value={form.diasCredito}
                      onChange={(e) => setForm((prev) => ({ ...prev, diasCredito: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="new-supplier-status" className="text-xs uppercase text-slate-500">
                      Estado
                    </label>
                    <select
                      id="new-supplier-status"
                      className="mt-1 rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-800"
                      value={form.activo}
                      onChange={(e) => setForm((prev) => ({ ...prev, activo: e.target.value as "true" | "false" }))}
                    >
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="subtle" className="border border-slate-200" onClick={closeCreateModal}>
                Cancelar
              </Button>
              <Button variant="accent" onClick={handleSubmit}>
                Guardar suplidor
              </Button>
            </div>
          </div>
        </div>
      )}

      {editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Editar suplidor</p>
                <h2 className="text-xl font-semibold text-slate-900">{editingSupplier.nombreEmpresa}</h2>
              </div>
              <button
                className="text-sm text-slate-500 hover:text-slate-700"
                type="button"
                onClick={cancelEdit}
              >
                Cerrar
              </button>
            </div>
            <div className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-company-name" className="text-xs uppercase text-slate-500">
                    Nombre de la empresa <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="edit-company-name"
                    placeholder="Nombre empresa"
                    value={editForm.nombreEmpresa}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, nombreEmpresa: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-company-address" className="text-xs uppercase text-slate-500">
                    Dirección
                  </label>
                  <Input
                    id="edit-company-address"
                    placeholder="Dirección"
                    value={editForm.direccion}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, direccion: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-company-phone" className="text-xs uppercase text-slate-500">
                    Teléfono
                  </label>
                  <Input
                    id="edit-company-phone"
                    placeholder="Teléfono"
                    value={editForm.telefono}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, telefono: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-company-contact" className="text-xs uppercase text-slate-500">
                    Contacto
                  </label>
                  <Input
                    id="edit-company-contact"
                    placeholder="Nombre del contacto en el suplidor"
                    value={editForm.contactoVendedor}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, contactoVendedor: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-company-credit" className="text-xs uppercase text-slate-500">
                    Días de crédito
                  </label>
                  <Input
                    id="edit-company-credit"
                    type="number"
                    min="0"
                    placeholder="Días de crédito"
                    value={editForm.diasCredito}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, diasCredito: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-company-status" className="text-xs uppercase text-slate-500">
                    Estado
                  </label>
                  <select
                    id="edit-company-status"
                    className="mt-1 rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-800"
                    value={editForm.activo}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, activo: e.target.value as "true" | "false" }))}
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between gap-4">
              <Button type="button" variant="subtle" className="border border-slate-200 text-slate-600" onClick={cancelEdit}>
                Cancelar
              </Button>
              <Button onClick={handleEditSubmit} variant="accent">
                Guardar cambios
              </Button>
            </div>
          </div>
        </div>
      )}
      <ManagementSection
        title="Directorio de suplidores"
        description={
          isAdmin
            ? "Registra nuevas empresas para que el equipo pueda vincular compras y pedidos."
            : "Consulta los datos disponibles para tus pedidos o coordina actualizaciones con un administrador."
        }
        headers={headers}
        rows={rows}
        loading={loading}
      />
    </AdminLayout>
  );
}
