"use client";

import { useState } from "react";

/**
 * De gesprekkenlijst naast de chat: nieuw gesprek, zoeken, hernoemen, verwijderen.
 *
 * De titels worden automatisch gegenereerd na het eerste antwoord, maar zijn te
 * overschrijven — een collega die "Q3-analyse Volvo" in de lijst wil zien, moet dat
 * gewoon kunnen typen.
 */

export interface Gesprek {
  id: string;
  titel: string;
  bijgewerktOp: string;
}

function relatieveTijd(iso: string): string {
  const verschil = Date.now() - new Date(iso).getTime();
  const minuten = Math.floor(verschil / 60000);
  if (minuten < 1) return "nu";
  if (minuten < 60) return `${minuten} min`;
  const uren = Math.floor(minuten / 60);
  if (uren < 24) return `${uren} uur`;
  const dagen = Math.floor(uren / 24);
  if (dagen === 1) return "gisteren";
  if (dagen < 7) return `${dagen} dagen`;
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export default function GesprekLijst({
  gesprekken,
  actiefId,
  zoek,
  onZoek,
  onKies,
  onNieuw,
  onHernoem,
  onVerwijder,
}: {
  gesprekken: Gesprek[];
  actiefId: string | null;
  zoek: string;
  onZoek: (v: string) => void;
  onKies: (id: string) => void;
  onNieuw: () => void;
  onHernoem: (id: string, titel: string) => void;
  onVerwijder: (id: string) => void;
}) {
  const [bewerktId, setBewerktId] = useState<string | null>(null);
  const [concept, setConcept] = useState("");

  function startBewerken(g: Gesprek) {
    setBewerktId(g.id);
    setConcept(g.titel);
  }

  function bevestig() {
    if (bewerktId && concept.trim()) onHernoem(bewerktId, concept.trim());
    setBewerktId(null);
  }

  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-72">
      <button
        type="button"
        onClick={onNieuw}
        className="rounded-pill bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
      >
        Nieuw gesprek
      </button>

      <input
        type="search"
        value={zoek}
        onChange={(e) => onZoek(e.target.value)}
        placeholder="Zoek in gesprekken"
        className="rounded-pill border border-line bg-card px-4 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none"
      />

      {gesprekken.length === 0 ? (
        <p className="px-1 py-3 text-sm text-ink-faint">
          {zoek ? "Geen gesprekken gevonden." : "Nog geen gesprekken."}
        </p>
      ) : (
        <ul className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
          {gesprekken.map((g) => {
            const actief = g.id === actiefId;
            return (
              <li key={g.id}>
                {bewerktId === g.id ? (
                  <input
                    autoFocus
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    onBlur={bevestig}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") bevestig();
                      if (e.key === "Escape") setBewerktId(null);
                    }}
                    className="w-full rounded-card border border-primary bg-card px-3 py-2 text-sm text-ink focus:outline-none"
                  />
                ) : (
                  <div
                    className={`group flex items-center gap-1 rounded-card px-3 py-2 transition-colors ${
                      actief ? "bg-accent" : "hover:bg-surface"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onKies(g.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-sm text-ink">{g.titel}</span>
                      <span className="text-xs text-ink-faint">
                        {relatieveTijd(g.bijgewerktOp)}
                      </span>
                    </button>
                    {/* Op touchscreens is er geen hover, dus de knoppen zijn daar altijd
                        zichtbaar; op muisapparaten verschijnen ze pas bij aanwijzen. */}
                    <span className="flex shrink-0 gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={() => startBewerken(g)}
                        aria-label={`Hernoem ${g.titel}`}
                        title="Hernoemen"
                        className="rounded px-1.5 py-1 text-xs text-ink-muted hover:text-ink"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`"${g.titel}" verwijderen?`)) onVerwijder(g.id);
                        }}
                        aria-label={`Verwijder ${g.titel}`}
                        title="Verwijderen"
                        className="rounded px-1.5 py-1 text-xs text-ink-muted hover:text-orange"
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
