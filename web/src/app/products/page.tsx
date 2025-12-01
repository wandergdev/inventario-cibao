"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import ManagementSection from "@/components/dashboard/ManagementSection";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import StatsGrid from "@/components/dashboard/StatsGrid";
import { useAuth } from "@/context/AuthContext";
import useRequireAuth from "@/hooks/useRequireAuth";
import { Product } from "@/types";
import { createProduct, fetchProducts } from "@/lib/api";
import { Boxes, Layers, PackageOpen, TrendingDown } from "lucide-react";

export default function ProductsPage() {
  const { token } = useAuth();
  const { hydrated } = useRequireAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nombre: "", stockActual: 0, stockMinimo: 0 });
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      setProducts(await fetchProducts(token));
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      void load();
    }
  }, [token]);

  const handleSubmit = async () => {
    if (!token) return;
    if (!form.nombre) {
      return setMessage("Ingresa el nombre del producto");
    }
    try {
      await createProduct(token, {
        nombre: form.nombre,
        stockActual: form.stockActual,
        stockMinimo: form.stockMinimo,
        disponible: true
      });
      setForm({ nombre: "", stockActual: 0, stockMinimo: 0 });
      setMessage("Producto registrado");
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  if (!hydrated) {
    return null;
  }

  return (
    <AdminLayout active="Productos">
      {message && <p className="text-sm text-slate-500">{message}</p>}
      <StatsGrid
        stats={[
          {
            label: "Productos activos",
            value: products.filter((p) => p.disponible).length.toString(),
            caption: "Listos para vender",
            icon: Boxes
          },
          {
            label: "Fuera de stock",
            value: products.filter((p) => p.stockActual <= 0).length.toString(),
            caption: "Revisar pedidos",
            icon: PackageOpen,
            iconClassName: "bg-rose-50 text-rose-500"
          },
          {
            label: "Bajo mínimo",
            value: products.filter((p) => p.stockActual <= p.stockMinimo).length.toString(),
            caption: "Necesitan reposición",
            icon: TrendingDown,
            iconClassName: "bg-amber-50 text-amber-500"
          },
          {
            label: "Total inventario",
            value: products.length.toString(),
            caption: "Registrados en el sistema",
            icon: Layers,
            iconClassName: "bg-indigo-50 text-indigo-500"
          }
        ]}
      />
      <ManagementSection
        title="Inventario"
        description="Control de existencias para tienda y ruta."
        headers={["Producto", "Stock", "Mínimo", "Disponibilidad"]}
        form={
          <div className="grid gap-3 lg:grid-cols-3">
            <Input
              placeholder="Nombre"
              value={form.nombre}
              onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="Stock actual"
              value={form.stockActual}
              onChange={(e) => setForm((prev) => ({ ...prev, stockActual: Number(e.target.value) }))}
            />
            <Input
              type="number"
              placeholder="Stock mínimo"
              value={form.stockMinimo}
              onChange={(e) => setForm((prev) => ({ ...prev, stockMinimo: Number(e.target.value) }))}
            />
            <Button onClick={handleSubmit} className="lg:col-span-3" variant="accent">
              Guardar producto
            </Button>
          </div>
        }
        rows={products.map((p) => [
          p.nombre,
          p.stockActual.toString(),
          p.stockMinimo.toString(),
          p.disponible ? "Disponible" : "No disponible"
        ])}
        loading={loading}
      />
    </AdminLayout>
  );
}
