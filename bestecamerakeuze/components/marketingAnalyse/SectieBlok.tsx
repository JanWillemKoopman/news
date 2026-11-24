"use client";

import Markdown from "@/components/chat/Markdown";
import AnalyseGrafiek from "@/components/marketingAnalyse/AnalyseGrafiek";
import { formatWaarde } from "@/lib/marketingAnalyse/rekenen";
import type { Kerncijfer, Sectie, Tabel } from "@/lib/marketingAnalyse/types";

/** Eén rij kerncijfers: het cijfer groot, de toelichting en vergelijking eronder. */
export function KerncijferRij({ cijfers }: { cijfers: Kerncijfer[] }) {
  if (cijfers.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cijfers.map((c, i) => (
        <div key={`${c.label}-${i}`} className="rounded-card border border-line-soft bg-surface-tint px-4 py-3">
          <p className="label-theme text-label text-ink-faint">{c.label}</p>
          <p className="mt-1 font-sans-w7 text-xl font-bold tabular-nums text-ink">{formatWaarde(c.waarde, c.eenheid)}</p>
          {c.vergelijking && (
            <p className="mt-0.5 text-meta tabular-nums text-ink-muted">
              {c.vergelijking.label}: {formatWaarde(c.vergelijking.waarde, c.eenheid)}
            </p>
          )}
          {c.toelichting && <p className="mt-1 text-meta text-ink-muted">{c.toelichting}</p>}
        </div>
      ))}
    </div>
  );
}

/** Een tabel uit de analyse: getallen rechts uitgelijnd in de eenheid van hun kolom. */
export function AnalyseTabel({ tabel }: { tabel: Tabel }) {
  const cel = (waarde: string | number | null, k: number) => {
    const kolom = tabel.kolommen[k];
    const getal = typeof waarde === "number";
    // Een getallenkolom lijnt rechts uit, ook een cel met tekst als "n.v.t.".
    const rechts = getal || (k > 0 && kolom?.eenheid !== undefined && kolom.eenheid !== "tekst");
    return (
      <td
        key={k}
        className={`px-3 py-2 ${rechts ? "text-right tabular-nums" : ""} ${k === 0 ? "font-medium text-ink" : getal ? "text-ink" : "text-ink-muted"}`}
      >
        {getal ? formatWaarde(waarde, kolom?.eenheid ?? "aantal") : (waarde ?? "—")}
      </td>
    );
  };
  return (
    <div>
      {tabel.titel && <p className="mb-2 text-sm font-semibold text-ink">{tabel.titel}</p>}
      <div className="overflow-x-auto rounded-card border border-line-soft">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {tabel.kolommen.map((k, i) => (
                <th
                  key={i}
                  className={`label-theme border-b border-line-soft bg-surface-tint px-3 py-2 text-label font-normal text-ink-faint ${
                    i === 0 || k.eenheid === "tekst" ? "text-left" : "text-right"
                  }`}
                >
                  {k.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr:not(:last-child)_td]:border-b [&_td]:border-line-soft">
            {tabel.rijen.map((rij, r) => (
              <tr key={r}>{rij.map((w, k) => cel(w, k))}</tr>
            ))}
          </tbody>
          {tabel.totaal && (
            <tfoot>
              <tr className="font-semibold [&_td]:border-t [&_td]:border-line">{tabel.totaal.map((w, k) => cel(w, k))}</tr>
            </tfoot>
          )}
        </table>
      </div>
      {tabel.voetnoot && <p className="mt-1.5 text-meta text-ink-faint">{tabel.voetnoot}</p>}
    </div>
  );
}

/**
 * De linkerkant (3/4) van een tabblad: kop, kerncijfers, de leeswijzer, grafieken en tabellen.
 * Alle blokken zijn optioneel; de prompt bepaalt welke een sectie gebruikt. Bevindingen en
 * acties staan niet hier maar in de rechterkolom van het tabblad.
 */
export default function SectieBlok({ sectie }: { sectie: Sectie }) {
  return (
    <section className="rounded-panel border border-line bg-card shadow-subtle">
      <header className="border-b border-line-soft px-6 py-4">
        <h3 className="font-sans-w7 text-base font-bold text-ink">{sectie.titel}</h3>
        {sectie.ondertitel && <p className="mt-0.5 text-meta text-ink-muted">{sectie.ondertitel}</p>}
      </header>
      <div className="flex flex-col gap-5 px-6 py-5">
        {sectie.kerncijfers && <KerncijferRij cijfers={sectie.kerncijfers} />}
        {sectie.tekst && (
          <div className="max-w-[90ch] text-sm text-ink-muted">
            <Markdown tekst={sectie.tekst} />
          </div>
        )}
        {sectie.grafieken && sectie.grafieken.length > 0 && (
          <div className={`grid gap-4 ${sectie.grafieken.length > 1 ? "xl:grid-cols-2" : ""}`}>
            {sectie.grafieken.map((g, i) => (
              <AnalyseGrafiek key={i} grafiek={g} />
            ))}
          </div>
        )}
        {sectie.tabellen?.map((t, i) => <AnalyseTabel key={i} tabel={t} />)}
      </div>
    </section>
  );
}
