"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import FilterBar from "@/components/FilterBar";
import FilterSelect from "@/components/FilterSelect";
import Inlogprompt from "@/components/Inlogprompt";
import { getBrandLogo } from "@/components/brandLogos";
import { IconChevronDown } from "@/components/icons";
import { formatCurrency } from "@/lib/format";
import { isCampagneAnalyse } from "@/lib/campagneAnalyseOverzicht";
import {
  balkPositie,
  bedrijfOpties,
  filterTimeline,
  isoWeken,
  jarenBereik,
  looptijdDagen,
  maandBlokken as bouwMaandBlokken,
  merkOpties,
  sorteerTimeline,
  STATUS_VOLGORDE,
  telStatussen,
  timelineStatus,
  vandaagPositie as bepaalVandaagPositie,
  verstrekenPct,
  type BalkPositie,
  type TimelineStatus,
} from "@/lib/campagneTimeline";
import {
  bedrijvenLabel,
  looptijdLabel,
  merkSleutels,
  overzichtCijfers,
  vandaagNL,
  versieLabel,
} from "@/lib/marketingAnalyse/rekenen";
import type { MaOpzet, MaOverzichtRegel } from "@/lib/marketingAnalyse/types";
import { SkeletTabel } from "@/components/Skelet";

const MIN_KOLOMBREEDTE = 14;
// T2: tot 72px per week, zodat een paar lopende campagnes de hele breedte kunnen vullen.
const MAX_KOLOMBREEDTE = 72;
const STANDAARD_KOLOMBREEDTE = 24;
// T6: een bredere naamkolom, zodat namen als "Werkplaatscampagne Dealerstempel" passen.
const NAAMKOLOM = 290;
// T7: merk als logo mét naam.
const MERKKOLOM = 140;
const VASTE_KOLOMMEN = NAAMKOLOM + MERKKOLOM;
const RIJHOOGTE = 56;
const MAANDRIJHOOGTE = 24;
// T5: weeknummers liggen horizontaal; de rij kan daardoor lager.
const WEEKRIJHOOGTE = 26;
const KOPHOOGTE = MAANDRIJHOOGTE + WEEKRIJHOOGTE;
const MIN_BALKBREEDTE = 6;

/**
 * T6: past de naam in de balk? Een schatting op tekenbreedte (11px, gemiddeld ± 6,2px per teken)
 * plus de binnenmarge. Past hij niet, dan geen afgekapte naam in de balk: hij staat links al.
 */
function naamPastIn(naam: string, breedte: number): boolean {
  return naam.length * 6.2 + 22 <= breedte;
}

/**
 * Dezelfde vier balkkleuren als het tabblad Tijdlijn (`--color-balk-*` in globals.css), zodat
 * de twee jaaroverzichten in elk theme hetzelfde lezen.
 */
const STATUS_STYLE: Record<TimelineStatus, { label: string; balk: string; tekst: string; dot: string }> = {
  actief: { label: "Actief", balk: "bg-balk-actief", tekst: "text-on-balk-actief", dot: "bg-balk-actief" },
  "bijna-af": {
    label: "Loopt bijna af",
    balk: "bg-balk-bijna-af",
    tekst: "text-on-balk-bijna-af",
    dot: "bg-balk-bijna-af",
  },
  gepland: {
    label: "Gepland",
    balk: "border-2 border-balk-gepland bg-card",
    tekst: "text-balk-gepland",
    dot: "border-2 border-balk-gepland bg-card",
  },
  afgelopen: {
    label: "Afgelopen",
    balk: "bg-balk-afgelopen",
    tekst: "text-on-balk-afgelopen",
    dot: "bg-balk-afgelopen",
  },
};

type Rij = {
  campagne: MaOverzichtRegel;
  status: TimelineStatus | null;
  balk: BalkPositie | null;
};

type HoverInfo = { rij: Rij; top: number; left: number; /** Waar het pijltje staat, vanaf de linkerrand. */ pijl: number };

/** De link naar de analyse zelf: Marketing analyse opent hem uit de URL. */
function analyseHref(id: string): string {
  return `/?tab=marketing-analyse&analyse=${encodeURIComponent(id)}`;
}

