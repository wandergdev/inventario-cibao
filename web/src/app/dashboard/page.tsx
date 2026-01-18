"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminLayout from "@/components/layout/AdminLayout";
import StatsGrid from "@/components/dashboard/StatsGrid";
import useRequireAuth from "@/hooks/useRequireAuth";
import { useAuth } from "@/context/AuthContext";
import { fetchPedidos, fetchProducts, fetchSalidas } from "@/lib/api";
import { Pedido, Product, Salida } from "@/types";
import { AlertTriangle, DollarSign, PackageCheck, ShoppingBag, Truck, UsersRound } from "lucide-react";
import SearchableSelect from "@/components/ui/SearchableSelect";

const currencyFormatter = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatTipoVenta = (tipo?: string) => (tipo === "credito" ? "Crédito" : "Contado");
const normalizeEstadoSalida = (value?: string | null) => (value ?? "").trim().toLowerCase();
const isPendingSalidaEstado = (estado?: string | null) => {
  const normalized = normalizeEstadoSalida(estado);
  if (!normalized) return false;
  if (normalized.includes("cancel")) {
    return false;
  }
  if (normalized.includes("entregad")) {
    return false;
  }
  return true;
};

const getNumber = (value?: number | null) => {
  const parsed = Number(value ?? 0);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export default function DashboardPage() {
  const { hydrated } = useRequireAuth();
  const { role, token, userName, userId } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [salidas, setSalidas] = useState<Salida[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const [productsData, salidasData, pedidosData] = await Promise.all([
          fetchProducts(token),
          fetchSalidas(token),
          fetchPedidos(token)
        ]);
        setProducts(productsData);
        setSalidas(salidasData);
        setPedidos(pedidosData);
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
        <AdminDashboard salidas={salidas} products={products} pedidos={pedidos} loading={loading} />
      ) : (
        <VendorDashboard salidas={salidas} loading={loading} vendorName={userName} vendorId={userId} />
      )}
    </AdminLayout>
  );
}

function AdminDashboard({
  salidas,
  products,
  pedidos,
  loading
}: {
  salidas: Salida[];
  products: Product[];
  pedidos: Pedido[];
  loading: boolean;
}) {
  const stockAlerts = useMemo(
    () =>
      products
        .filter((product) => {
          const stock = Number(product.stockActual ?? 0);
          const minimum = Number(product.stockMinimo ?? 0);
          return minimum > 0 && stock <= minimum;
        })
        .map((product) => ({
          id: product.id,
          nombre: product.nombre,
          disponible: Number(product.stockActual ?? 0),
          minimo: Number(product.stockMinimo ?? 0)
        })),
    [products]
  );
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

  const pendingSalidas = useMemo(
    () =>
      salidas
        .filter((salida) => isPendingSalidaEstado(salida.estado))
        .map((salida) => ({
          id: salida.id,
          ticket: salida.ticket,
          vendedor: salida.vendedor,
          estado: salida.estado
        })),
    [salidas]
  );

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
      value: stockAlerts.length.toString(),
      caption: "Por debajo del mínimo",
      icon: AlertTriangle
    },
    { label: "Salidas pendientes", value: pendingSalidas.length.toString(), caption: "Por entregar", icon: Truck }
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

  const pedidoAlerts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return pedidos
      .filter((pedido) => {
        const expected = pedido.fechaEsperada ? new Date(pedido.fechaEsperada) : null;
        if (!expected) return false;
        expected.setHours(0, 0, 0, 0);
        if (expected >= today) return false;
        const estado = (pedido.estado ?? "").toLowerCase();
        if (estado.includes("recibido") || estado.includes("cancel")) return false;
        if (pedido.fechaRecibido) return false;
        return true;
      })
      .map((pedido) => ({
        id: pedido.id,
        etiqueta: pedido.producto ?? pedido.productoNombreReferencia ?? "Producto sin catalogar"
      }));
  }, [pedidos]);

  const entregaAlerts = pendingSalidas;

  const inactivityAlerts = useMemo(() => {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    return products
      .filter((product) => {
        const limit = Number(product.semanasMaxSinMovimiento ?? 0);
        if (!limit) return false;
        const last = product.ultimaFechaMovimiento ? new Date(product.ultimaFechaMovimiento) : null;
        if (!last || Number.isNaN(last.getTime())) return false;
        last.setHours(0, 0, 0, 0);
        const diffWeeks = Math.floor((now - last.getTime()) / weekMs);
        return diffWeeks >= limit;
      })
      .map((product) => ({
        id: product.id,
        nombre: product.nombre
      }));
  }, [products]);

  const alerts = useMemo(
    () => [
      ...stockAlerts.map((alert) => ({ text: `Stock bajo: ${alert.nombre}`, color: "#ff8e5a", id: alert.id })),
      ...pedidoAlerts.map((pedido) => ({ text: `Pedido retrasado: ${pedido.etiqueta}`, color: "#ffb347", id: pedido.id })),
      ...entregaAlerts.map((salida) => ({ text: `Ticket ${salida.ticket} pendiente de entrega`, color: "#00a5ff", id: salida.id })),
      ...inactivityAlerts.map((producto) => ({ text: `Sin movimiento: ${producto.nombre}`, color: "#6366f1", id: producto.id }))
    ],
    [stockAlerts, pedidoAlerts, entregaAlerts, inactivityAlerts]
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
                  <span className="block h-2 w-2 rounded-full" style={{ backgroundColor: alert.color }} />
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
