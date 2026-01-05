"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import useRequireAuth from "@/hooks/useRequireAuth";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { downloadSalidasReport } from "@/lib/api";
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
  const [reportStart, setReportStart] = useState(() => {
    const firstDay = new Date();
    firstDay.setDate(1);
    return formatDateInput(firstDay);
  });
  const [reportEnd, setReportEnd] = useState(() => formatDateInput(new Date()));
  const [downloading, setDownloading] = useState(false);
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
      const blob = await downloadSalidasReport(token, reportStart, reportEnd);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `reporte_salidas_${reportStart}_${reportEnd}.xls`;
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
          <h2 className="mt-1 text-3xl font-semibold text-slate-900">Reportes de salidas</h2>
          <p className="text-sm text-slate-500">
            Descarga un archivo Excel con todas las salidas registradas en el rango seleccionado y el monto total.
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
        <div className="flex justify-end">
          <Button onClick={handleDownload} disabled={downloading}>
            {downloading ? "Generando..." : "Descargar Excel"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
