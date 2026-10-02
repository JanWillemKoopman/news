"use client";

import type { Blok, Criterium, InfoPunt, Niveau, Rapport } from "@/lib/landingspagina";

/**
 * Het auditrapport van één landingspagina, opgemaakt als een schoolrapport: bovenaan de
 * kop met het eindcijfer en hoe het model de campagne begreep, daaronder twee kolommen.
 * Links het verhaal (conclusie) en de top 5 verbeterpunten, rechts de cijfers per
 * criterium met de weging die het model voor deze campagne koos. Geen grafieken,
 * geen animaties. Puur weergave — alles komt uit het bewaarde rapport (lib/landingspagina.ts).
 * Oudere rapporten (zeven of tien criteria, zonder checklist en blokken) blijven leesbaar.
 */

/** Kleur volgt de schoolschaal: onvoldoende rood, 5,5-7 oranje, daarboven groen. */
export function scoreKleur(score: number) {
  if (score < 5.5) return { tekst: "text-negative", vlak: "bg-negative", zacht: "bg-negative/10" };
  if (score < 7) return { tekst: "text-orange", vlak: "bg-orange", zacht: "bg-orange/10" };
  return { tekst: "text-positive", vlak: "bg-positive", zacht: "bg-positive/10" };
}

function oordeel(score: number) {
  if (score < 4) return "Zeer zwak";
  if (score < 5.5) return "Onvoldoende";
  if (score < 7) return "Voldoende";
  if (score < 9) return "Goed";
  if (score < 10) return "Zeer goed";
  return "Uitmuntend";
}

export function formatCijfer(n: number) {
  return n.toLocaleString("nl-NL", { minimumFractionDigits: n % 1 ? 1 : 0, maximumFractionDigits: 1 });
}

