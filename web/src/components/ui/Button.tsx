import clsx from "clsx";
import { ButtonHTMLAttributes } from "react";

export default function Button({ variant = "primary", className, ...props }: ButtonProps) {
const variants = {
  primary: "bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white",
  accent: "bg-emerald-500 hover:bg-emerald-600 text-white",
  subtle: "bg-white/80 text-slate-600 hover:bg-white"
};

return (
  <button
    {...props}
    className={clsx(
      "rounded-2xl px-4 py-2 text-sm font-semibold shadow-lg transition disabled:opacity-60",
      variants[variant],
      className
    )}
    />
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "accent" | "subtle";
};
