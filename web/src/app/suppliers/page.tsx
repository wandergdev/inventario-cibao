"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import ManagementSection from "@/components/dashboard/ManagementSection";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import useRequireAuth from "@/hooks/useRequireAuth";
import { Supplier } from "@/types";
import { createSupplier, fetchSuppliers } from "@/lib/api";

export default function SuppliersPage() {
  const { token } = useAuth();
  const { hydrated } = useRequireAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nombreEmpresa: "", contactoVendedor: "", telefono: "" });
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      setSuppliers(await fetchSuppliers(token));
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      void load();
    }
  }, [token]);

  const handleSubmit = async () => {
    if (!token) return;
    if (!form.nombreEmpresa) {
      return setMessage("Ingresa el nombre de la empresa");
    }
    try {
      await createSupplier(token, form);
      setForm({ nombreEmpresa: "", contactoVendedor: "", telefono: "" });
      setMessage("Suplidor registrado");
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  if (!hydrated) {
    return null;
  }

  return (
    <AppShell title="Gestión de Suplidores">
      {message && <p className="text-sm text-slate-500">{message}</p>}
      <ManagementSection
        title="Suplidores"
        description="Registra empresas y contactos para vincular compras."
        headers={["Empresa", "Contacto", "Teléfono", "Estado"]}
        form={
          <div className="grid gap-3 lg:grid-cols-3">
            <Input
              placeholder="Nombre empresa"
              value={form.nombreEmpresa}
              onChange={(e) => setForm((prev) => ({ ...prev, nombreEmpresa: e.target.value }))}
            />
            <Input
              placeholder="Contacto"
              value={form.contactoVendedor}
              onChange={(e) => setForm((prev) => ({ ...prev, contactoVendedor: e.target.value }))}
            />
            <Input
              placeholder="Teléfono"
              value={form.telefono}
              onChange={(e) => setForm((prev) => ({ ...prev, telefono: e.target.value }))}
            />
            <Button onClick={handleSubmit} className="lg:col-span-3">
              Guardar suplidor
            </Button>
          </div>
        }
        rows={suppliers.map((s) => [
          s.nombreEmpresa,
          s.contactoVendedor ?? "-",
          s.telefono ?? "-",
          s.activo ? "Activo" : "Inactivo"
        ])}
        loading={loading}
      />
    </AppShell>
  );
}
