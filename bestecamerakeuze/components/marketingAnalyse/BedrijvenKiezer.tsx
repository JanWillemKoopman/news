"use client";

import { IconCheck } from "@/components/icons";

/**
 * Meerdere bedrijven kiezen als aanklikbare chips (een analyse of opzet kan over meer dan één
 * bedrijf gaan). Een gekozen bedrijf dat niet (meer) in de lijst staat, blijft zichtbaar en
 * uit te zetten.
 */
export default function BedrijvenKiezer({
  opties,
  gekozen,
  onChange,
  disabled,
  label,
}: {
  opties: string[];
  gekozen: string[];
  onChange: (bedrijven: string[]) => void;
  disabled?: boolean;
  label: string;
}) {
  const alle = [...opties, ...gekozen.filter((b) => !opties.includes(b))];
  const wissel = (b: string) => onChange(gekozen.includes(b) ? gekozen.filter((x) => x !== b) : [...gekozen, b]);
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {alle.map((b) => {
        const aan = gekozen.includes(b);
        return (
          <button
            key={b}
            type="button"
            aria-pressed={aan}
            onClick={() => wissel(b)}
            disabled={disabled}
            className={`inline-flex items-center gap-1.5 rounded-button border px-3 py-1.5 text-sm transition-colors duration-[var(--duur-snel)] disabled:opacity-60 ${
              aan ? "border-primary bg-primary/10 text-ink vdu:border-ink vdu:bg-ink vdu:text-card" : "border-line bg-card text-ink-muted hover:bg-surface vdu:hover:border-ink-faint vdu:hover:bg-card hover:text-ink"
            }`}
          >
            {aan && <IconCheck className="h-3.5 w-3.5 text-primary" />}
            {b}
          </button>
        );
      })}
    </div>
  );
}
