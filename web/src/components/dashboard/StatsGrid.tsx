import IconBadge from "@/components/ui/IconBadge";
import type { LucideIcon } from "lucide-react";

export default function StatsGrid({ stats }: { stats: StatCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-3xl border border-slate-100 bg-white/80 p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <IconBadge icon={stat.icon} className={stat.iconClassName} />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</p>
              <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
            </div>
          </div>
          {stat.caption && <p className="mt-2 text-xs text-slate-500">{stat.caption}</p>}
        </div>
      ))}
    </div>
  );
}

type StatCard = {
  label: string;
  value: string;
  caption?: string;
  icon: LucideIcon;
  iconClassName?: string;
};