function MerkLogo({ merk }: { merk: string | null }) {
  if (!merk) return null;
  const delen = merkSleutels(merk).length > 1 ? merk.split(/\s*(?:,|;|\/|\+|&|\s+en\s+)\s*/i) : [merk];
  const logos = delen.map((m) => ({ m, Logo: getBrandLogo(m) }));
  // T7: logo én naam, in de inktkleur, zodat de kolom overal hetzelfde leest (ook "Alle merken").
  const metLogo = logos.filter((l) => l.Logo);
  return (
    <span className="flex min-w-0 items-center gap-2">
      {metLogo.length > 0 && (
        <span className="flex shrink-0 items-center gap-1">
          {metLogo.map(({ m, Logo }) => (Logo ? <Logo key={m} role="img" aria-label={m} className="h-[18px] w-[18px] shrink-0 text-ink" /> : null))}
        </span>
      )}
      <span className="truncate text-sm text-ink-muted">{merk}</span>
    </span>
  );
}

/**
 * Campagnes → Campagne timeline: het jaaroverzicht van alle **Campagne analyses** uit Marketing
 * analyse (geen rapportages). Zelfde opzet als het tabblad Tijdlijn — per campagne een rij, een
 * balk over de looptijd in de kleur van de status, maanden boven de weeknummers en een streep bij
 * vandaag — maar met de briefing als bron: naam, bedrijven, merk, start- en einddatum. De balken
 * staan op de dag nauwkeurig; wie over de jaargrens loopt, loopt het beeld uit. Hover toont
 * looptijd, budget, uitgaven en leads uit de laatste analyse; een klik opent de analyse.
 */
