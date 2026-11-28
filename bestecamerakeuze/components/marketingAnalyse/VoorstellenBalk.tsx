"use client";

import { Fragment, useState } from "react";
import { getBrandLogo } from "@/components/brandLogos";
import { IconChevronDown, IconLink } from "@/components/icons";
import { bedrijvenLabel, datumKort, formatWaarde, isLive, looptijdLabel, paginaKort, sorteerVoorstellen, vandaagNL } from "@/lib/marketingAnalyse/rekenen";
import { ZEKERHEID_NAAM, type MaVoorstel, type MaZoekronde } from "@/lib/marketingAnalyse/types";

type Props = {
  open: MaVoorstel[];
  genegeerd: MaVoorstel[];
  laatsteZoekronde: MaZoekronde | null;
  /** Ids waarvoor negeren of terugzetten loopt. */
  bezig: Set<string>;
  onToevoegen: (v: MaVoorstel) => void;
  onNegeren: (v: MaVoorstel) => void;
  onTerugzetten: (v: MaVoorstel) => void;
};

const KOP = "label-theme whitespace-nowrap px-3 py-2.5 font-normal";

/** Groen ademend stipje als de campagne live is (vandaag tussen start en eind), anders grijs: gelijk aan het overzicht eronder. */
function StatusStip({ v, vandaag }: { v: MaVoorstel; vandaag: string }) {
  const live = isLive(v, vandaag);
  const titel = live ? "Live: vandaag valt binnen de looptijd" : "Niet live: vandaag valt buiten de looptijd";
  return (
    <span
      role="img"
      aria-label={titel}
      data-tip={titel}
      className={`mt-1.5 block h-2 w-2 shrink-0 rounded-full ${live ? "live-stip bg-open" : "bg-closed opacity-70"}`}
    />
  );
}

/** Het label bij twijfel, met de reden als tooltip. "Zeker" en "Waarschijnlijk" staan er niet: rust. */
function ZekerheidLabel({ v }: { v: MaVoorstel }) {
  if (v.zekerheid !== "twijfel") return null;
  return (
    <span
      data-tip={v.reden ?? undefined}
      className="inline-flex items-center rounded-control border border-line px-1.5 py-px text-meta text-ink-muted"
    >
      {ZEKERHEID_NAAM.twijfel}
    </span>
  );
}

function PaginaLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      data-tip={url}
      className="inline-flex max-w-[260px] items-center gap-1 truncate text-ink-muted underline-offset-2 hover:text-ink hover:underline"
    >
      <IconLink className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{paginaKort(url)}</span>
    </a>
  );
}

/** Eén kolom van de gevonden datapunten: kopje met aantal en de regels eronder. */
function DatapuntKolom({ titel, aantal, leeg, children }: { titel: string; aantal: number; leeg: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label-theme text-label text-ink-faint">
        {titel} <span className="tabular-nums">({aantal})</span>
      </p>
      {aantal === 0 ? <p className="mt-1.5 text-ink-muted">{leeg}</p> : <div className="mt-1.5">{children}</div>}
    </div>
  );
}

/**
 * De gevonden datapunten: alles wat Claude bij deze campagne vond en volgens hem erbij hoort,
 * in drie kolommen (advertentiecampagnes, campagnepagina, social media posts) en eronder de
 * kanttekeningen. Dit is ook het startpunt voor de eerste analyse na Toevoegen.
 */
