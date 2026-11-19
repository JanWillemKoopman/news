"use client";

import { useSyncExternalStore } from "react";

/**
 * De schakelaar "Eerdere jaren" rechtsboven op KPI's 2027 GA en KPI's 2027 Syntec: tonen de
 * grafieken ook de jaren vóór 2026 (de dunne vergelijkingslijnen)?
 *
 * Standaard uit, op verzoek: een grafiek toont dan alleen 2026, 2027 en het target — de
 * lijnen waar het overleg over gaat. De keuze geldt voor beide tabbladen tegelijk en wordt
 * per browser onthouden (localStorage, een gemak en geen gedeelde instelling). Een kleine
 * store met `useSyncExternalStore`, zodat twee panelen die allebei gemount zijn meteen
 * gelijk lopen en de server altijd "uit" rendert.
 */

const SLEUTEL = "kpi-eerdere-jaren";
const luisteraars = new Set<() => void>();
let waarde: boolean | null = null;

function lees(): boolean {
  if (waarde !== null) return waarde;
  try {
    waarde = window.localStorage.getItem(SLEUTEL) === "aan";
  } catch {
    waarde = false;
  }
  return waarde;
}

function zet(aan: boolean): void {
  waarde = aan;
  try {
    window.localStorage.setItem(SLEUTEL, aan ? "aan" : "uit");
  } catch {
    // Geen opslag (privévenster): de keuze geldt dan alleen tot herladen.
  }
  luisteraars.forEach((l) => l());
}

function abonneer(l: () => void): () => void {
  luisteraars.add(l);
  return () => luisteraars.delete(l);
}

/** Of de eerdere jaren getoond worden, en een functie om dat te wijzigen. */
export function useEerdereJaren(): [boolean, (aan: boolean) => void] {
  const aan = useSyncExternalStore(abonneer, lees, () => false);
  return [aan, zet];
}

/** De schakelaar zelf, voor rechts in de statusbalk van het tabblad. */
export default function EerdereJarenSchakelaar() {
  const [aan, wissel] = useEerdereJaren();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={aan}
      onClick={() => wissel(!aan)}
      title={aan ? "Verberg de lijnen van de jaren vóór 2026" : "Toon ook de lijnen van de jaren vóór 2026"}
      className="flex shrink-0 items-center gap-2 rounded-control border border-line bg-card px-3 py-1.5 text-sm font-medium text-ink shadow-card transition-colors duration-[var(--duur-snel)] ease-merk hover:bg-surface"
    >
      <span
        aria-hidden="true"
        className={`relative inline-block h-4 w-7 rounded-pill transition-colors duration-[var(--duur-snel)] ease-merk ${
          aan ? "bg-primary" : "bg-ink-faint/40"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-pill bg-card shadow-subtle transition-[left] duration-[var(--duur-snel)] ease-merk ${
            aan ? "left-3.5" : "left-0.5"
          }`}
        />
      </span>
      Eerdere jaren
    </button>
  );
}