export default function CampagneTimeline({ ingelogd }: { ingelogd: boolean }) {
  const [regels, setRegels] = useState<MaOverzichtRegel[] | null>(null);
  const [opzetten, setOpzetten] = useState<MaOpzet[]>([]);
  const [fout, setFout] = useState<string | null>(null);
  const [bedrijfFilter, setBedrijfFilter] = useState<string[]>([]);
  const [merkFilter, setMerkFilter] = useState<string[]>([]);
  const [kolombreedte, setKolombreedte] = useState(STANDAARD_KOLOMBREEDTE);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const vandaag = useMemo(() => vandaagNL(), []);
  const huidigJaar = useMemo(() => jarenBereik([], vandaag).van, [vandaag]);
  const [jaar, setJaar] = useState(huidigJaar);
  const scrollRef = useRef<HTMLDivElement>(null);
  // T1/T2: één keer bij het openen inzoomen tot de campagnes de breedte vullen.
  const [gepast, setGepast] = useState(false);
  // T9: waar het beeld na een jaarwissel of een klik op Vandaag naartoe scrolt.
  const [focus, setFocus] = useState<{ op: "campagnes" | "vandaag"; tik: number }>({ op: "campagnes", tik: 0 });
  // T8: de rij onder de muis.
  const [hoverRij, setHoverRij] = useState<string | null>(null);

  useEffect(() => {
    if (!ingelogd) return;
    fetch("/api/marketing-analyse")
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          campagnes?: MaOverzichtRegel[];
          opzetten?: MaOpzet[];
          fout?: string;
        };
        if (!res.ok) throw new Error(data.fout ?? "Kon de campagne-analyses niet laden.");
        setRegels(data.campagnes ?? []);
        setOpzetten(data.opzetten ?? []);
        setFout(null);
      })
      .catch((err) => setFout(err instanceof Error ? err.message : String(err)));
  }, [ingelogd]);

  const campagnes = useMemo(() => {
    const opzetPerId = new Map(opzetten.map((o) => [o.id, o]));
    return (regels ?? []).filter((c) => isCampagneAnalyse(c, opzetPerId));
  }, [regels, opzetten]);

  const bereik = useMemo(() => jarenBereik(campagnes, vandaag), [campagnes, vandaag]);
  const weken = useMemo(() => isoWeken(jaar), [jaar]);
  const maandBlokken = useMemo(() => bouwMaandBlokken(weken), [weken]);
  const vandaagPos = useMemo(() => bepaalVandaagPositie(vandaag, weken), [vandaag, weken]);

  const gefilterd = useMemo(
    () => filterTimeline(campagnes, { bedrijven: bedrijfFilter, merken: merkFilter }),
    [campagnes, bedrijfFilter, merkFilter],
  );

  /** Alleen wat in het gekozen jaar loopt; zonder startdatum staat een campagne er altijd, onderaan. */
  const rijen: Rij[] = useMemo(
    () =>
      sorteerTimeline(gefilterd)
        .map((campagne) => ({
          campagne,
          status: timelineStatus(campagne.startdatum, campagne.einddatum, vandaag),
          balk: balkPositie(campagne.startdatum, campagne.einddatum, weken),
        }))
        .filter((r) => r.balk !== null || !r.campagne.startdatum),
    [gefilterd, weken, vandaag],
  );

  const telling = useMemo(() => telStatussen(rijen.map((r) => r.status)), [rijen]);

  /** Even/oneven maand per weekkolom (zebra) en de kolommen waar een nieuwe maand begint. */
  const weekMaandPariteit = useMemo(() => {
    const rij: number[] = [];
    maandBlokken.forEach((blok, i) => {
      for (let w = 0; w < blok.aantalWeken; w += 1) rij.push(i % 2);
    });
    return rij;
  }, [maandBlokken]);
  const maandGrensKolommen = useMemo(() => new Set(maandBlokken.slice(1).map((b) => b.vanKolom)), [maandBlokken]);

  /** De kolom waar het beeld begint: het begin van de maand van de vroegste balk (T1). */
  const beeld = useMemo(() => {
    const balken = rijen.map((r) => r.balk).filter((b): b is BalkPositie => b !== null);
    if (balken.length === 0) return null;
    const eerste = Math.min(...balken.map((b) => b.van));
    const laatste = Math.max(...balken.map((b) => b.tot));
    const blok = [...maandBlokken].reverse().find((b) => b.vanKolom <= eerste);
    return { van: blok ? blok.vanKolom : Math.floor(eerste), tot: laatste };
  }, [rijen, maandBlokken]);

  // T2: bij het openen de zoom zo kiezen dat de campagnes (vanaf het begin van hun eerste maand)
  // de tijdas vullen. Daarna bepaalt de gebruiker het met de schuif.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (gepast || !el || !beeld) return;
    const zichtbaar = el.clientWidth - VASTE_KOLOMMEN;
    // Tot de laatste week waarin een balk loopt (de week van `tot` telt mee), zodat er rechts
    // niets overblijft dat het beeld naar links duwt.
    const eind = Math.min(weken.length, Math.ceil(beeld.tot));
    const passend = Math.floor(zichtbaar / Math.max(1, eind - beeld.van));
    setKolombreedte(Math.min(MAX_KOLOMBREEDTE, Math.max(MIN_KOLOMBREEDTE, passend)));
    setGepast(true);
  }, [gepast, beeld, weken.length]);

  // T1: het beeld begint aan het begin van een maand (nooit een afgekapte maandnaam) bij de
  // eerste campagne; T9: of met vandaag in het midden. Alleen bij openen, een ander jaar of de
  // knop Vandaag; niet bij elke zoomstap.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !gepast) return;
    const zichtbaar = el.clientWidth - VASTE_KOLOMMEN;
    if (focus.op === "vandaag" && vandaagPos !== null) {
      el.scrollTo({ left: Math.max(0, vandaagPos * kolombreedte - zichtbaar / 2), behavior: focus.tik > 0 ? "smooth" : "auto" });
    } else if (beeld) {
      el.scrollLeft = beeld.van * kolombreedte;
    } else if (vandaagPos !== null) {
      el.scrollLeft = Math.max(0, vandaagPos * kolombreedte - zichtbaar / 2);
    } else {
      el.scrollLeft = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jaar, gepast, focus]);

  if (!ingelogd) return <Inlogprompt tekst="Log in om de campagne timeline te bekijken." />;

  if (fout) {
    return (
      <div className="rounded-panel border border-line bg-card px-5 py-4 text-sm text-ink-muted shadow-subtle">
        {fout}
      </div>
    );
  }

  if (regels === null) {
    return (
      <div className="rounded-panel border border-line bg-card">
        <SkeletTabel rijen={4} kolommen={3} />
      </div>
    );
  }

  if (campagnes.length === 0) {
    return (
      <div className="rounded-panel border border-line bg-card px-5 py-6 shadow-subtle">
        <p className="text-sm text-ink-muted">Er zijn nog geen campagne-analyses.</p>
        <a href="/?tab=marketing-analyse" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
          Naar Marketing analyse
        </a>
      </div>
    );
  }

  const tijdasBreedte = weken.length * kolombreedte;
  const filterAantal = (bedrijfFilter.length > 0 ? 1 : 0) + (merkFilter.length > 0 ? 1 : 0);

  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        totalCount={campagnes.length}
        filteredCount={gefilterd.length}
        activeFilterCount={filterAantal}
        onClearAll={() => {
          setBedrijfFilter([]);
          setMerkFilter([]);
        }}
      >
        <FilterSelect
          label="Bedrijf"
          options={bedrijfOpties(campagnes)}
          selected={bedrijfFilter}
          onChange={setBedrijfFilter}
        />
        <FilterSelect label="Merk" options={merkOpties(campagnes)} selected={merkFilter} onChange={setMerkFilter} />
      </FilterBar>

      <div className="rounded-card border border-line bg-card shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-control border border-line">
              <button
                type="button"
                onClick={() => {
                  setJaar((j) => j - 1);
                  setFocus((f) => ({ op: "campagnes", tik: f.tik + 1 }));
                }}
                disabled={jaar <= bereik.van}
                aria-label="Vorig jaar"
                data-tip="Vorig jaar"
                className="flex h-8 w-8 items-center justify-center text-ink-muted transition-colors hover:bg-surface hover:text-ink disabled:pointer-events-none disabled:opacity-30"
              >
                <IconChevronDown className="h-4 w-4 rotate-90" />
              </button>
              <span className="min-w-[3.5rem] border-x border-line px-2 text-center text-sm font-semibold tabular-nums text-ink">
                {jaar}
              </span>
              <button
                type="button"
                onClick={() => {
                  setJaar((j) => j + 1);
                  setFocus((f) => ({ op: "campagnes", tik: f.tik + 1 }));
                }}
                disabled={jaar >= bereik.tot}
                aria-label="Volgend jaar"
                data-tip="Volgend jaar"
                className="flex h-8 w-8 items-center justify-center text-ink-muted transition-colors hover:bg-surface hover:text-ink disabled:pointer-events-none disabled:opacity-30"
              >
                <IconChevronDown className="h-4 w-4 -rotate-90" />
              </button>
            </div>
            {/* T9: terug naar vandaag, ook vanuit een ander jaar. */}
            <button
              type="button"
              onClick={() => {
                setJaar(huidigJaar);
                setFocus((f) => ({ op: "vandaag", tik: f.tik + 1 }));
              }}
              className="h-8 rounded-control border border-line px-3 text-sm font-medium text-ink-muted transition-colors duration-[var(--duur-snel)] ease-merk hover:border-ink-faint hover:text-ink"
            >
              Vandaag
            </button>
            <p className="text-sm text-ink-muted">
              Week 1 t/m {weken.length} · {rijen.length} {rijen.length === 1 ? "campagne" : "campagnes"} in beeld
            </p>
          </div>
          <div className="flex items-center gap-5">
            <ul className="flex items-center gap-3.5 text-xs text-ink-muted">
              {STATUS_VOLGORDE.map((status) => (
                // T10: een status zonder campagnes staat gedimd.
                <li key={status} className={`flex items-center gap-1.5 ${telling[status] === 0 ? "opacity-45" : ""}`}>
                  <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${STATUS_STYLE[status].dot}`} />
                  {STATUS_STYLE[status].label}
                  <span className="tabular-nums text-ink-faint">{telling[status]}</span>
                </li>
              ))}
            </ul>
            <label className="flex items-center gap-2 text-xs text-ink-muted">
              Inzoomen
              <input
                type="range"
                min={MIN_KOLOMBREEDTE}
                max={MAX_KOLOMBREEDTE}
                step={2}
                value={kolombreedte}
                onChange={(event) => setKolombreedte(Number(event.target.value))}
                className="h-1 w-32 accent-primary"
                aria-label="Zoomniveau campagne timeline"
              />
            </label>
          </div>
        </div>

        {rijen.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-muted">
            Geen campagne-analyses in {jaar}
            {filterAantal > 0 ? " voor deze filters" : ""}.
          </p>
        ) : (
          <div ref={scrollRef} className="overflow-x-auto" onScroll={() => setHover(null)}>
            <div className="relative" style={{ width: VASTE_KOLOMMEN + tijdasBreedte }}>
              {/* Kop: maanden boven de weeknummers, met de vaste kolommen Campagne en Merk ervoor. */}
              <div className="sticky top-0 z-20 flex border-b border-line bg-card">
                <div
                  className="sticky left-0 z-30 flex shrink-0 border-r border-line bg-card"
                  style={{ width: VASTE_KOLOMMEN, height: KOPHOOGTE }}
                >
                  <span
                    className="label-theme flex items-center border-r border-line px-3 text-label text-ink-faint"
                    style={{ width: NAAMKOLOM }}
                  >
                    Campagne
                  </span>
                  <span className="label-theme flex items-center px-3 text-label text-ink-faint" style={{ width: MERKKOLOM }}>
                    Merk
                  </span>
                </div>
                <div className="flex flex-col" style={{ width: tijdasBreedte }}>
                  <div className="flex" style={{ height: MAANDRIJHOOGTE }}>
                    {maandBlokken.map((blok, i) => (
                      <div
                        key={blok.sleutel}
                        className={`flex shrink-0 items-center justify-center overflow-hidden whitespace-nowrap border-r border-line-soft text-[11px] font-medium uppercase tracking-wide text-ink-muted ${
                          i % 2 === 1 ? "bg-surface" : ""
                        } ${i > 0 ? "border-l border-line" : ""}`}
                        style={{ width: blok.aantalWeken * kolombreedte }}
                      >
                        {blok.label}
                      </div>
                    ))}
                  </div>
                  <div className="relative flex" style={{ height: WEEKRIJHOOGTE }}>
                    {weken.map((week, i) => {
                      const huidig = vandaagPos !== null && Math.floor(vandaagPos) === i;
                      // T5: horizontaal; is een week smaller dan 22px, dan alleen de oneven weken.
                      const toon = kolombreedte >= 22 || week.nummer % 2 === 1;
                      return (
                        <div
                          key={week.nummer}
                          className={`flex shrink-0 items-center justify-center border-r border-line-soft ${
                            weekMaandPariteit[i] === 1 ? "bg-surface" : ""
                          } ${maandGrensKolommen.has(i) ? "border-l border-line" : ""}`}
                          style={{ width: kolombreedte }}
                        >
                          {toon && !huidig && <span className="text-[11px] leading-none tabular-nums text-ink-faint">{week.nummer}</span>}
                        </div>
                      );
                    })}
                    {/* T3: een label "Vandaag" boven de streep, in de weekrij. */}
                    {vandaagPos !== null && (
                      <span
                        className="pointer-events-none absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-pill bg-primary px-2 py-0.5 text-[10px] font-semibold leading-tight text-on-primary"
                        style={{ left: vandaagPos * kolombreedte }}
                      >
                        Vandaag
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Rijen: één per campagne-analyse. */}
              <div>
                {rijen.map((rij) => {
                  const { campagne, balk, status } = rij;
                  const stijl = status ? STATUS_STYLE[status] : null;
                  const left = balk ? balk.van * kolombreedte + 1 : 0;
                  const breedte = balk ? Math.max(MIN_BALKBREEDTE, (balk.tot - balk.van) * kolombreedte - 2) : 0;
                  const labelBinnen = naamPastIn(campagne.naam, breedte);
                  // T4: het verstreken deel van een lopende balk vol, de rest lichter.
                  const verstrekenInBalk =
                    balk && vandaagPos !== null && (status === "actief" || status === "bijna-af")
                      ? Math.min(100, Math.max(0, ((vandaagPos - balk.van) / Math.max(0.01, balk.tot - balk.van)) * 100))
                      : null;
                  const rijHover = hoverRij === campagne.id;
                  const ruimteRechts = tijdasBreedte - (left + breedte);
                  const ronding = `${balk?.doorVoor ? "rounded-l-none" : ""} ${balk?.doorNa ? "rounded-r-none" : ""}`;
                  return (
                    <div
                      key={campagne.id}
                      onMouseEnter={() => setHoverRij(campagne.id)}
                      onMouseLeave={() => setHoverRij(null)}
                      className="relative flex border-b border-line-soft last:border-b-0"
                      style={{ height: RIJHOOGTE }}
                    >
                      {/* T8: de rij onder de muis licht zacht op, over de hele breedte. */}
                      <div
                        aria-hidden="true"
                        className={`pointer-events-none absolute inset-0 z-[1] bg-ink/[0.035] transition-opacity duration-[var(--duur-snel)] ease-merk ${
                          rijHover ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <div
                        className={`sticky left-0 z-20 flex shrink-0 items-center border-r border-line transition-colors duration-[var(--duur-snel)] ease-merk ${
                          rijHover ? "bg-[color-mix(in_srgb,var(--color-ink)_3.5%,var(--color-card))]" : "bg-card"
                        }`}
                        style={{ width: VASTE_KOLOMMEN }}
                      >
                        <a
                          href={analyseHref(campagne.id)}
                          className="group flex min-w-0 flex-col justify-center px-3"
                          style={{ width: NAAMKOLOM }}
                          data-tip={`${campagne.naam} — open de analyse`}
                        >
                          <span className="truncate text-sm text-ink group-hover:text-primary">{campagne.naam}</span>
                          <span className="truncate text-xs text-ink-faint">{bedrijvenLabel(campagne.bedrijven)}</span>
                        </a>
                        <span
                          className="flex h-full min-w-0 items-center border-l border-line px-3"
                          style={{ width: MERKKOLOM }}
                          data-tip={campagne.merk ?? undefined}
                        >
                          <MerkLogo merk={campagne.merk} />
                        </span>
                      </div>

                      <div className="relative flex" style={{ width: tijdasBreedte }}>
                        {weken.map((week, i) => (
                          <div
                            key={week.nummer}
                            className={`shrink-0 border-r border-line-soft ${
                              weekMaandPariteit[i] === 1 ? "bg-surface" : ""
                            } ${maandGrensKolommen.has(i) ? "border-l border-line" : ""}`}
                            style={{ width: kolombreedte }}
                          />
                        ))}

                        {!campagne.startdatum && (
                          <span className="absolute inset-y-0 left-0 flex items-center whitespace-nowrap pl-3 text-xs italic text-ink-faint">
                            Geen startdatum in de briefing
                          </span>
                        )}

                        {balk && stijl && (
                          <>
                            <a
                              href={analyseHref(campagne.id)}
                              aria-label={`${campagne.naam}: open de analyse`}
                              className={`absolute top-1/2 z-[2] flex -translate-y-1/2 items-center overflow-hidden rounded-balk shadow-card transition-[filter] hover:brightness-110 ${stijl.balk} ${ronding}`}
                              style={{
                                left,
                                width: breedte,
                                height: "var(--balk-hoogte)",
                                // Zonder einddatum: de balk vervaagt naar de rand van het jaar.
                                ...(balk.openEinde
                                  ? {
                                      maskImage: "linear-gradient(to right, black 80%, transparent)",
                                      WebkitMaskImage: "linear-gradient(to right, black 80%, transparent)",
                                    }
                                  : {}),
                              }}
                              onMouseEnter={(event) => {
                                const rect = event.currentTarget.getBoundingClientRect();
                                // T10: de kaart staat onder de muis en wijst met een pijltje naar de balk.
                                const muis = Math.min(Math.max(event.clientX, rect.left + 12), rect.right - 12);
                                const links = Math.min(Math.max(8, muis - 40), window.innerWidth - 300);
                                setHover({ rij, top: rect.bottom + 10, left: links, pijl: muis - links });
                              }}
                              onMouseLeave={() => setHover(null)}
                            >
                              {verstrekenInBalk !== null && verstrekenInBalk < 100 && (
                                <span
                                  aria-hidden="true"
                                  className="absolute inset-y-0 right-0 bg-card/45"
                                  style={{ left: `${verstrekenInBalk}%` }}
                                />
                              )}
                              {labelBinnen && (
                                <span className={`relative truncate px-2.5 text-[11px] font-medium leading-normal ${stijl.tekst}`}>
                                  {campagne.naam}
                                </span>
                              )}
                            </a>
                            {!labelBinnen && ruimteRechts > campagne.naam.length * 6.2 + 12 && (
                              <span
                                className="pointer-events-none absolute top-1/2 -translate-y-1/2 truncate text-[11px] text-ink-muted"
                                style={{ left: left + breedte + 6, maxWidth: ruimteRechts - 10 }}
                              >
                                {campagne.naam}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Streep bij vandaag. */}
              {vandaagPos !== null && (
                <div
                  className="pointer-events-none absolute z-10 w-[2px] -translate-x-1/2 bg-primary/70"
                  style={{
                    left: VASTE_KOLOMMEN + vandaagPos * kolombreedte,
                    top: KOPHOOGTE,
                    height: rijen.length * RIJHOOGTE,
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hover-popup via een portal: sticky cellen vormen elk een eigen stacking context. */}
      {hover && createPortal(<HoverKaart rij={hover.rij} top={hover.top} left={hover.left} pijl={hover.pijl} vandaag={vandaag} />, document.body)}
    </div>
  );
}

function HoverKaart({ rij, top, left, pijl, vandaag }: { rij: Rij; top: number; left: number; pijl: number; vandaag: string }) {
  const { campagne, status } = rij;
  const cijfers = overzichtCijfers(campagne, campagne.laatsteAnalyse?.kerncijfers);
  const dagen = looptijdDagen(campagne.startdatum, campagne.einddatum);
  const verstreken = verstrekenPct(campagne.startdatum, campagne.einddatum, vandaag);
  const dagNu = dagen !== null && verstreken !== null ? Math.round((verstreken / 100) * dagen) : null;

  const leads =
    cijfers.leads === null
      ? "—"
      : cijfers.doelLeads
        ? `${cijfers.leads} van ${cijfers.doelLeads}`
        : String(cijfers.leads);

  const regels: [string, React.ReactNode][] = [
    ["Periode", looptijdLabel(campagne.startdatum, campagne.einddatum)],
    [
      "Status",
      status ? (
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_STYLE[status].dot}`} />
          {STATUS_STYLE[status].label}
          {(status === "actief" || status === "bijna-af") && dagNu !== null && dagen !== null && (
            <span className="text-ink-faint">
              · dag {dagNu} van {dagen}
            </span>
          )}
        </span>
      ) : (
        "—"
      ),
    ],
    ["Budget", formatCurrency(campagne.budget)],
    [
      "Uitgaven",
      cijfers.kosten === null
        ? "—"
        : `${formatCurrency(cijfers.kosten)}${cijfers.besteedPct !== null ? ` (${Math.round(cijfers.besteedPct)}%)` : ""}`,
    ],
    ["Leads", leads],
  ];

  return (
    <div
      className="tip-in pointer-events-none fixed z-50 w-72 rounded-panel border border-line bg-card p-3 shadow-dropdown"
      style={{ top, left }}
    >
      <span
        aria-hidden="true"
        className="absolute -top-[6px] h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-l border-t border-line bg-card"
        style={{ left: Math.min(Math.max(pijl, 16), 272) }}
      />
      <p className="font-sans-w7 text-sm font-bold text-ink">{campagne.naam}</p>
      <p className="mt-0.5 text-xs text-ink-faint">
        {[bedrijvenLabel(campagne.bedrijven), campagne.merk, campagne.modellen.join(", ")].filter(Boolean).join(" · ")}
      </p>
      <dl className="mt-2 space-y-1 text-xs text-ink-muted">
        {regels.map(([label, waarde]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt>{label}</dt>
            <dd className="text-right text-ink">{waarde}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 border-t border-line-soft pt-2 text-[11px] text-ink-faint">
        {campagne.laatsteAnalyse
          ? `Laatste analyse ${versieLabel(campagne.laatsteAnalyse.versie, campagne.laatsteAnalyse.geanalyseerdOp)}`
          : "Nog geen analyse"}
        <br />
        Klik om de analyse te openen
      </p>
    </div>
  );
}
