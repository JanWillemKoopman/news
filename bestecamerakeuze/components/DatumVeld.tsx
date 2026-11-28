"use client";

import { useRef } from "react";
import { IconCalendar, IconClose } from "@/components/icons";

const NL = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** "2026-09-28" → "28 september 2026"; leeg of ongeldig → null. */
export function datumNL(waarde: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(waarde)) return null;
  const d = new Date(`${waarde}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : NL.format(d);
}

/**
 * Een datumveld dat altijd Nederlands toont ("28 september 2026"), los van de taal van de browser
 * (M4). Het browserveld `type="date"` toont de volgorde van de browsertaal, en op een Engelstalige
 * laptop is dat mm/dd/yyyy. Hier staat de datum als tekst in een knop in de stijl van de andere
 * velden; een klik opent de kalender van de browser (`showPicker`), die de waarde als
 * JJJJ-MM-DD teruggeeft.
 */
export default function DatumVeld({
  value,
  onChange,
  disabled,
  label,
  leeg = "Kies een datum",
}: {
  /** "JJJJ-MM-DD" of leeg. */
  value: string;
  onChange: (waarde: string) => void;
  disabled?: boolean;
  label: string;
  leeg?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const tekst = datumNL(value);

  function open() {
    const el = ref.current;
    if (!el || disabled) return;
    try {
      el.showPicker();
    } catch {
      // Oudere browser zonder showPicker: dan gewoon het veld zelf.
      el.focus();
      el.click();
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={open}
        disabled={disabled}
        aria-label={`${label}: ${tekst ?? "geen datum"}`}
        className="flex w-full items-center gap-2 rounded-control border border-line bg-card px-3 py-2 text-left text-sm transition-colors duration-[var(--duur-snel)] ease-merk hover:border-ink-faint focus-visible:border-primary disabled:opacity-60"
      >
        <IconCalendar className="h-4 w-4 shrink-0 text-ink-faint" />
        <span className={tekst ? "text-ink" : "text-ink-faint/80"}>{tekst ?? leeg}</span>
      </button>
      {value && !disabled && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={`${label} leegmaken`}
          data-tip="Leegmaken"
          className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-control text-ink-faint transition-colors hover:bg-surface hover:text-ink"
        >
          <IconClose className="h-3.5 w-3.5" />
        </button>
      )}
      {/* Het echte veld: onzichtbaar onder de knop, zodat de kalender op de goede plek opent. */}
      <input
        ref={ref}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
      />
    </div>
  );
}
