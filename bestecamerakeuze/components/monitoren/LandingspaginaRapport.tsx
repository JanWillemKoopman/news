"use client";

import type { Criterium, Niveau, Rapport } from "@/lib/landingspagina";

/**
 * Het auditrapport van één landingspagina: kop met eindcijfer, samenvatting, scorecard,
 * de tien criteria uitgewerkt, top 5 verbeterpunten en de conclusie. Puur weergave —
 * alles komt uit het bewaarde rapport (lib/landingspagina.ts → Rapport).
 */

/** Kleur volgt de beoordelingsschaal uit de prompt: onvoldoende rood, 5-6 oranje, 7+ groen. */
export function scoreKleur(score: number) {
  if (score < 5.5) return { tekst: "text-negative", vlak: "bg-negative", zacht: "bg-negative/10" };
  if (score < 7) return { tekst: "text-orange", vlak: "bg-orange", zacht: "bg-orange/10" };
  return { tekst: "text-positive", vlak: "bg-positive", zacht: "bg-positive/10" };
}

function oordeel(score: number) {
  if (score < 3) return "Zeer zwak";
  if (score < 5) return "Zwak";
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

function Sectie({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="rounded-panel border border-line bg-card px-7 py-6 shadow-subtle">
      <h2 className="label-theme mb-4 text-label text-ink-muted">{titel}</h2>
      {children}
    </section>
  );
}

function ScoreChip({ score, groot = false }: { score: number; groot?: boolean }) {
  const kleur = scoreKleur(score);
  return (
    <span
      className={`inline-flex shrink-0 items-baseline rounded-control px-2.5 py-1 font-sans-w7 font-semibold tabular-nums ${kleur.zacht} ${kleur.tekst} ${groot ? "text-base" : "text-sm"}`}
    >
      {formatCijfer(score)}
      <span className="ml-0.5 text-xs font-normal opacity-70">/10</span>
    </span>
  );
}

function ScoreBalk({ score }: { score: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-pill bg-progress-track">
      <div className={`h-full rounded-pill ${scoreKleur(score).vlak}`} style={{ width: `${score * 10}%` }} />
    </div>
  );
}

/**
 * Splitst lopende tekst in zinnen voor een opsomming. Alleen splitsen na . ! of ? gevolgd
 * door een spatie en een hoofdletter/cijfer, zodat "bijv. een" of "t/m" heel blijft.
 */
function zinnen(tekst: string): string[] {
  return tekst
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý0-9"'“‘])/)
    .map((z) => z.trim())
    .filter(Boolean);
}

/** Klein label voor impact/inspanning; groen = gunstig (hoge impact, lage inspanning). */
function NiveauLabel({ label, niveau, hoogIsGoed }: { label: string; niveau: Niveau; hoogIsGoed: boolean }) {
  const gunstig = hoogIsGoed ? niveau === "hoog" : niveau === "laag";
  const ongunstig = hoogIsGoed ? niveau === "laag" : niveau === "hoog";
  const kleur = gunstig
    ? "bg-positive/10 text-positive"
    : ongunstig
      ? "bg-surface text-ink-muted"
      : "bg-orange/10 text-orange";
  return (
    <span className={`rounded-control px-2 py-0.5 text-meta ${kleur}`}>
      {label} {niveau}
    </span>
  );
}

function Alinea({ tekst }: { tekst: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-ink">
      {tekst
        .split(/\n+/)
        .filter((r) => r.trim())
        .map((regel, i) => (
          <p key={i}>{regel}</p>
        ))}
    </div>
  );
}

function CriteriumKaart({ c }: { c: Criterium }) {
  return (
    <article id={`criterium-${c.nummer}`} className="rounded-panel border border-line bg-card px-7 py-6 shadow-subtle">
      <header className="mb-4 flex items-start justify-between gap-6">
        <div>
          <p className="text-meta text-ink-faint">Criterium {c.nummer}</p>
          <h3 className="font-sans-w7 text-base font-semibold text-ink">{c.naam}</h3>
        </div>
        <ScoreChip score={c.score} groot />
      </header>

      <Alinea tekst={c.beoordeling} />

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="rounded-card border-l-2 border-positive bg-surface px-4 py-3">
          <p className="label-theme mb-1.5 text-label text-positive">Wat gaat goed</p>
          <Alinea tekst={c.wat_goed_gaat} />
        </div>
        <div className="rounded-card border-l-2 border-negative bg-surface px-4 py-3">
          <p className="label-theme mb-1.5 text-label text-negative">Wat kan beter</p>
          <Alinea tekst={c.wat_beter_kan} />
        </div>
      </div>

      {c.concreet_advies.trim() && (
        <div className="mt-4 rounded-card bg-surface-tint px-4 py-3">
          <p className="label-theme mb-1.5 text-label text-ink-muted">Concreet advies</p>
          <Alinea tekst={c.concreet_advies} />
        </div>
      )}
    </article>
  );
}

export default function LandingspaginaRapport({
  rapport,
  geanalyseerdOp,
}: {
  rapport: Rapport;
  geanalyseerdOp: string;
}) {
  const eind = scoreKleur(rapport.eindcijfer);
  const samenvatting: [string, string, string][] = [
    ["Wat gaat goed", rapport.samenvatting.wat_gaat_goed, "bg-positive"],
    ["Wat gaat minder goed", rapport.samenvatting.wat_gaat_minder_goed, "bg-negative"],
    ["Grootste conversierisico", rapport.samenvatting.grootste_conversierisico, "bg-negative"],
    ["Belangrijkste kans", rapport.samenvatting.belangrijkste_kans, "bg-positive"],
    ["Eerst aanpakken", rapport.samenvatting.eerst_aanpakken, "bg-primary"],
  ];

  return (
    <div className="space-y-6">
      {/* Kop: welke pagina, wanneer, en het eindcijfer */}
      <section className="kaart-accent kaart-omlijst rounded-panel border border-line bg-card px-7 py-6 shadow-card">
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
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
              <dt className="text-ink-muted">Type pagina</dt>
              <dd className="text-ink">{rapport.type_pagina}</dd>
              <dt className="text-ink-muted">Primaire conversie</dt>
              <dd className="text-ink">{rapport.primaire_conversie}</dd>
              <dt className="text-ink-muted">Campagnecontext</dt>
              <dd className={rapport.campagnecontext ? "whitespace-pre-line text-ink" : "text-ink-faint"}>
                {rapport.campagnecontext || "Niet meegegeven — message match alleen op de pagina zelf beoordeeld"}
              </dd>
              <dt className="text-ink-muted">Geanalyseerd</dt>
              <dd className="text-ink">
                {formatDatum(geanalyseerdOp)}
              </dd>
            </dl>
          </div>
          <div className={`flex w-40 shrink-0 flex-col items-center rounded-card px-5 py-4 ${eind.zacht}`}>
            <p className="label-theme text-label text-ink-muted">Eindcijfer</p>
            <p className={`font-sans-w7 text-5xl font-semibold leading-tight tabular-nums ${eind.tekst}`}>
              {formatCijfer(rapport.eindcijfer)}
            </p>
            <p className={`text-sm font-medium ${eind.tekst}`}>{oordeel(rapport.eindcijfer)}</p>
          </div>
        </div>
      </section>

      <Sectie titel="Conclusie en samenvatting">
        {/* De conclusie eerst, als losse punten: het antwoord op "is deze pagina klaar
            voor betaald verkeer?" hoort bovenaan, niet als blok tekst onderaan. */}
        <ul className="mb-5 space-y-2 border-b border-line-soft pb-5">
          {zinnen(rapport.conclusie).map((zin, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-muted" />
              <span>{zin}</span>
            </li>
          ))}
        </ul>
        <ul className="divide-y divide-line-soft">
          {samenvatting.map(([label, tekst, stip]) => (
            <li key={label} className="grid grid-cols-[14rem_1fr] gap-6 py-3 first:pt-0 last:pb-0">
              <span className="flex items-center gap-2 text-sm font-medium text-ink">
                <span className={`h-2 w-2 shrink-0 rounded-full ${stip}`} />
                {label}
              </span>
              <span className="text-sm leading-relaxed text-ink">{tekst}</span>
            </li>
          ))}
        </ul>
      </Sectie>

      <Sectie titel="Scorecard">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-line-soft">
            {rapport.criteria.map((c) => (
              <tr key={c.nummer}>
                <td className="w-64 py-2.5 pr-4 align-middle">
                  {/* Geen #-link: de URL draagt al de stand van de kanaalpagina's (urlstand). */}
                  <button
                    type="button"
                    onClick={() =>
                      document
                        .getElementById(`criterium-${c.nummer}`)
                        ?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                    className="text-left text-ink hover:text-primary"
                  >
                    <span className="mr-2 text-ink-faint tabular-nums">{c.nummer}.</span>
                    {c.naam}
                  </button>
                </td>
                <td className="w-40 py-2.5 pr-4 align-middle">
                  <ScoreBalk score={c.score} />
                </td>
                <td className="w-20 py-2.5 pr-4 align-middle">
                  <ScoreChip score={c.score} />
                </td>
                <td className="py-2.5 align-middle text-ink-muted">{c.korte_beoordeling}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Sectie>

      <div className="space-y-4">
        {rapport.criteria.map((c) => (
          <CriteriumKaart key={c.nummer} c={c} />
        ))}
      </div>

      <Sectie titel="Eindcijfer">
        <div className="flex items-start gap-6">
          <ScoreChip score={rapport.eindcijfer} groot />
          <Alinea tekst={rapport.eindcijfer_toelichting} />
        </div>
      </Sectie>

      <Sectie titel="Top 5 verbeterpunten">
        <ol className="space-y-4">
          {rapport.top_verbeterpunten.map((p, i) => (
            <li key={i} className="grid grid-cols-[2rem_1fr] gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary tabular-nums">
                {i + 1}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-sans-w7 text-sm font-semibold text-ink">{p.titel}</p>
                  {p.impact && <NiveauLabel label="Impact" niveau={p.impact} hoogIsGoed />}
                  {p.inspanning && <NiveauLabel label="Inspanning" niveau={p.inspanning} hoogIsGoed={false} />}
                </div>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{p.toelichting}</p>
              </div>
            </li>
          ))}
        </ol>
      </Sectie>

    </div>
  );
}
