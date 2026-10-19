"use client";

import { useMemo, useState } from "react";
import Ga4KoppelZijbalk from "@/components/ga4/Ga4KoppelZijbalk";
import { IconPencil, IconPlus } from "@/components/icons";
import { useCampagneFilters } from "@/lib/campagneFilterContext";
import { formatNumber } from "@/lib/format";
import { omschrijfRegel } from "@/lib/ga4Koppeling";
import { useGa4Koppelingen } from "@/lib/ga4KoppelingContext";
import type { Campagne } from "@/lib/sheet";

/**
 * Campagnebeheer → Google Analytics: per campagne welke GA4-events als conversie tellen.
 *
 * Bewust alleen de campagnenaam en de koppeling, niet de sheetvelden van het tabblad
 * Syntec: dit tabblad beantwoordt één vraag ("wat telt hier als conversie?"). De telling
 * staat er wél naast, als controle — een koppeling die nul oplevert terwijl de campagne
 * al weken loopt, is meestal een verkeerd gespeld pad, en dat zie je hier meteen.
 *
 * Het bewerken gebeurt in een zijbalk en niet in de cel: een regel heeft events én
 * voorwaarden, en dat past niet in een tabelcel van 150 pixels.
 */
export default function Ga4Koppeltabel() {
  const { filtered } = useCampagneFilters();
  const { koppelingen, tellingen, laden, fout } = useGa4Koppelingen();
  const [open, setOpen] = useState<Campagne | null>(null);

  // Zelfde volgorde als het tabblad Syntec: nieuwste startdatum eerst.
  const gesorteerd = useMemo(
    () => [...filtered].sort((a, b) => (b.startdatum ?? "").localeCompare(a.startdatum ?? "")),
    [filtered],
  );

  if (gesorteerd.length === 0) {
    return (
      <div className="rounded-panel border border-line bg-card px-6 py-10 text-center shadow-card">
        <p className="text-sm text-ink-muted">Geen campagnes gevonden voor deze filters.</p>
      </div>
    );
  }

  return (
    <>
      {fout && (
        <p className="mb-3 rounded-control border border-line bg-surface px-4 py-2 text-sm text-negative">{fout}</p>
      )}
      <div className="overflow-hidden rounded-panel border border-line bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-separate border-spacing-0 text-left">
            <colgroup>
              <col style={{ width: 260 }} />
              <col />
              <col style={{ width: 140 }} />
            </colgroup>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="label-theme sticky left-0 top-0 z-20 border-b border-r border-line bg-card px-4 py-3 text-label text-ink-faint"
                >
                  Campagne naam
                </th>
                <th
                  scope="col"
                  className="label-theme sticky top-0 z-10 border-b border-line bg-card px-4 py-3 text-label text-ink-faint"
                >
                  Gekoppelde GA4-events
                </th>
                <th
                  scope="col"
                  className="label-theme sticky top-0 z-10 border-b border-line bg-card px-4 py-3 text-right text-label text-ink-faint"
                >
                  GA conversies
                </th>
              </tr>
            </thead>
            <tbody>
              {gesorteerd.map((campagne) => {
                const regels = koppelingen[campagne.naam]?.regels ?? [];
                const telling = tellingen[campagne.naam];
                return (
                  <tr key={campagne.naam}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-b border-r border-line-soft bg-card px-4 py-3 text-left align-top text-xs font-medium text-ink"
                    >
                      {campagne.naam}
                    </th>
                    <td className="border-b border-line-soft px-4 py-3 align-top text-xs text-ink">
                      {regels.length === 0 ? (
                        <button
                          type="button"
                          disabled={laden}
                          onClick={() => setOpen(campagne)}
                          className="inline-flex items-center gap-1.5 rounded-control px-2 py-1 text-xs font-medium text-primary transition-colors duration-[var(--duur-snel)] hover:bg-surface disabled:opacity-50"
                        >
                          <IconPlus className="h-3.5 w-3.5" />
                          Koppel GA-events
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setOpen(campagne)}
                          title="Klik om de koppeling te bewerken"
                          className="group flex w-full items-start gap-2 rounded-control text-left"
                        >
                          <span className="flex min-w-0 flex-1 flex-col gap-1">
                            {regels.map((regel, i) => (
                              <span key={i} className="break-words leading-relaxed">
                                {i > 0 && <span className="mr-1 text-ink-faint">of</span>}
                                {omschrijfRegel(regel)}
                              </span>
                            ))}
                          </span>
                          <IconPencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint group-hover:text-ink" />
                        </button>
                      )}
                    </td>
                    <td className="border-b border-line-soft px-4 py-3 text-right align-top text-sm tabular-nums text-ink">
                      {regels.length === 0
                        ? <span className="text-ink-faint">—</span>
                        : telling
                          ? formatNumber(telling.totaal)
                          : <span className="text-ink-faint">{campagne.startdatum ? "…" : "geen startdatum"}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {open && <Ga4KoppelZijbalk campagne={open} onClose={() => setOpen(null)} />}
    </>
  );
}
