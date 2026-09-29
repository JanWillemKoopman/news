"use client";

import type { Criterium, Niveau, Rapport } from "@/lib/landingspagina";
import ScoreMatrix from "./ScoreMatrix";
import { useTween } from "./useTween";

/**
 * Het auditrapport van één landingspagina: kop met eindcijfer, top 5 verbeterpunten, de
 * scorematrix (score tegen potentie), de zeven criteria in één of twee zinnen, en daaronder
 * conclusie, samenvatting en toelichting op het eindcijfer. Puur weergave —
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

/** `volgorde` bepaalt hoe laat de sectie omhoog schuift; ze komen één voor één in beeld. */
function Sectie({ titel, volgorde, children }: { titel: string; volgorde: number; children: React.ReactNode }) {
  return (
    <section
      className="rapport-in rounded-panel border border-line bg-card px-7 py-6 shadow-subtle"
      style={{ ["--i" as string]: volgorde }}
    >
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

function CriteriumRegel({ c }: { c: Criterium }) {
  const winst = (c.potentie ?? c.score) - c.score;
  return (
    <li id={`criterium-${c.nummer}`} className="grid scroll-mt-6 grid-cols-[15rem_1fr] gap-6 py-4 first:pt-0 last:pb-0">
      <div>
        <p className="text-meta text-ink-faint">Criterium {c.nummer}</p>
        <h3 className="font-sans-w7 text-sm font-semibold text-ink">{c.naam}</h3>
        <div className="mt-2 flex items-center gap-2">
          <ScoreChip score={c.score} />
          {winst > 0 && c.potentie !== undefined && (
            <span className="text-meta tabular-nums text-ink-muted">
              → {formatCijfer(c.potentie)} <span className="text-positive">+{winst}</span>
            </span>
          )}
        </div>
      </div>
      <div>
        <Alinea tekst={c.beoordeling} />
        {/* Oudere rapporten (tien criteria) hadden nog een apart veld voor wat beter kan. */}
        {c.wat_beter_kan?.trim() && (
          <div className="mt-3 rounded-card border-l-2 border-negative bg-surface px-4 py-3">
            <p className="label-theme mb-1.5 text-label text-negative">Wat kan beter</p>
            <Alinea tekst={c.wat_beter_kan} />
          </div>
        )}
      </div>
    </li>
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
  // Het eindcijfer telt op vanaf nul; de rest van de pagina schuift er één voor één achteraan.
  const getoondEind = Math.round(useTween(rapport.eindcijfer, 1100) * 10) / 10;
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
      <section className="rapport-in kaart-accent kaart-omlijst rounded-panel border border-line bg-card px-7 py-6 shadow-card">
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
              <dt className="text-ink-muted">Screenshot</dt>
              <dd className={rapport.met_screenshot ? "text-ink" : "text-ink-faint"}>
                {rapport.met_screenshot
                  ? "Meegestuurd — ook visueel beoordeeld"
                  : "Niet meegestuurd — alleen op tekst en structuur beoordeeld"}
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
              {formatCijfer(getoondEind)}
            </p>
            <p className={`text-sm font-medium ${eind.tekst}`}>{oordeel(rapport.eindcijfer)}</p>
          </div>
        </div>
      </section>

      <Sectie titel="Top 5 verbeterpunten" volgorde={1}>
        <ol className="space-y-1.5">
          {rapport.top_verbeterpunten.map((p, i) => (
            <li
              key={i}
              className="rapport-in group grid grid-cols-[2rem_1fr] gap-3 rounded-card px-2 py-1.5 duration-[var(--duur-snel)] ease-merk transition-[background-color,transform] hover:translate-x-0.5 hover:bg-surface-tint"
              style={{ ["--i" as string]: i + 3 }}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary tabular-nums duration-[var(--duur-snel)] ease-merk transition-transform group-hover:scale-110">
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

      <Sectie titel="Scorematrix" volgorde={2}>
        <ScoreMatrix criteria={rapport.criteria} />
      </Sectie>

      <Sectie titel="Per criterium" volgorde={3}>
        <ul className="divide-y divide-line-soft">
          {rapport.criteria.map((c) => (
            <CriteriumRegel key={c.nummer} c={c} />
          ))}
        </ul>
      </Sectie>

      <Sectie titel="Conclusie en samenvatting" volgorde={4}>
        {/* De conclusie eerst, als losse punten: het antwoord op "is deze pagina klaar
            voor betaald verkeer?", daarna de samenvatting in vijf regels. */}
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

      <Sectie titel="Eindcijfer" volgorde={5}>
        <div className="flex items-start gap-6">
          <ScoreChip score={rapport.eindcijfer} groot />
          <Alinea tekst={rapport.eindcijfer_toelichting} />
        </div>
      </Sectie>

    </div>
  );
}
