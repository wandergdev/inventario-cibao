import type { LucideIcon } from "lucide-react";
import clsx from "clsx";

export default function IconBadge({
  icon: Icon,
  className
}: {
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600",
        className
      )}
    >
      <Icon size={20} strokeWidth={2} />
    </span>
  );
}