function Bewijs({ v }: { v: MaVoorstel }) {
  const { platformCampagnes = [], ga4, posts = [], kanttekeningen = [] } = v.bewijs;
  const opmerkingen = [...(v.reden ? [v.reden] : []), ...kanttekeningen];
  return (
    <div className="px-6 py-4 text-sm">
      <div className="mb-3">
        <p className="font-medium text-ink">Gevonden datapunten</p>
        <p className="mt-0.5 text-meta text-ink-faint">
          Dit is alles wat Claude bij deze campagne heeft gevonden en volgens hem erbij hoort. De analyse begint met deze datapunten
          en controleert ze zelf opnieuw.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <DatapuntKolom titel="Advertentiecampagnes" aantal={platformCampagnes.length} leeg="Geen advertentiecampagnes gevonden.">
          <ul className="flex flex-col gap-1">
            {platformCampagnes.map((p, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="min-w-0">
                  <span className="text-ink-faint">{p.platform} · </span>
                  <span className="text-ink">{p.campagne}</span>
                </span>
                {p.uitgaven != null && <span className="shrink-0 tabular-nums text-ink-muted">{formatWaarde(p.uitgaven, "euro")}</span>}
              </li>
            ))}
          </ul>
        </DatapuntKolom>
        <DatapuntKolom titel="Campagnepagina" aantal={v.campagnePaginas.length} leeg="Geen eigen campagnepagina gevonden.">
          <ul className="flex flex-col gap-1">
            {v.campagnePaginas.map((url) => (
              <li key={url}>
                <PaginaLink url={url} />
              </li>
            ))}
          </ul>
          {ga4 && (
            <p className="mt-2 text-ink-muted">
              {ga4.sessies != null && <>{formatWaarde(ga4.sessies)} sessies</>}
              {ga4.leadEvents != null && <> · {formatWaarde(ga4.leadEvents)} lead-events</>}
              {ga4.periode && <> · {ga4.periode}</>}
              {ga4.toelichting && <span className="block text-meta text-ink-faint">{ga4.toelichting}</span>}
            </p>
          )}
        </DatapuntKolom>
        <DatapuntKolom titel="Social media posts" aantal={posts.length} leeg="Geen organische posts over dit onderwerp gevonden.">
          <ul className="flex flex-col gap-1 text-ink-muted">
            {posts.map((p, i) => (
              <li key={i}>
                <span className="text-ink-faint">
                  {p.kanaal}
                  {p.datum ? ` · ${datumKort(p.datum)}` : ""} ·{" "}
                </span>
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:text-ink hover:underline">
                    {p.tekst || "post"}
                  </a>
                ) : (
                  p.tekst || "post"
                )}
              </li>
            ))}
          </ul>
        </DatapuntKolom>
      </div>
      {opmerkingen.length > 0 && (
        <div className="mt-4 border-t border-line-soft pt-3">
          <p className="label-theme text-label text-ink-faint">Kanttekeningen</p>
          <ul className="mt-1.5 flex flex-col gap-1 text-ink-muted">
            {opmerkingen.map((k, i) => (
              <li key={i}>{k}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * De balk "Voorgestelde campagne analyses" bovenaan het overzicht: live actiecampagnes die
 * Claude Code in de advertenties vond (skill campagne-voorstellen). Toevoegen opent de
 * ingevulde briefing; een klik op de regel toont wat er is gevonden.
 */
export default function VoorstellenBalk({ open, genegeerd, laatsteZoekronde, bezig, onToevoegen, onNegeren, onTerugzetten }: Props) {
  // Standaard ingeklapt (verzoek van de eigenaar): de lopende analyses gaan voor.
  const [ingeklapt, setIngeklapt] = useState(true);
  const [uitgeklapt, setUitgeklapt] = useState<string | null>(null);
  const [genegeerdOpen, setGenegeerdOpen] = useState(false);
  const vandaag = vandaagNL();

  if (open.length === 0 && genegeerd.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-panel border border-line bg-card shadow-subtle">
      <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <button
          type="button"
          onClick={() => setIngeklapt((x) => !x)}
          aria-expanded={!ingeklapt}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          <IconChevronDown
            className={`h-4 w-4 shrink-0 text-ink-faint transition-transform duration-[var(--duur-snel)] ${ingeklapt ? "-rotate-90" : ""}`}
          />
          <span>
            <span className="label-theme block text-label text-ink-muted">
              Voorgestelde campagne analyses{open.length > 0 ? ` (${open.length})` : ""}
            </span>
            <span className="mt-0.5 block text-meta text-ink-faint">
              {open.length > 0
                ? "Actiecampagnes waarop nu geadverteerd wordt en die nog niet op de lijst staan."
                : "Geen nieuwe voorstellen."}
              {laatsteZoekronde && ` Laatst gezocht ${datumKort(laatsteZoekronde.gezochtOp)}.`}
            </span>
          </span>
        </button>
      </header>

      {!ingeklapt && open.length > 0 && (
        <div className="overflow-x-auto border-t border-line-soft">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-label text-ink-faint">
                <th className={`${KOP} pl-6`}>Campagne</th>
                <th className={KOP}>Campagnepagina</th>
                <th className={KOP}>Kanalen</th>
                <th className={KOP} data-tip="Eerste dag met uitgaven naar de pagina, binnen de laatste 90 dagen">
                  Live sinds
                </th>
                <th className={`${KOP} text-right`} data-tip="Mediakosten tot nu toe, alle platforms samen">
                  Uitgegeven
                </th>
                <th className={`${KOP} pr-6`} />
              </tr>
            </thead>
            <tbody>
              {sorteerVoorstellen(open).map((v) => {
                const Logo = v.merk ? getBrandLogo(v.merk) : null;
                const isOpen = uitgeklapt === v.id;
                return (
                  <Fragment key={v.id}>
                    <tr
                      onClick={() => setUitgeklapt(isOpen ? null : v.id)}
                      className="cursor-pointer align-top transition-colors duration-[var(--duur-snel)] hover:bg-surface vdu:ease-merk vdu:hover:bg-surface-tint [&>td]:border-t [&>td]:border-line-soft"
                      aria-expanded={isOpen}
                    >
                      <td className="py-3 pl-6 pr-3">
                        <div className="flex items-start gap-2.5">
                          <StatusStip v={v} vandaag={vandaag} />
                          {Logo ? <Logo className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" /> : <span className="w-4 shrink-0" />}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-ink">{v.naam}</span>
                              <ZekerheidLabel v={v} />
                            </div>
                            <p className="mt-0.5 text-meta text-ink-faint">
                              {bedrijvenLabel(v.bedrijven)}
                              {v.modellen.length > 0 && ` · ${v.modellen.join(", ")}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {v.campagnePaginas[0] ? <PaginaLink url={v.campagnePaginas[0]} /> : <span className="text-ink-faint">Geen eigen pagina</span>}
                      </td>
                      <td className="px-3 py-3 text-ink-muted">{v.kanalen.length > 0 ? v.kanalen.join(", ") : "—"}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-ink-muted">{v.startdatum ? looptijdLabel(v.startdatum, null).replace(/^vanaf /, "") : "—"}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-ink">{formatWaarde(v.uitgavenTotNu, "euro")}</td>
                      <td className="py-3 pl-3 pr-6">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNegeren(v);
                            }}
                            disabled={bezig.has(v.id)}
                            className="text-meta text-ink-faint underline-offset-2 hover:text-ink hover:underline disabled:opacity-60"
                          >
                            Negeren
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToevoegen(v);
                            }}
                            disabled={bezig.has(v.id)}
                            className="whitespace-nowrap rounded-button bg-primary vdu:bg-primary/10 px-3 py-1.5 text-meta font-medium text-on-primary vdu:text-primary transition-colors duration-[var(--duur-snel)] hover:bg-primary-dark vdu:ease-merk vdu:hover:bg-primary/15 disabled:opacity-60"
                          >
                            Toevoegen
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={6} className="border-t border-line-soft bg-surface-tint">
                          <Bewijs v={v} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!ingeklapt && genegeerd.length > 0 && (
        <div className="border-t border-line-soft px-6 py-3">
          <button
            type="button"
            onClick={() => setGenegeerdOpen((x) => !x)}
            aria-expanded={genegeerdOpen}
            className="text-meta text-ink-faint underline-offset-2 hover:text-ink hover:underline"
          >
            Genegeerd ({genegeerd.length})
          </button>
          {genegeerdOpen && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {genegeerd.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-ink-muted">
                    {v.naam}
                    <span className="text-ink-faint"> · {bedrijvenLabel(v.bedrijven)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onTerugzetten(v)}
                    disabled={bezig.has(v.id)}
                    className="shrink-0 text-meta text-ink-faint underline-offset-2 hover:text-ink hover:underline disabled:opacity-60"
                  >
                    Terugzetten
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
