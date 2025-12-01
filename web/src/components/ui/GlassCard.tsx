import clsx from "clsx";

export default function GlassCard({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        "rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur",
        className
      )}
    >
      {children}
    </section>
  );
}
