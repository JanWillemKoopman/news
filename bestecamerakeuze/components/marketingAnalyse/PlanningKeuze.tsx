"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconChevronDown } from "@/components/icons";
import { volgendeWeergave, type PlanningInvoer, type VolgendeWeergave } from "@/lib/marketingAnalyse/planning";
import { PLANNING_NAAM, PLANNINGEN, type Planning } from "@/lib/marketingAnalyse/types";

const TOON_KLEUR: Record<VolgendeWeergave["toon"], string> = {
  klaar: "text-primary",
  eind: "text-orange",
  gewoon: "text-ink-muted",
  uit: "text-ink-muted",
};

/** "Volgende vr 4 dec · over november", of "Niet ingepland" bij Uit. */
export function VolgendeRegel({ weergave }: { weergave: VolgendeWeergave }) {
  if (!weergave.datum) return <span className="text-meta text-ink-faint">Niet ingepland</span>;
  return (
    <span className="whitespace-nowrap text-meta text-ink-faint">
      Volgende <span className={`font-medium ${TOON_KLEUR[weergave.toon]}`}>{weergave.datum}</span>
      {weergave.toelichting && ` · ${weergave.toelichting}`}
    </span>
  );
}

/**
 * De planning vooraan in elke regel van het overzicht (plan §17): een knopje met de stand en een
 * uitklapmenu met Uit, Wekelijks, Maandelijks en Per kwartaal. Achter elke keuze staat wanneer de
 * volgende analyse dan komt. Het menu staat in een portal, want de tabel scrolt horizontaal en
 * zou het anders afknippen.
 */
