"use client";

import { useMemo, useState } from "react";
import Markdown from "@/components/chat/Markdown";
import { IconCheck, IconChevronDown, IconClose, IconInfo } from "@/components/icons";
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

/**
 * H9: hoeveel tegels er naast elkaar staan, zodat er geen gaten vallen: 5 of 6 tegels in rijen van
 * drie, 7 of 8 in rijen van vier. De laatste rij rekt op (flex-grow), dus ook bij 7 is hij vol.
 */
function tegelsPerRij(n: number): number {
  if (n <= 4) return n;
  if (n <= 6) return 3;
  return 4;
}

/**
 * H8: een kerncijfer dat tekst is in plaats van een getal ("4. Vacatures - Schade Functies - Leads").
 * Begint de toelichting met een bedrag of aantal ("€ 723, 6 leads"), dan staat dat groot en de naam
 * klein erboven; anders staat de tekst in een kleinere letter, niet in het cijferlettertype.
 */
function TekstCijfer({ c }: { c: Kerncijfer }) {
  const m = c.toelichting?.match(/^\s*((?:€\s?)?\d[\d.]*(?:,\d+)?%?)\s*[,·]?\s*(.*)$/);
  if (m) {
    return (
      <>
        <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-ink" data-tip={String(c.waarde)}>
          {c.waarde}
        </p>
        <p className="mt-0.5 font-sans-w7 text-xl font-bold tabular-nums text-ink">{m[1]}</p>
        {m[2] && <p className="mt-0.5 text-meta text-ink-muted">{m[2]}</p>}
      </>
    );
  }
  return (
    <>
      <p className="mt-1 text-base font-semibold leading-snug text-ink">{c.waarde}</p>
      {c.toelichting && <p className="mt-1 text-meta text-ink-muted">{c.toelichting}</p>}
    </>
  );
}

