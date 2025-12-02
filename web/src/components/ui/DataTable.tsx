import type { ReactNode } from "react";

export default function DataTable({
  headers,
  rows,
  loading
}: {
  headers: string[];
  rows: Array<Array<string | ReactNode>>;
  loading?: boolean;
}) {
  if (loading) {
    return <p className="text-sm text-slate-400">Cargando datos...</p>;
  }

  if (!rows.length) {
    return <p className="text-sm text-slate-400">Todavía no se registran elementos.</p>;
  }

  return (
    <div className="overflow-auto rounded-2xl border border-slate-200">
      <table className="min-w-full text-left text-sm text-slate-600">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            {headers.map((head) => (
              <th key={head} className="px-4 py-2">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, rowIndex) => (
            <tr key={rowIndex} className="border-t border-slate-100">
              {cells.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`} className="px-4 py-2 text-slate-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
