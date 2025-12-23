import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import Input from "./Input";

type Option = {
  value: string;
  label: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
};

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Selecciona una opción",
  disabled,
  className,
  buttonClassName,
  searchPlaceholder = "Buscar...",
  emptyLabel = "Sin resultados"
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  const selected = useMemo(() => options.find((option) => option.value === value), [options, value]);

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return options;
    }
    return options.filter((option) => option.label.toLowerCase().includes(term));
  }, [options, search]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setOpen(false);
  };

  return (
    <div className={clsx("relative", className)} ref={containerRef}>
      <button
        type="button"
        className={clsx(
          "flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-left text-sm text-slate-800",
          "focus:outline-none focus:ring-2 focus:ring-sky-100",
          disabled && "cursor-not-allowed opacity-60",
          buttonClassName
        )}
        onClick={() => {
          if (!disabled) {
            setOpen((prev) => !prev);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        <span className={clsx(!selected && "text-slate-400")}>{selected?.label ?? placeholder}</span>
        <svg className="h-4 w-4 text-slate-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 111.06 1.061l-4.24 4.25a.75.75 0 01-1.06 0l-4.25-4.25a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            autoFocus
          />
          <div className="mt-2 max-h-56 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <p className="py-2 text-center text-sm text-slate-500">{emptyLabel}</p>
            ) : (
              filteredOptions.map((option) => (
                <button
                  type="button"
                  key={option.value || `empty-${option.label}`}
                  className={clsx(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition",
                    option.value === value ? "bg-sky-50 text-sky-700" : "text-slate-700 hover:bg-slate-50"
                  )}
                  onClick={() => handleSelect(option.value)}
                >
                  <span>{option.label}</span>
                  {option.value === value && (
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M16.704 5.29a1 1 0 010 1.415l-7.2 7.2a1 1 0 01-1.414 0l-4.2-4.2a1 1 0 111.414-1.414l3.493 3.493 6.493-6.493a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
