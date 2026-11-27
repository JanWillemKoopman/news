"use client";

import { Fragment, useId, useState } from "react";
import { getBrandLogo } from "@/components/brandLogos";
import { IconChevronDown, IconClose, IconLightbulb, IconLink } from "@/components/icons";
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

const KOP = "ma-kolomkop whitespace-nowrap px-3 py-2.5 text-left font-semibold";

/** Groen ademend stipje als de campagne live is (vandaag tussen start en eind), anders grijs: gelijk aan het overzicht eronder. */
function StatusStip({ v, vandaag }: { v: MaVoorstel; vandaag: string }) {
  const live = isLive(v, vandaag);
  const titel = live ? "Live: vandaag valt binnen de looptijd" : "Niet live: vandaag valt buiten de looptijd";
  return (
    <span
      role="img"
      aria-label={titel}
      title={titel}
      className={`mt-[7px] block h-[7px] w-[7px] shrink-0 rounded-full ${live ? "live-stip bg-open" : "bg-closed opacity-70"}`}
    />
  );
}

/** Het label bij twijfel, met de reden als tooltip. "Zeker" en "Waarschijnlijk" staan er niet: rust. */
function ZekerheidLabel({ v }: { v: MaVoorstel }) {
  if (v.zekerheid !== "twijfel") return null;
  return (
    <span title={v.reden ?? undefined} className="inline-flex items-center rounded-[5px] border border-line px-1.5 py-px text-[11px] text-ink-muted">
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
      title={url}
      className="inline-flex max-w-full items-center gap-1 truncate text-ink-muted underline-offset-2 hover:text-ink hover:underline"
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
      <p className="ma-kolomkop">
        {titel} <span className="ma-getal">({aantal})</span>
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
    <div className="ma-in px-5 py-4 text-[13px] lg:px-6">
      <div className="mb-3">
        <p className="font-medium text-ink">Gevonden datapunten</p>
        <p className="mt-0.5 text-[12px] text-ink-faint">
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
                {p.uitgaven != null && <span className="ma-getal shrink-0 text-ink-muted">{formatWaarde(p.uitgaven, "euro")}</span>}
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
              {ga4.toelichting && <span className="block text-[12px] text-ink-faint">{ga4.toelichting}</span>}
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
          <p className="ma-kolomkop">Kanttekeningen</p>
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

/** Hoe vaak een waarde voorkomt, hoog naar laag (gelijk: alfabetisch). */
function telling(waarden: readonly string[]): { naam: string; aantal: number }[] {
  const m = new Map<string, number>();
  for (const w of waarden) m.set(w, (m.get(w) ?? 0) + 1);
  return [...m.entries()].map(([naam, aantal]) => ({ naam, aantal })).sort((a, b) => b.aantal - a.aantal || a.naam.localeCompare(b.naam, "nl"));
}

function MerkLabel({ merk }: { merk: string | null }) {
  if (!merk) return <span className="text-ink-faint">Geen merk</span>;
  const Logo = getBrandLogo(merk);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-ink">
      {Logo && <Logo role="img" aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ink-muted" />}
      {merk}
    </span>
  );
}

/**
 * De balk "Voorgestelde campagne-analyses" bovenaan het overzicht (redesign november 2026): live
 * actiecampagnes die Claude Code in de advertenties vond (skill campagne-voorstellen) en die nog
 * niet op de lijst staan. Ingeklapt een duidelijke horizontale balk met het aantal en per bedrijf
 * en per merk hoeveel; uitgeklapt de lijst met merk en bedrijf in eigen kolommen. Toevoegen opent
 * de ingevulde briefing; een klik op een regel toont wat er gevonden is.
 */
export default function VoorstellenBalk({ open, genegeerd, laatsteZoekronde, bezig, onToevoegen, onNegeren, onTerugzetten }: Props) {
  // Standaard ingeklapt (verzoek van de eigenaar): de lopende analyses gaan voor.
  const [ingeklapt, setIngeklapt] = useState(true);
  const [uitgeklapt, setUitgeklapt] = useState<string | null>(null);
  const [genegeerdOpen, setGenegeerdOpen] = useState(false);
  const lijstId = useId();
  const vandaag = vandaagNL();

  if (open.length === 0 && genegeerd.length === 0) return null;

  const perBedrijf = telling(open.flatMap((v) => (v.bedrijven.length ? v.bedrijven : ["Geen bedrijf"])));
  const perMerk = telling(open.map((v) => v.merk ?? "Geen merk"));
  const aantalLive = open.filter((v) => isLive(v, vandaag)).length;

  return (
    <section aria-label="Voorgestelde campagne-analyses" className="overflow-hidden rounded-[14px] border border-line bg-[var(--ma-ondergrond)] shadow-subtle">
      <button
        type="button"
        onClick={() => setIngeklapt((x) => !x)}
        aria-expanded={!ingeklapt}
        aria-controls={lijstId}
        className="group flex w-full flex-col gap-3 px-4 py-3.5 text-left transition-colors duration-[var(--ma-duur-klein)] hover:bg-[color-mix(in_srgb,var(--color-ink)_2%,transparent)] lg:flex-row lg:items-center lg:gap-5 lg:px-5"
      >
        <span className="flex min-w-0 items-center gap-3 lg:w-[330px] lg:shrink-0">
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-light text-primary">
            <IconLightbulb className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="ma-kop whitespace-nowrap text-ink">Voorgestelde campagne-analyses</span>
              <span className="ma-getal flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11.5px] font-semibold text-on-primary">
                {open.length}
              </span>
            </span>
            <span className="mt-0.5 block text-[12px] text-ink-muted">
              {open.length > 0 ? `Gevonden in de advertenties, nog niet op de lijst · ${aantalLive} live` : "Geen nieuwe voorstellen"}
            </span>
          </span>
        </span>

        {open.length > 0 && (
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span className="w-14 shrink-0 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-faint">Bedrijf</span>
              {perBedrijf.map((b) => (
                <span key={b.naam} className="ma-groep inline-flex h-[22px] items-center gap-1.5 rounded-[6px] px-2 text-[12px] text-ink">
                  {b.naam}
                  <span className="ma-getal text-ink-faint">{b.aantal}</span>
                </span>
              ))}
            </span>
            <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span className="w-14 shrink-0 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-faint">Merk</span>
              {perMerk.map((m) => {
                const Logo = m.naam !== "Geen merk" ? getBrandLogo(m.naam) : null;
                return (
                  <span key={m.naam} className="ma-groep inline-flex h-[22px] items-center gap-1.5 rounded-[6px] px-2 text-[12px] text-ink">
                    {Logo && <Logo role="img" aria-hidden="true" className="h-3 w-3 shrink-0 text-ink-muted" />}
                    <span className={m.naam === "Geen merk" ? "text-ink-muted" : ""}>{m.naam}</span>
                    <span className="ma-getal text-ink-faint">{m.aantal}</span>
                  </span>
                );
              })}
            </span>
          </span>
        )}

        <span className="flex shrink-0 items-center justify-between gap-3 lg:flex-col lg:items-end lg:gap-1">
          <span className="ma-knop ma-groep pointer-events-none text-[12.5px]">
            {ingeklapt ? "Toon voorstellen" : "Verberg"}
            <IconChevronDown className={`!h-3.5 !w-3.5 transition-transform duration-[var(--ma-duur-klein)] ${ingeklapt ? "" : "rotate-180"}`} />
          </span>
          {laatsteZoekronde && <span className="text-[11.5px] text-ink-faint">Laatst gezocht {datumKort(laatsteZoekronde.gezochtOp)}</span>}
        </span>
      </button>

      <div
        id={lijstId}
        inert={ingeklapt ? true : undefined}
        className={`grid transition-[grid-template-rows] duration-[var(--ma-duur-paneel)] ease-[var(--ma-ease-uit)] motion-reduce:transition-none ${
          ingeklapt ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          {open.length > 0 && (
            <div className="relative overflow-x-auto border-t border-line-soft">
              <table className="w-full min-w-[960px] table-fixed border-separate border-spacing-0 text-[13px]">
                <colgroup>
                  <col className="w-[25%]" />
                  <col className="w-[12%]" />
                  <col className="w-[15%]" />
                  <col className="w-[16%]" />
                  <col className="w-[9.5%]" />
                  <col className="w-[9%]" />
                  <col className="w-[13.5%]" />
                </colgroup>
                <thead>
                  <tr>
                    <th className={`${KOP} pl-5`}>Campagne</th>
                    <th className={KOP}>Merk</th>
                    <th className={KOP}>Bedrijf</th>
                    <th className={KOP}>Campagnepagina</th>
                    <th className={KOP} title="Eerste dag met uitgaven naar de pagina, binnen de laatste 90 dagen">
                      Live sinds
                    </th>
                    <th className={`${KOP} text-right`} title="Mediakosten tot nu toe, alle platforms samen">
                      Uitgegeven
                    </th>
                    <th className={`${KOP} pr-4`}>
                      <span className="sr-only">Acties</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorteerVoorstellen(open).map((v) => {
                    const isOpen = uitgeklapt === v.id;
                    return (
                      <Fragment key={v.id}>
                        <tr
                          onClick={() => setUitgeklapt(isOpen ? null : v.id)}
                          aria-expanded={isOpen}
                          className={`cursor-pointer align-top transition-colors duration-[var(--ma-duur-klein)] [&>td]:border-t [&>td]:border-line-soft ${
                            isOpen ? "ma-rij-gekozen" : "hover:bg-[color-mix(in_srgb,var(--color-ink)_2.5%,transparent)]"
                          }`}
                        >
                          <td className="py-3 pl-5 pr-3">
                            <div className="flex items-start gap-2.5">
                              <StatusStip v={v} vandaag={vandaag} />
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    aria-expanded={isOpen}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setUitgeklapt(isOpen ? null : v.id);
                                    }}
                                    className="rounded-[4px] text-left font-semibold text-ink hover:underline hover:underline-offset-2"
                                  >
                                    {v.naam}
                                  </button>
                                  <ZekerheidLabel v={v} />
                                </div>
                                {v.modellen.length > 0 && <p className="mt-0.5 text-[11.5px] text-ink-faint">{v.modellen.join(", ")}</p>}
                                {v.kanalen.length > 0 && (
                                  <p className="mt-0.5 text-[11.5px] leading-snug text-ink-faint" title="Kanalen waarop de campagne gevonden is">
                                    {v.kanalen.join(" · ")}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <MerkLabel merk={v.merk} />
                          </td>
                          <td className="px-3 py-3 text-ink">{bedrijvenLabel(v.bedrijven)}</td>
                          <td className="px-3 py-3">
                            {v.campagnePaginas[0] ? <PaginaLink url={v.campagnePaginas[0]} /> : <span className="text-ink-faint">Geen eigen pagina</span>}
                            {v.campagnePaginas.length > 1 && <p className="mt-0.5 text-[11.5px] text-ink-faint">+{v.campagnePaginas.length - 1} meer</p>}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-ink-muted">
                            {v.startdatum ? looptijdLabel(v.startdatum, null).replace(/^vanaf /, "") : "—"}
                          </td>
                          <td className="ma-getal whitespace-nowrap px-3 py-3 text-right text-ink">{formatWaarde(v.uitgavenTotNu, "euro")}</td>
                          <td className="py-3 pl-2 pr-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNegeren(v);
                                }}
                                disabled={bezig.has(v.id)}
                                title="Negeren: dit voorstel verdwijnt uit de lijst (terug te zetten onder Genegeerd)"
                                aria-label={`${v.naam} negeren`}
                                className="ma-knop px-1.5 text-ink-faint hover:text-ink disabled:opacity-60"
                              >
                                <IconClose />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToevoegen(v);
                                }}
                                disabled={bezig.has(v.id)}
                                className="ma-knop ma-knop-primair px-2 text-[12.5px] disabled:opacity-60"
                              >
                                Toevoegen
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={7} className="border-t border-line-soft bg-surface-tint">
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

          {genegeerd.length > 0 && (
            <div className="border-t border-line-soft px-5 py-3">
              <button
                type="button"
                onClick={() => setGenegeerdOpen((x) => !x)}
                aria-expanded={genegeerdOpen}
                className="text-[12px] text-ink-faint underline-offset-2 hover:text-ink hover:underline"
              >
                Genegeerd ({genegeerd.length})
              </button>
              {genegeerdOpen && (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {genegeerd.map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="min-w-0 truncate text-ink-muted">
                        {v.naam}
                        <span className="text-ink-faint">
                          {" "}
                          · {v.merk ? `${v.merk} · ` : ""}
                          {bedrijvenLabel(v.bedrijven)}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => onTerugzetten(v)}
                        disabled={bezig.has(v.id)}
                        className="shrink-0 text-[12px] text-ink-faint underline-offset-2 hover:text-ink hover:underline disabled:opacity-60"
                      >
                        Terugzetten
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
