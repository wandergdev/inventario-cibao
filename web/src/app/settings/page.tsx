"use client";

import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import useRequireAuth from "@/hooks/useRequireAuth";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { updateOwnPassword } from "@/lib/api";
import { Eye, EyeOff } from "lucide-react";

export default function SettingsPage() {
  const { hydrated } = useRequireAuth();
  const { userName, role, token } = useAuth();
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<
    "info" | "error" | "success" | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!hydrated) {
    return null;
  }

  const handleSubmit = async () => {
    if (!token) return;
    if (!form.newPassword || !form.confirmPassword) {
      setMessage("Completa ambos campos.");
      setMessageVariant("error");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setMessage("La nueva contraseña no coincide.");
      setMessageVariant("error");
      return;
    }
    setSaving(true);
    try {
      await updateOwnPassword(token, {
        newPassword: form.newPassword,
      });
      setMessage("Contraseña actualizada correctamente.");
      setMessageVariant("success");
      setForm({ newPassword: "", confirmPassword: "" });
    } catch (error) {
      setMessage((error as Error).message);
      setMessageVariant("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout active="Configuración">
      <div className="space-y-6 rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Perfil
          </p>
          <p className="text-sm text-slate-500">
            {userName ?? "Usuario"} · Rol: {role ?? "Sin rol"}
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-100 bg-white/90 p-6">
          <h3 className="text-lg font-semibold text-slate-900">
            Actualiza tu contraseña
          </h3>
          <p className="text-sm text-slate-500">
            Si recibiste una contraseña temporal, cámbiala por una que
            recuerdes.
          </p>
          {message && (
            <p
              className={`text-sm ${
                messageVariant === "error"
                  ? "text-rose-500"
                  : messageVariant === "success"
                  ? "text-emerald-600"
                  : "text-slate-500"
              }`}
            >
              {message}
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase text-slate-500">
                Nueva contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={form.newPassword}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  onClick={() => setShowNew((prev) => !prev)}
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs uppercase text-slate-500">
                Confirmar contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  onClick={() => setShowConfirm((prev) => !prev)}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>

        {role === "Administrador" && (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6">
            <p className="text-sm text-slate-500">
              Pronto agregaremos ajustes avanzados (logo, unidades de negocio,
              flujos de aprobación) para administradores.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
