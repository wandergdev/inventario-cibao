"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import useRequireAuth from "@/hooks/useRequireAuth";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { downloadMovimientosReport, ReportScope } from "@/lib/api";
import Alert from "@/components/ui/Alert";

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function ReportsPage() {
  const { hydrated } = useRequireAuth();
  const { role, token } = useAuth();
  const tabOptions: Array<{ value: ReportScope; label: string; caption: string }> = [
    { value: "salidas", label: "Salidas", caption: "Ventas y entregas divididas por mes" },
    { value: "entradas", label: "Entradas", caption: "Reposiciones divididas por mes" }
  ];
  const [reportStart, setReportStart] = useState(() => {
    const firstDay = new Date();
    firstDay.setDate(1);
    return formatDateInput(firstDay);
  });
  const [reportEnd, setReportEnd] = useState(() => formatDateInput(new Date()));
  const [downloading, setDownloading] = useState(false);
  const [activeScope, setActiveScope] = useState<ReportScope>("salidas");
  const [feedback, setFeedback] = useState<{
    text: string;
    variant: "success" | "error";
    floating?: boolean;
  } | null>(null);
  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => {
      if (feedback.floating) {
        setFeedback(null);
      }
    }, 3000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    setFeedback(null);
  }, [activeScope, reportStart, reportEnd]);

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

  const handleDownload = async () => {
    if (!token) {
      setFeedback({ text: "Sesión inválida, inicia nuevamente.", variant: "error", floating: false });
      return;
    }
    if (!reportStart || !reportEnd) {
      setFeedback({ text: "Selecciona un rango de fechas válido.", variant: "error", floating: false });
      return;
    }
    if (new Date(reportStart) > new Date(reportEnd)) {
      setFeedback({ text: "La fecha inicial no puede ser mayor a la final.", variant: "error", floating: false });
      return;
    }

    setFeedback(null);
    setDownloading(true);
    try {
      const blob = await downloadMovimientosReport(token, reportStart, reportEnd, activeScope);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `reporte_${activeScope}_${reportStart}_${reportEnd}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setFeedback({ text: "Reporte generado correctamente.", variant: "success", floating: true });
    } catch (error) {
      const rawMsg = (error as Error).message;
      const cleaned = rawMsg.replace(/^\{?\"?message\"?:\s*\"?|\"?\}?$/gi, "");
      setFeedback({ text: cleaned, variant: "error", floating: false });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AdminLayout active="Reportes">
      <div className="space-y-6 rounded-3xl bg-white p-8 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Panel</p>
          <h2 className="mt-1 text-3xl font-semibold text-slate-900">Reportes de movimientos</h2>
          <p className="text-sm text-slate-500">
            Descarga reportes de salidas o entradas en Excel; cada archivo crea una hoja por cada mes dentro del rango seleccionado.
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2 rounded-full bg-slate-100 p-1">
            {tabOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setActiveScope(option.value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeScope === option.value
                    ? "bg-slate-900 text-white shadow-md"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-sm text-slate-500">
            {tabOptions.find((option) => option.value === activeScope)?.caption}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="text-xs uppercase text-slate-400">Desde</label>
            <Input type="date" value={reportStart} onChange={(e) => setReportStart(e.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase text-slate-400">Hasta</label>
            <Input type="date" value={reportEnd} onChange={(e) => setReportEnd(e.target.value)} />
          </div>
        </div>
        {feedback && (
          <Alert variant={feedback.variant} floating={feedback.floating ?? true} onDismiss={() => setFeedback(null)}>
            {feedback.text}
          </Alert>
        )}
        <div className="flex flex-col items-end gap-2">
          <p className="text-xs text-slate-500">El archivo incluirá pestañas por mes para {activeScope === "salidas" ? "las salidas" : "las entradas"}.</p>
          <Button onClick={handleDownload} disabled={downloading}>
            {downloading ? "Generando..." : `Descargar ${activeScope === "salidas" ? "reporte de salidas" : "reporte de entradas"}`}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
