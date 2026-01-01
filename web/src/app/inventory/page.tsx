"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import useRequireAuth from "@/hooks/useRequireAuth";

export default function InventoryPage() {
  const { hydrated } = useRequireAuth();

  if (!hydrated) {
    return null;
  }

  return (
    <AdminLayout active="Inventario">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Inventario general</h2>
        <p className="mt-2 text-sm text-slate-500">
          Esta sección centralizará los indicadores y accesos rápidos del inventario. Próximamente agregaremos widgets y
          reportes operativos.
        </p>
      </div>
    </AdminLayout>
  );
}
