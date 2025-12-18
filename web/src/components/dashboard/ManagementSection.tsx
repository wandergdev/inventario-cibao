import DataTable from "@/components/ui/DataTable";
import type { ReactNode } from "react";

export default function ManagementSection({
  title,
  description,
  headers,
  form,
  rows,
  loading
}: {
  title: string;
  description: string;
  headers: string[];
  form?: ReactNode;
  rows: Array<Array<string | ReactNode>>;
  loading?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white/80 p-6 shadow">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <div className="space-y-4 text-sm text-slate-600">
        {form}
        <DataTable headers={headers} rows={rows} loading={loading} />
      </div>
    </div>
  );
}
