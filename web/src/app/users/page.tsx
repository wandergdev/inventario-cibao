"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import useRequireAuth from "@/hooks/useRequireAuth";
import { useAuth } from "@/context/AuthContext";

export default function UsersPage() {
  const { hydrated } = useRequireAuth();
  const { role } = useAuth();

  if (!hydrated) {
    return null;
  }

  if (role !== "Administrador") {
    return (
      <AdminLayout active="Usuarios">
        <div className="rounded-3xl bg-white p-8 text-sm text-slate-500 shadow-sm">
          Solo el administrador puede gestionar usuarios.
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout active="Usuarios">
      <div className="space-y-4 rounded-3xl bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Gestión de usuarios</h2>
        <p className="text-sm text-slate-500">
          Aquí agregaremos las herramientas para crear, editar y desactivar cuentas del sistema.
        </p>
      </div>
    </AdminLayout>
  );
}
