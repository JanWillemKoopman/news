"use client";

import Markdown from "@/components/chat/Markdown";
import AnalyseGrafiek from "@/components/marketingAnalyse/AnalyseGrafiek";
import {
  benchmarkOordeel,
  benchmarkSchaal,
  formatWaarde,
  vergelijkingVerschil,
  type BenchmarkOordeel,
  type VergelijkingOordeel,
} from "@/lib/marketingAnalyse/rekenen";
import type { Kerncijfer, Sectie, Tabel } from "@/lib/marketingAnalyse/types";

const BENCHMARK: Record<BenchmarkOordeel, { naam: string; tekst: string; stip: string }> = {
  beter: { naam: "Beter", tekst: "text-positive", stip: "bg-positive" },
  gemiddeld: { naam: "Gemiddeld", tekst: "text-ink-muted", stip: "bg-ink-muted" },
  slechter: { naam: "Slechter", tekst: "text-negative", stip: "bg-negative" },
};

/**
 * Hoe een kerncijfer zich verhoudt tot soortgelijke campagnes of posts (plan §20): een label en
 * een dunne balk. Het grijze vlak is de middelste helft van de vergelijkingsgroep, het streepje
 * de mediaan, de stip het cijfer zelf; rechts is altijd beter, ook bij kosten.
 */
function BenchmarkRegel({ cijfer }: { cijfer: Kerncijfer }) {
  const b = cijfer.benchmark;
  if (!b || typeof cijfer.waarde !== "number") return null;
  const oordeel = benchmarkOordeel(cijfer.waarde, b);
  if (!oordeel) return null;
  const schaal = benchmarkSchaal(cijfer.waarde, b);
  const stijl = BENCHMARK[oordeel];
  const uitleg = `Vergeleken met ${b.groep}. Mediaan ${formatWaarde(b.mediaan, cijfer.eenheid)}, middelste helft ${formatWaarde(b.p25, cijfer.eenheid)} tot ${formatWaarde(b.p75, cijfer.eenheid)}${b.hogerIsBeter === false ? " (lager is beter)" : ""}.`;
  return (
    <div className="mt-2.5 border-t border-line-soft pt-2" data-tip={uitleg}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={`shrink-0 text-meta font-semibold ${stijl.tekst}`}>{stijl.naam}</span>
        <span className="truncate text-meta tabular-nums text-ink-faint">mediaan {formatWaarde(b.mediaan, cijfer.eenheid)}</span>
      </div>
      <div className="relative mt-1.5 h-1.5 rounded-pill bg-surface" aria-hidden="true">
        <div className="absolute inset-y-0 rounded-pill bg-ink/15" style={{ left: `${schaal.bandVan}%`, width: `${schaal.bandTot - schaal.bandVan}%` }} />
        <div className="absolute -bottom-0.5 -top-0.5 w-px bg-ink/45" style={{ left: `${schaal.mediaan}%` }} />
        <div
          className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card ${stijl.stip}`}
          style={{ left: `${schaal.waarde}%` }}
        />
      </div>
      <p className="mt-1 truncate text-meta text-ink-faint">vs. {b.aantal} vergelijkbare</p>
      <p className="sr-only">{uitleg}</p>
    </div>
  );
}

const VERSCHIL: Record<VergelijkingOordeel, string> = {
  gunstig: "text-positive",
  ongunstig: "text-negative",
  neutraal: "text-ink",
};

/**
 * De regel onder een kerncijfer met een vergelijking: het verschil (in procenten, bij een
 * percentage in procentpunten) en het cijfer van de vorige periode. De kleur zegt "gunstig", niet
 * "hoger": bij kosten per lead is een daling goed nieuws, uitgaven krijgen geen kleur.
 */
function VergelijkingRegel({ cijfer }: { cijfer: Kerncijfer }) {
  const v = cijfer.vergelijking;
  if (!v) return null;
  const verschil = vergelijkingVerschil(cijfer.waarde, v, cijfer.eenheid);
  return (
    <p className="mt-0.5 text-meta tabular-nums text-ink-muted">
      {verschil && (
        <span className={`font-semibold ${VERSCHIL[verschil.oordeel]}`}>
          {verschil.tekst === "gelijk" ? "Gelijk" : verschil.tekst}
        </span>
      )}
      {verschil ? " t.o.v. " : ""}
      {v.label}: {formatWaarde(v.waarde, cijfer.eenheid)}
    </p>
  );
}

/** Eén rij kerncijfers: het cijfer groot, de toelichting en vergelijking eronder. */
export function KerncijferRij({ cijfers }: { cijfers: Kerncijfer[] }) {
  if (cijfers.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cijfers.map((c, i) => (
        <div key={`${c.label}-${i}`} className="rounded-card border border-line-soft bg-surface-tint px-4 py-3">
          <p className="label-theme text-label text-ink-faint">{c.label}</p>
          <p className="mt-1 font-sans-w7 text-xl font-bold tabular-nums text-ink">{formatWaarde(c.waarde, c.eenheid)}</p>
          <VergelijkingRegel cijfer={c} />
          {c.toelichting && <p className="mt-1 text-meta text-ink-muted">{c.toelichting}</p>}
          <BenchmarkRegel cijfer={c} />
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
