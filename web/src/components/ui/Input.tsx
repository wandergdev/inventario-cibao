import clsx from "clsx";
import { InputHTMLAttributes } from "react";

export default function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-800",
        "focus:outline-none focus:ring-2 focus:ring-sky-100",
        props.className
      )}
    />
  );
}