export default function PlanningKeuze({
  regel,
  naam,
  vandaag,
  bezig,
  onKies,
  compact = false,
}: {
  regel: PlanningInvoer;
  naam: string;
  vandaag: string;
  bezig: boolean;
  onKies: (planning: Planning) => void;
  /**
   * Eén rustige regel tekst ("Wekelijks · vr 4 dec") zonder kader, voor de campagnetabel waar de
   * resultaten voorgaan (verzoek van de eigenaar, 27 november 2026). De toelichting staat in de tooltip.
   */
  compact?: boolean;
}) {
  const [plek, setPlek] = useState<{ top: number; left: number } | null>(null);
  const open = plek !== null;
  const knopRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const sluit = () => setPlek(null);
    function buiten(e: MouseEvent) {
      const doel = e.target as Node;
      if (!knopRef.current?.contains(doel) && !menuRef.current?.contains(doel)) sluit();
    }
    function toets(e: KeyboardEvent) {
      if (e.key === "Escape") {
        sluit();
        knopRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", buiten);
    document.addEventListener("keydown", toets);
    // Vaste positie: bij scrollen of een andere venstermaat klopt hij niet meer, dus dicht.
    window.addEventListener("scroll", sluit, true);
    window.addEventListener("resize", sluit);
    menuRef.current?.querySelector<HTMLButtonElement>("[aria-checked='true']")?.focus();
    return () => {
      document.removeEventListener("mousedown", buiten);
      document.removeEventListener("keydown", toets);
      window.removeEventListener("scroll", sluit, true);
      window.removeEventListener("resize", sluit);
    };
  }, [open]);

  function wissel() {
    const r = knopRef.current?.getBoundingClientRect();
    setPlek((huidig) => (huidig || !r ? null : { top: r.bottom + 6, left: r.left }));
  }

  function kies(p: Planning) {
    setPlek(null);
    if (p !== regel.planning) onKies(p);
  }

  /** Pijltjes omhoog en omlaag lopen door de keuzes. */
  function pijltjes(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const knoppen = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitemradio']") ?? []);
    const i = knoppen.indexOf(document.activeElement as HTMLButtonElement);
    const volgende = e.key === "ArrowDown" ? (i + 1) % knoppen.length : (i - 1 + knoppen.length) % knoppen.length;
    knoppen[volgende]?.focus();
  }

  const uit = regel.planning === "uit";
  const volgende = volgendeWeergave(regel, vandaag);
  const pijl = (
    <IconChevronDown
      className={`h-3.5 w-3.5 shrink-0 text-ink-faint transition-transform duration-[var(--duur-snel)] ${open ? "rotate-180" : ""}`}
    />
  );

  return (
    <div className="flex flex-col items-start gap-1.5" onClick={(e) => e.stopPropagation()}>
      {compact ? (
        <button
          ref={knopRef}
          type="button"
          onClick={wissel}
          disabled={bezig}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Planning voor ${naam}: ${PLANNING_NAAM[regel.planning]}`}
          data-tip={
            volgende.datum
              ? `Volgende analyse ${volgende.datum}${volgende.toelichting ? ` · ${volgende.toelichting}` : ""}. Klik om de planning te wijzigen.`
              : "Niet ingepland. Klik om de planning te wijzigen."
          }
          // M7: een rustig knopje (haarlijn, bij hover een donkerdere rand) in plaats van platte
          // tekst, zodat je ziet dat het een keuzemenu is.
          className={`-my-1 inline-flex items-center gap-1 whitespace-nowrap rounded-control border px-1.5 py-1 text-meta transition-colors duration-[var(--duur-snel)] ease-merk hover:border-ink-faint hover:text-ink disabled:opacity-60 ${
            open ? "border-ink-faint text-ink" : "border-line bg-card text-ink-muted"
          }`}
        >
          {PLANNING_NAAM[regel.planning]}
          {volgende.datum && (
            <>
              {" · "}
              <span className={volgende.toon === "eind" ? "text-orange" : undefined}>{volgende.datum}</span>
            </>
          )}
          {pijl}
        </button>
      ) : (
        <>
          <button
            ref={knopRef}
            type="button"
            onClick={wissel}
            disabled={bezig}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={`Planning voor ${naam}: ${PLANNING_NAAM[regel.planning]}`}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-button border border-line bg-card py-1 pl-3 pr-2 text-xs font-medium transition-colors duration-[var(--duur-snel)] hover:bg-surface disabled:opacity-60 ${
              uit ? "text-ink-faint" : "text-ink"
            }`}
          >
            {PLANNING_NAAM[regel.planning]}
            {pijl}
          </button>
          <VolgendeRegel weergave={volgende} />
        </>
      )}
      {plek &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={`Planning voor ${naam}`}
            style={{ top: plek.top, left: plek.left }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={pijltjes}
            className="fixed z-50 w-64 rounded-card border border-line bg-card py-1 shadow-dropdown"
          >
            {PLANNINGEN.map((p) => {
              const gekozen = p === regel.planning;
              const voorbeeld = volgendeWeergave({ ...regel, planning: p }, vandaag);
              return (
                <button
                  key={p}
                  type="button"
                  role="menuitemradio"
                  aria-checked={gekozen}
                  onClick={() => kies(p)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-surface focus:bg-surface focus:outline-none"
                >
                  <span className={`flex items-center gap-2 ${gekozen ? "font-semibold text-ink" : "text-ink"}`}>
                    <span className="inline-flex w-3.5 justify-center">
                      {gekozen && <IconCheck className="h-3.5 w-3.5 text-primary" />}
                    </span>
                    {PLANNING_NAAM[p]}
                  </span>
                  <span className="whitespace-nowrap text-meta text-ink-faint">
                    {voorbeeld.datum ?? "geen updates"}
                  </span>
                </button>
              );
            })}
            <p className="mx-3 mt-1 border-t border-line-soft pt-2 pb-1 text-meta text-ink-faint">
              Maandelijks: eerste vrijdag van de maand. Per kwartaal: eerste vrijdag van jan, apr, jul en okt.
            </p>
          </div>,
          document.body,
        )}
    </div>
  );
}
