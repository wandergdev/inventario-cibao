"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminLayout from "@/components/layout/AdminLayout";
import StatsGrid from "@/components/dashboard/StatsGrid";
import useRequireAuth from "@/hooks/useRequireAuth";
import { useAuth } from "@/context/AuthContext";
import { fetchProducts, fetchSalidas } from "@/lib/api";
import { Product, Salida } from "@/types";
import { AlertTriangle, DollarSign, PackageCheck, ShoppingBag, Truck, UsersRound } from "lucide-react";
import SearchableSelect from "@/components/ui/SearchableSelect";

const currencyFormatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatTipoVenta = (tipo?: string) => (tipo === "credito" ? "Crédito" : "Contado");

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
      .reduce((sum, salida) => {
        const amount = Number(salida.total ?? 0);
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0);
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

  const [filterEstado, setFilterEstado] = useState("");
  const weekRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const day = start.getDay(); // 0 (Sun) ... 6 (Sat)
    const diff = day === 0 ? -6 : 1 - day; // start week on Monday
    start.setDate(start.getDate() + diff);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, []);

  const weeklySalidas = useMemo(
    () =>
      salidas.filter((salida) => {
        const date = new Date(salida.fecha_salida);
        return date >= weekRange.start && date <= weekRange.end;
      }),
    [salidas, weekRange]
  );

  const estadoOptions = useMemo(() => {
    const unique = Array.from(new Set(weeklySalidas.map((salida) => salida.estado)));
    return [{ value: "", label: "Todos los estados" }, ...unique.map((estado) => ({ value: estado, label: estado }))];
  }, [weeklySalidas]);

  const recent = useMemo(
    () =>
      weeklySalidas
        .filter((salida) => (filterEstado ? salida.estado === filterEstado : true))
        .slice(0, 5),
    [weeklySalidas, filterEstado]
  );

  return (
    <div className="space-y-6">
      <StatsGrid stats={stats} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Salidas de la semana" loading={loading}>
          <div className="mb-4 flex flex-col gap-1">
            <label className="text-xs uppercase text-slate-400">Filtrar por estado</label>
            <SearchableSelect
              className="w-56"
              value={filterEstado}
              onChange={(value) => setFilterEstado(value)}
              options={estadoOptions}
              placeholder="Todos los estados"
            />
          </div>
          {recent.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
              <p className="mb-2">Aún no se han registrado salidas en la semana actual.</p>
              <Link href="/movimientos" className="font-semibold text-sky-600 hover:underline">
                Salidas generales →
              </Link>
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-400">
                  <tr>
                    <th className="py-2">Ticket</th>
                    <th className="py-2">Vendedor</th>
                    <th className="py-2">Estado</th>
                    <th className="py-2">Venta</th>
                    <th className="py-2">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((salida) => (
                    <tr key={salida.id} className="border-t border-slate-100">
                      <td className="py-2 font-semibold text-slate-600">{salida.ticket}</td>
                      <td className="py-2 text-slate-700">{salida.vendedor}</td>
                      <td className="py-2 text-slate-500 capitalize">{salida.estado}</td>
                      <td className="py-2 text-slate-500 capitalize">{formatTipoVenta(salida.tipo_venta ?? salida.tipoVenta)}</td>
                      <td className="py-2 text-slate-900">
                        RD$ {currencyFormatter.format(Number.isFinite(Number(salida.total)) ? Number(salida.total) : 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
                <th className="py-2">Venta</th>
                <th className="py-2">Monto</th>
              </tr>
            </thead>
            <tbody>
              {ownSalidas.slice(0, 5).map((salida) => (
                <tr key={salida.id} className="border-t border-slate-100">
                  <td className="py-2 font-semibold text-slate-600">{salida.ticket}</td>
                  <td className="py-2 text-slate-500 capitalize">{salida.estado}</td>
                  <td className="py-2 text-slate-500 capitalize">{formatTipoVenta(salida.tipo_venta ?? salida.tipoVenta)}</td>
                  <td className="py-2 text-slate-900">
                    RD$ {currencyFormatter.format(Number.isFinite(Number(salida.total)) ? Number(salida.total) : 0)}
                  </td>
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
