"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import useRequireAuth from "@/hooks/useRequireAuth";
import { useAuth } from "@/context/AuthContext";

export default function ReportsPage() {
  const { hydrated } = useRequireAuth();
  const { role } = useAuth();

  if (!hydrated) {
    return null;
  }

  if (role !== "Administrador") {
    return (
      <AdminLayout active="Reportes">
        <div className="rounded-3xl bg-white p-8 text-sm text-slate-500 shadow-sm">
          No tienes permisos para visualizar los reportes.
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout active="Reportes">
      <div className="space-y-4 rounded-3xl bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Reportes</h2>
        <p className="text-sm text-slate-500">
          Muy pronto podrás descargar reportes financieros, operativos y de inventario directamente desde esta sección.
        </p>
      </div>
    </AdminLayout>
  );
}
