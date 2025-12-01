"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import StatsGrid from "@/components/dashboard/StatsGrid";
import useRequireAuth from "@/hooks/useRequireAuth";
import { useAuth } from "@/context/AuthContext";
import {
  AlertTriangle,
  DollarSign,
  PackageCheck,
  ShoppingBag,
  Truck,
  UsersRound
} from "lucide-react";

const stats = [
  { label: "Productos en stock", value: "1,234", caption: "Actualizado hoy", icon: PackageCheck },
  { label: "Ventas del mes", value: "RD$ 45,250", caption: "+12% vs mes anterior", icon: DollarSign },
  { label: "Alertas de stock", value: "23", caption: "Revisar pedidos", icon: AlertTriangle },
  { label: "Pedidos pendientes", value: "8", caption: "En espera de suplidor", icon: Truck }
];

const weeklySales = [12, 18, 10, 22, 14];

const alerts = [
  { type: "stock", text: "Stock bajo: Samsung Galaxy A15" },
  { type: "pedido", text: "Pedido por recibir: Hoy" },
  { type: "mov", text: "Producto sin movimiento: 30 días" }
];

const recentSales = [
  { ticket: "#V-0234", producto: "TV LED 55\"", vendedor: "Pedro Gómez", monto: "RD$ 28,500" },
  { ticket: "#V-0233", producto: "Estufa 4 hornillas", vendedor: "María López", monto: "RD$ 12,800" }
];

export default function DashboardPage() {
  const { hydrated } = useRequireAuth();
  const { role } = useAuth();

  if (!hydrated) return null;

  const isAdmin = role === "Administrador";

  return <AdminLayout active="Dashboard">{isAdmin ? <AdminDashboard /> : <VendorDashboard />}</AdminLayout>;
}

function AdminDashboard() {
  return (
    <div className="space-y-6">
      <StatsGrid stats={stats} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Ventas por semana">
          <div className="flex items-end justify-between gap-4">
            {weeklySales.map((value, index) => (
              <div key={index} className="flex w-full flex-col items-center gap-2">
                <div
                  className="w-full rounded-2xl bg-gradient-to-b from-sky-400 to-blue-600"
                  style={{ height: `${value * 6}px` }}
                />
                <span className="text-xs font-semibold text-slate-500">{"LMXJV"[index]}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Alertas recientes">
          <ul className="space-y-3 text-sm">
            {alerts.map((alert) => (
              <li key={alert.text} className="flex items-center gap-2">
                <span
                  className="block h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      alert.type === "stock" ? "#ff8e5a" : alert.type === "pedido" ? "#00a5ff" : "#ef4444"
                  }}
                />
                {alert.text}
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card title="Ventas recientes">
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="py-2">Ticket</th>
                <th className="py-2">Producto</th>
                <th className="py-2">Vendedor</th>
                <th className="py-2">Monto</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((sale) => (
                <tr key={sale.ticket} className="border-t border-slate-100">
                  <td className="py-2 font-semibold text-slate-600">{sale.ticket}</td>
                  <td className="py-2 text-slate-700">{sale.producto}</td>
                  <td className="py-2 text-slate-500">{sale.vendedor}</td>
                  <td className="py-2 text-slate-900">{sale.monto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function VendorDashboard() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Panel de vendedor</h2>
        <p className="text-sm text-slate-500">
          Enfócate en tus ventas y apartados. Usa el menú izquierdo para consultar el catálogo o
          registrar una salida.
        </p>
      </div>
      <StatsGrid
        stats={[
          { label: "Apartados activos", value: "5", caption: "Pendientes de entrega", icon: ShoppingBag },
          { label: "Clientes atendidos", value: "18", caption: "Últimos 7 días", icon: UsersRound }
        ]}
      />
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 text-sm text-slate-600">{children}</div>
    </div>
  );
}
