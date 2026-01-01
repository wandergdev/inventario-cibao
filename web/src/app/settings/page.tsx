"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import useRequireAuth from "@/hooks/useRequireAuth";
import { useAuth } from "@/context/AuthContext";

export default function SettingsPage() {
  const { hydrated } = useRequireAuth();
  const { role } = useAuth();

  if (!hydrated) {
    return null;
  }

  if (role !== "Administrador") {
    return (
      <AdminLayout active="Configuración">
        <div className="rounded-3xl bg-white p-8 text-sm text-slate-500 shadow-sm">
          No tienes permisos para modificar la configuración general.
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout active="Configuración">
      <div className="space-y-4 rounded-3xl bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Configuración</h2>
        <p className="text-sm text-slate-500">
          Próximamente podrás ajustar catálogos, parámetros de inventario y políticas del sistema desde este panel.
        </p>
      </div>
    </AdminLayout>
  );
}
