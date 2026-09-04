"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
};

export default function FilterDropdown({ label, options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-pill border px-4 py-2 text-sm font-medium transition-colors ${
          selected.length > 0
            ? "border-brand bg-brand text-white"
            : "border-line bg-card text-ink hover:border-brand"
        }`}
      >
        {label}
        {selected.length > 0 && (
          <span className="rounded-full bg-white px-1.5 py-0.5 text-xs font-semibold text-brand">
            {selected.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 max-h-72 w-56 overflow-y-auto rounded-card border border-line bg-card p-2 shadow-lg">
          {options.length === 0 ? (
            <p className="px-2 py-1 text-sm text-ink-faint">Geen opties</p>
          ) : (
            <>
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="mb-1 block w-full rounded px-2 py-1 text-left text-xs font-medium text-brand hover:bg-brand-light"
                >
                  Wis selectie
                </button>
              )}
              {options.map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-ink hover:bg-page"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => toggle(option)}
                    className="h-4 w-4 shrink-0 rounded border-line"
                  />
                  <span className="truncate">{option}</span>
                </label>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
