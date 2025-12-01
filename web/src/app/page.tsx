import MainLayout from "@/components/layout/MainLayout";
import Link from "next/link";

export default function Home() {
  return (
    <MainLayout>
      <div className="mx-auto max-w-5xl space-y-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-sky-500">
          Inventario Cibao
        </p>
        <h1 className="text-4xl font-bold text-slate-900">Gestiona tu inventario con estilo</h1>
        <p className="text-lg text-slate-600">
          Esta interfaz conecta con el backend Express que construimos en Node.js para administrar
          usuarios, suplidores, productos y los próximos módulos de salidas y reportes.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/login"
            className="rounded-3xl bg-gradient-to-r from-sky-500 to-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/suppliers"
            className="rounded-3xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-600"
          >
            Ir al panel de suplidores
          </Link>
          <Link
            href="/products"
            className="rounded-3xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-600"
          >
            Ir al panel de productos
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