/** Eén rij kerncijfers: het cijfer groot, de toelichting en vergelijking eronder. */
export function KerncijferRij({ cijfers }: { cijfers: Kerncijfer[] }) {
  if (cijfers.length === 0) return null;
  const perRij = tegelsPerRij(cijfers.length);
  const basis = `calc(${100 / perRij}% - ${(12 * (perRij - 1)) / perRij}px)`;
  return (
    <div className="flex flex-wrap gap-3">
      {cijfers.map((c, i) => {
        // H8: "Niet gemeten" is een waarschuwing, geen cijfer.
        const nietGemeten = /niet gemeten/i.test(c.label);
        const tekst = typeof c.waarde === "string";
        return (
          <div
            key={`${c.label}-${i}`}
            style={{ flex: `1 1 ${basis}` }}
            className={`min-w-0 rounded-card border px-4 py-3 ${
              nietGemeten ? "border-orange/30 bg-orange/[0.06]" : "border-line-soft bg-surface-tint"
            }`}
          >
            <p className={`label-theme flex items-center gap-1.5 text-label ${nietGemeten ? "text-orange-dark" : "text-ink-faint"}`}>
              {nietGemeten && <IconInfo className="h-3.5 w-3.5 shrink-0" />}
              {c.label}
            </p>
            {nietGemeten ? (
              <>
                <p className="mt-1 text-sm font-semibold leading-snug text-ink">{formatWaarde(c.waarde, c.eenheid)}</p>
                {c.toelichting && <p className="mt-1 text-meta text-ink-muted">{c.toelichting}</p>}
              </>
            ) : tekst ? (
              <TekstCijfer c={c} />
            ) : (
              <>
                <p className="mt-1 font-sans-w7 text-xl font-bold tabular-nums text-ink">{formatWaarde(c.waarde, c.eenheid)}</p>
                <VergelijkingRegel cijfer={c} />
                {c.toelichting && <p className="mt-1 text-meta text-ink-muted">{c.toelichting}</p>}
              </>
            )}
            <BenchmarkRegel cijfer={c} />
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabellen
// ---------------------------------------------------------------------------

type Cel = string | number | null;
type Richting = "hoger" | "lager" | "neutraal";

/**
 * H5: welke kant is goed voor het verschil in deze rij? Kosten per lead (of per sollicitatie, per
 * klik): lager is beter. Uitgaven en andere bedragen: geen oordeel. De rest (leads, sollicitaties,
 * sessies, weergaven): hoger is beter.
 */
function richtingVoor(rij: Cel[], kolommen: Tabel["kolommen"], verschilKolom: number): Richting {
  const label = typeof rij[0] === "string" ? rij[0] : "";
  if (/kosten per|per lead|per sollicitatie|per klik|\bcpl\b|\bcpc\b/i.test(label)) return "lager";
  if (/uitgaven|waarvan|budget|kosten/i.test(label)) return "neutraal";
  const ervoor = kolommen[verschilKolom - 1];
  if (ervoor?.eenheid === "euro" || /uitgaven/i.test(ervoor?.label ?? "")) return "neutraal";
  return "hoger";
}

/** Het teken van een verschil: "+23%", "−3,7%", 0,23 of "gelijk"/"n.v.t." (geen teken). */
function tekenVan(w: Cel): 1 | -1 | 0 {
  if (typeof w === "number") return w > 0 ? 1 : w < 0 ? -1 : 0;
  if (typeof w !== "string") return 0;
  if (/^\s*\+\s*\d/.test(w)) return 1;
  if (/^\s*[−-]\s*\d/.test(w)) return -1;
  return 0;
}

function verschilKleur(w: Cel, richting: Richting): string {
  const t = tekenVan(w);
  if (t === 0 || richting === "neutraal") return "";
  const goed = richting === "hoger" ? t > 0 : t < 0;
  return goed ? "text-positive font-medium" : "text-negative font-medium";
}

const isSubtotaal = (rij: Cel[]) => typeof rij[0] === "string" && /^subtotaal\b/i.test(rij[0]);
const isTotaal = (rij: Cel[]) => typeof rij[0] === "string" && /^totaal\b/i.test(rij[0]);

function mediaan(waarden: number[]): number | null {
  if (waarden.length === 0) return null;
  const s = [...waarden].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Zoveel rijen staan er standaard; een langere tabel klapt open met "Toon alle" (H7). */
const EERSTE_RIJEN = 10;
const LANG_VANAF = 13;

/** Een tabel uit de analyse: getallen rechts uitgelijnd in de eenheid van hun kolom. */
export function AnalyseTabel({ tabel, verbergTitel = false }: { tabel: Tabel; verbergTitel?: boolean }) {
  const [alles, setAlles] = useState(false);
  const [sortering, setSortering] = useState<{ kolom: number; op: 1 | -1 } | null>(null);
  const k = tabel.kolommen;

  // H11: Cluster en Bedrijf in één kolom ("PGZ · Porsche Groep Zuid"), zodat een rij op één regel past.
  const clusterKolom = k.findIndex((x) => /^cluster$/i.test(x.label.trim()));
  const bedrijfKolom = k.findIndex((x) => /^bedrijf$/i.test(x.label.trim()));
  const samenvoegen = clusterKolom > 0 && bedrijfKolom > 0;
  const zichtbaar = k.map((_, i) => i).filter((i) => !(samenvoegen && i === clusterKolom));

  const verschilKolommen = new Set(k.map((x, i) => (/^verschil/i.test(x.label.trim()) ? i : -1)).filter((i) => i >= 0));
  const heeftGroepen = tabel.rijen.some((r) => isSubtotaal(r) || isTotaal(r));

  // H12: uitschieters. Kosten per lead boven 2,5 keer de mediaan en campagnes met uitgaven maar 0 leads.
  const perLeadKolom = k.findIndex((x) => /^per lead$/i.test(x.label.trim()));
  const leadsKolom = k.findIndex((x) => /^leads$/i.test(x.label.trim()));
  const uitgavenKolom = k.findIndex((x) => /^uitgaven$/i.test(x.label.trim()));
  const perLeadMediaan =
    perLeadKolom >= 0 ? mediaan(tabel.rijen.map((r) => r[perLeadKolom]).filter((w): w is number => typeof w === "number" && w > 0)) : null;
  const zonderLeads = (r: Cel[]) =>
    leadsKolom >= 0 && r[leadsKolom] === 0 && (uitgavenKolom < 0 || (typeof r[uitgavenKolom] === "number" && (r[uitgavenKolom] as number) > 0));

  // H7: sorteren op een kolom (niet in een tabel met subtotalen: dan valt de opbouw uit elkaar).
  const rijen = useMemo(() => {
    if (!sortering || heeftGroepen) return tabel.rijen;
    const { kolom, op } = sortering;
    return [...tabel.rijen].sort((a, b) => {
      const x = a[kolom];
      const y = b[kolom];
      if (typeof x === "number" && typeof y === "number") return (x - y) * op;
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      return String(x).localeCompare(String(y), "nl") * op;
    });
  }, [tabel.rijen, sortering, heeftGroepen]);
  const lang = rijen.length >= LANG_VANAF;
  const getoond = lang && !alles ? rijen.slice(0, EERSTE_RIJEN) : rijen;

  const cel = (rij: Cel[], i: number, nadruk: boolean) => {
    const waarde = rij[i];
    const kolom = k[i];
    const getal = typeof waarde === "number";
    // Een getallenkolom lijnt rechts uit, ook een cel met tekst als "n.v.t.".
    const rechts = getal || (i > 0 && kolom?.eenheid !== undefined && kolom.eenheid !== "tekst");
    let inhoud: React.ReactNode = getal ? formatWaarde(waarde, kolom?.eenheid ?? "aantal") : (waarde ?? "—");
    let kleur = i === 0 ? "font-medium text-ink" : getal ? "text-ink" : "text-ink-muted";
    // H19: een nul is geen nieuws; lichter, zodat de echte waarden opvallen.
    if (getal && waarde === 0) kleur = "text-ink-faint";
    if (verschilKolommen.has(i)) kleur = `${kleur} ${verschilKleur(waarde, richtingVoor(rij, k, i))}`;
    // H14: Ja/Nee als vinkje of kruisje.
    if (typeof waarde === "string" && /^(ja|nee)$/i.test(waarde.trim())) {
      const ja = /^ja$/i.test(waarde.trim());
      inhoud = (
        <span className={`inline-flex items-center gap-1.5 ${ja ? "text-positive" : "text-orange-dark"}`}>
          {ja ? <IconCheck className="h-3.5 w-3.5" /> : <IconClose className="h-3.5 w-3.5" />}
          {ja ? "Ja" : "Nee"}
        </span>
      );
    }
    if (samenvoegen && i === bedrijfKolom) {
      const cluster = rij[clusterKolom];
      if (cluster && String(cluster) !== String(waarde)) {
        inhoud = (
          <>
            <span className="text-ink-faint">{cluster} · </span>
            {inhoud}
          </>
        );
      }
    }
    if (i === perLeadKolom && getal && perLeadMediaan !== null && (waarde as number) > 2.5 * perLeadMediaan) {
      kleur = "font-semibold text-negative";
    }
    if (i === leadsKolom && zonderLeads(rij)) kleur = "font-semibold text-orange-dark";
    return (
      <td
        key={i}
        className={`px-3 py-2 ${rechts ? "text-right tabular-nums" : ""} ${i === 0 ? "min-w-[14rem]" : "whitespace-nowrap"} ${kleur} ${
          nadruk ? "font-semibold" : ""
        }`}
      >
        {inhoud}
      </td>
    );
  };

  const kop = (i: number) => {
    const x = k[i];
    const links = i === 0 || x.eenheid === "tekst" || (samenvoegen && i === bedrijfKolom);
    const kan = !heeftGroepen && rijen.length > 3;
    const actief = sortering?.kolom === i;
    const label = samenvoegen && i === bedrijfKolom ? "Bedrijf" : x.label;
    return (
      <th
        key={i}
        aria-sort={actief ? (sortering?.op === 1 ? "ascending" : "descending") : undefined}
        className={`label-theme sticky top-0 z-10 border-b border-line-soft bg-surface-tint px-3 py-2 text-label font-normal text-ink-faint ${
          label.length <= 14 ? "whitespace-nowrap" : ""
        } ${
          links ? "text-left" : "text-right"
        }`}
      >
        {kan ? (
          <button
            type="button"
            onClick={() =>
              setSortering((s) => (s?.kolom === i ? (s.op === -1 ? { kolom: i, op: 1 } : null) : { kolom: i, op: x.eenheid === "tekst" || i === 0 ? 1 : -1 }))
            }
            className={`inline-flex items-center gap-1 [text-transform:inherit] transition-colors hover:text-ink ${actief ? "text-ink" : ""} ${links ? "" : "flex-row-reverse"}`}
          >
            {label}
            <span aria-hidden="true" className={`text-[9px] ${actief ? "opacity-100" : "opacity-0"}`}>
              {sortering?.op === 1 ? "▲" : "▼"}
            </span>
          </button>
        ) : (
          label
        )}
      </th>
    );
  };

  return (
    <div>
      {tabel.titel && !verbergTitel && <p className="mb-2 text-sm font-semibold text-ink">{tabel.titel}</p>}
      <div className={`overflow-x-auto rounded-card border border-line-soft ${lang && alles ? "max-h-[70vh] overflow-y-auto" : ""}`}>
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>{zichtbaar.map((i) => kop(i))}</tr>
          </thead>
          <tbody className="[&_tr:not(:last-child)_td]:border-b [&_td]:border-line-soft">
            {getoond.map((rij, r) => {
              // H10: subtotalen en een totaalregel herkenbaar: halfvet met een licht vlak, en een
              // lijn boven het totaal.
              const sub = isSubtotaal(rij);
              const tot = isTotaal(rij);
              return (
                <tr
                  key={r}
                  className={`${sub ? "bg-surface-tint" : ""} ${tot ? "bg-surface-tint [&_td]:border-t [&_td]:!border-t-line" : ""} ${
                    zonderLeads(rij) ? "bg-orange/[0.05]" : ""
                  }`}
                >
                  {zichtbaar.map((i) => cel(rij, i, sub || tot))}
                </tr>
              );
            })}
          </tbody>
          {tabel.totaal && (
            <tfoot>
              <tr className="bg-surface-tint font-semibold [&_td]:border-t [&_td]:border-line">{zichtbaar.map((i) => cel(tabel.totaal!, i, true))}</tr>
            </tfoot>
          )}
        </table>
      </div>
      {lang && (
        <button
          type="button"
          onClick={() => setAlles((x) => !x)}
          aria-expanded={alles}
          className="mt-2 inline-flex items-center gap-1.5 rounded-button px-2 py-1 -ml-2 text-sm font-medium text-ink-muted transition-colors duration-[var(--duur-snel)] ease-merk hover:bg-surface hover:text-ink"
        >
          <IconChevronDown className={`h-4 w-4 transition-transform duration-[var(--duur-snel)] ${alles ? "rotate-180" : ""}`} />
          {alles ? "Toon minder" : `Toon alle ${rijen.length} rijen`}
        </button>
      )}
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
