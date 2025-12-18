"use client";

import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import StatsGrid from "@/components/dashboard/StatsGrid";
import useRequireAuth from "@/hooks/useRequireAuth";
import { useAuth } from "@/context/AuthContext";
import { fetchProducts, fetchSalidas } from "@/lib/api";
import { Product, Salida } from "@/types";
import { AlertTriangle, DollarSign, PackageCheck, ShoppingBag, Truck, UsersRound } from "lucide-react";

const currencyFormatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DashboardPage() {
  const { hydrated } = useRequireAuth();
  const { role, token, userName, userId } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [salidas, setSalidas] = useState<Salida[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const [productsData, salidasData] = await Promise.all([fetchProducts(token), fetchSalidas(token)]);
        setProducts(productsData);
        setSalidas(salidasData);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    if (hydrated && token) {
      void loadData();
    }
  }, [token, hydrated]);

  if (!hydrated) return null;

  const isAdmin = role === "Administrador";

  return (
    <AdminLayout active="Dashboard">
      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
      {isAdmin ? (
        <AdminDashboard salidas={salidas} products={products} loading={loading} />
      ) : (
        <VendorDashboard salidas={salidas} loading={loading} vendorName={userName} vendorId={userId} />
      )}
    </AdminLayout>
  );
}

function AdminDashboard({ salidas, products, loading }: { salidas: Salida[]; products: Product[]; loading: boolean }) {
  const lowStock = useMemo(() => products.filter((p) => p.stockActual <= p.stockMinimo), [products]);
  const currentMonthValue = useMemo(() => {
    const now = new Date();
    return salidas
      .filter((s) => {
        const date = new Date(s.fecha_salida);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      })
      .reduce((sum, salida) => sum + salida.total, 0);
  }, [salidas]);

  const pendingSalidas = salidas.filter((s) => s.estado === "pendiente");

  const stats = [
    { label: "Productos en stock", value: products.length.toString(), caption: "Actualizado online", icon: PackageCheck },
    {
      label: "Monto salidas mes",
      value: `RD$ ${currencyFormatter.format(currentMonthValue)}`,
      caption: "Basado en salidas registradas",
      icon: DollarSign
    },
    {
      label: "Stock en alerta",
      value: lowStock.length.toString(),
      caption: "Por debajo del mínimo",
      icon: AlertTriangle
    },
    { label: "Salidas pendientes", value: pendingSalidas.length.toString(), caption: "Por entregar", icon: Truck }
  ];

  const alerts = [
    ...lowStock.slice(0, 3).map((p) => ({ type: "stock", text: `Stock bajo: ${p.nombre}` })),
    ...pendingSalidas.slice(0, 2).map((s) => ({ type: "pendiente", text: `Ticket ${s.ticket} pendiente de entrega` }))
  ];

  const recent = salidas.slice(0, 5);

  return (
    <div className="space-y-6">
      <StatsGrid stats={stats} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Salidas recientes" loading={loading}>
          <div className="overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-2">Ticket</th>
                  <th className="py-2">Vendedor</th>
                  <th className="py-2">Estado</th>
                  <th className="py-2">Monto</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((salida) => (
                  <tr key={salida.id} className="border-t border-slate-100">
                    <td className="py-2 font-semibold text-slate-600">{salida.ticket}</td>
                    <td className="py-2 text-slate-700">{salida.vendedor}</td>
                    <td className="py-2 text-slate-500 capitalize">{salida.estado}</td>
                    <td className="py-2 text-slate-900">RD$ {currencyFormatter.format(salida.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Alertas recientes" loading={loading}>
          {alerts.length === 0 ? (
            <p className="text-sm text-slate-500">Sin alertas registradas.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {alerts.map((alert, index) => (
                <li key={`${alert.text}-${index}`} className="flex items-center gap-2">
                  <span
                    className="block h-2 w-2 rounded-full"
                    style={{ backgroundColor: alert.type === "stock" ? "#ff8e5a" : "#00a5ff" }}
                  />
                  {alert.text}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function VendorDashboard({ salidas, loading, vendorName, vendorId }: { salidas: Salida[]; loading: boolean; vendorName: string | null; vendorId: string | null }) {
  const ownSalidas = useMemo(() => {
    if (!vendorName) return salidas;
    return salidas.filter((s) => s.vendedor?.toLowerCase() === vendorName.toLowerCase());
  }, [salidas, vendorName]);

  const stats = [
    { label: "Salidas realizadas", value: ownSalidas.length.toString(), caption: "Últimos registros", icon: ShoppingBag },
    {
      label: "Clientes atendidos",
      value: new Set(ownSalidas.map((s) => s.ticket)).size.toString(),
      caption: "Basado en tickets",
      icon: UsersRound
    }
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Panel de vendedor</h2>
        <p className="text-sm text-slate-500">
          Consulta tus salidas recientes y mantente al tanto de las entregas pendientes.
        </p>
      </div>
      <StatsGrid stats={stats} />
      <Card title="Tus últimas salidas" loading={loading}>
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="py-2">Ticket</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Monto</th>
              </tr>
            </thead>
            <tbody>
              {ownSalidas.slice(0, 5).map((salida) => (
                <tr key={salida.id} className="border-t border-slate-100">
                  <td className="py-2 font-semibold text-slate-600">{salida.ticket}</td>
                  <td className="py-2 text-slate-500 capitalize">{salida.estado}</td>
                  <td className="py-2 text-slate-900">RD$ {currencyFormatter.format(salida.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Card({ title, children, loading }: { title: string; children: React.ReactNode; loading?: boolean }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 text-sm text-slate-600">{loading ? <p>Cargando...</p> : children}</div>
    </div>
  );
}