export function formatDatum(iso: string) {
  return new Date(iso).toLocaleString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Op een rapport is alleen een onvoldoende rood; de rest staat gewoon in inkt. */
function cijferKleur(score: number) {
  return score < 5.5 ? "text-negative" : "text-ink";
}

function Kop({ children }: { children: React.ReactNode }) {
  return <h2 className="label-theme mb-4 text-label text-ink-muted">{children}</h2>;
}

const STATUS: Record<InfoPunt["status"], { teken: string; kleur: string }> = {
  duidelijk: { teken: "✓", kleur: "text-positive" },
  onduidelijk: { teken: "?", kleur: "text-orange" },
  ontbreekt: { teken: "✗", kleur: "text-negative" },
};

function Checklist({ punten }: { punten: InfoPunt[] }) {
  return (
    <ul className="mt-3 space-y-1.5">
      {punten.map((p, i) => (
        <li key={i} className="grid grid-cols-[1rem_1fr] gap-2 text-sm leading-snug">
          <span className={`font-semibold ${STATUS[p.status].kleur}`} aria-label={p.status}>
            {STATUS[p.status].teken}
          </span>
          <span>
            <span className="text-ink">{p.onderdeel}</span>
            {p.toelichting && <span className="text-ink-muted"> — {p.toelichting}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Overbodige blokken staan doorgestreept: dat is precies wat de marketeer moet schrappen. */
function Blokken({ blokken }: { blokken: Blok[] }) {
  return (
    <ul className="mt-3 space-y-1.5">
      {blokken.map((b, i) => (
        <li key={i} className="grid grid-cols-[5.5rem_1fr] gap-2 text-sm leading-snug">
          <span
            className={`text-meta ${b.oordeel === "overbodig" ? "text-negative" : b.oordeel === "kern" ? "text-ink-faint" : "text-orange"}`}
          >
            {b.oordeel}
          </span>
          <span>
            <span className={b.oordeel === "overbodig" ? "text-ink line-through decoration-negative/60" : "text-ink"}>
              {b.blok}
            </span>
            {b.reden && <span className="text-ink-muted"> — {b.reden}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function CriteriumRegel({ c, rapport }: { c: Criterium; rapport: Rapport }) {
  const gewicht = c.gewicht;
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-sm font-semibold text-ink">
          {c.nummer}. {c.naam}
          {gewicht !== undefined && <span className="ml-2 font-normal text-ink-faint">weegt {gewicht}%</span>}
        </h3>
        <span className={`font-sans-w7 text-xl font-semibold tabular-nums ${cijferKleur(c.score)}`}>
          {formatCijfer(c.score)}
        </span>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{c.beoordeling || c.korte_beoordeling}</p>
      {c.naam === "Informatie & bezwaren" && rapport.verwachte_informatie?.length ? (
        <Checklist punten={rapport.verwachte_informatie} />
      ) : null}
      {c.naam === "Focus & opbouw" && rapport.blokken?.length ? <Blokken blokken={rapport.blokken} /> : null}
    </li>
  );
}

function niveauTekst(p: { impact?: Niveau; inspanning?: Niveau }) {
  return [p.impact && `impact ${p.impact}`, p.inspanning && `inspanning ${p.inspanning}`]
    .filter(Boolean)
    .join(" · ");
}

export default function LandingspaginaRapport({
  rapport,
  geanalyseerdOp,
}: {
  rapport: Rapport;
  geanalyseerdOp: string;
}) {
  const eind = scoreKleur(rapport.eindcijfer);
  const gegevens: [string, string | null | undefined][] = [
    ["Campagne", rapport.campagnetype ?? rapport.type_pagina],
    ["Opgegeven doel", rapport.campagnecontext],
    ["Primaire actie", rapport.primaire_conversie],
    ["Bezoekers via", rapport.verkeersbron],
    ["Bezoeker", rapport.bezoeker],
    ["Screenshot", rapport.met_screenshot ? "Meegestuurd" : "Niet meegestuurd"],
    ["Geanalyseerd", formatDatum(geanalyseerdOp)],
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-panel border border-line bg-card px-7 py-6 shadow-subtle">
        <div className="flex items-start justify-between gap-10">
          <div className="min-w-0">
            <p className="label-theme text-label text-ink-muted">Landingpage-audit</p>
            <a
              href={rapport.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block truncate font-sans-w7 text-lg font-semibold text-ink hover:text-primary"
              title={rapport.url}
            >
              {rapport.url.replace(/^https?:\/\//, "")}
            </a>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
              {gegevens
                .filter(([, waarde]) => waarde)
                .map(([label, waarde]) => (
                  <div key={label} className="contents">
                    <dt className="text-ink-muted">{label}</dt>
                    <dd className="whitespace-pre-line text-ink">{waarde}</dd>
                  </div>
                ))}
            </dl>
          </div>
          <div className="w-44 shrink-0 text-center">
            <p className="label-theme text-label text-ink-muted">Eindcijfer</p>
            <p className={`font-sans-w7 text-6xl font-semibold leading-tight tabular-nums ${cijferKleur(rapport.eindcijfer)}`}>
              {formatCijfer(rapport.eindcijfer)}
            </p>
            <p className={`text-sm font-medium ${eind.tekst}`}>{oordeel(rapport.eindcijfer)}</p>
          </div>
        </div>
        {rapport.eindcijfer_toelichting && (
          <p className="mt-4 border-t border-line-soft pt-4 text-sm text-ink-muted">{rapport.eindcijfer_toelichting}</p>
        )}
      </section>

      <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)] items-start gap-6">
        <div className="space-y-6">
          <section className="rounded-panel border border-line bg-card px-7 py-6 shadow-subtle">
            <Kop>Conclusie</Kop>
            <p className="text-sm leading-relaxed text-ink">{rapport.conclusie}</p>
          </section>

          <section className="rounded-panel border border-line bg-card px-7 py-6 shadow-subtle">
            <Kop>Top 5 verbeterpunten</Kop>
            <ol className="space-y-4">
              {rapport.top_verbeterpunten.map((p, i) => (
                <li key={i} className="grid grid-cols-[1.5rem_1fr] gap-2">
                  <span className="text-sm font-semibold tabular-nums text-ink-muted">{i + 1}.</span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{p.titel}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{p.toelichting}</p>
                    {niveauTekst(p) && <p className="mt-1 text-meta text-ink-faint">{niveauTekst(p)}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section className="rounded-panel border border-line bg-card px-7 py-6 shadow-subtle">
          <Kop>Cijfers per criterium</Kop>
          {rapport.weging_toelichting && (
            <p className="mb-5 border-b border-line-soft pb-4 text-sm leading-relaxed text-ink-muted">
              <span className="font-medium text-ink">Weging. </span>
              {rapport.weging_toelichting}
            </p>
          )}
          <ul className="divide-y divide-line-soft">
            {rapport.criteria.map((c) => (
              <CriteriumRegel key={c.nummer} c={c} rapport={rapport} />
            ))}
          </ul>
          <div className="mt-4 flex items-baseline justify-between border-t-2 border-line pt-4">
            <span className="text-sm font-semibold text-ink">
              Eindcijfer
              {rapport.weging_toelichting && (
                <span className="ml-2 font-normal text-ink-faint">eindoordeel, met de weging als leidraad</span>
              )}
            </span>
            <span className={`font-sans-w7 text-xl font-semibold tabular-nums ${cijferKleur(rapport.eindcijfer)}`}>
              {formatCijfer(rapport.eindcijfer)}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
