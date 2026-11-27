"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Inlogprompt from "@/components/Inlogprompt";
import AnalyseWeergave, { LabelBadge } from "@/components/marketingAnalyse/AnalyseWeergave";
import ProgressBar from "@/components/ProgressBar";
import CampagneZijbalk from "@/components/marketingAnalyse/CampagneZijbalk";
import AnalysePromptZijbalk from "@/components/marketingAnalyse/AnalysePromptZijbalk";
import SemantiekZijbalk from "@/components/marketingAnalyse/SemantiekZijbalk";
import VolgersZijbalk from "@/components/marketingAnalyse/VolgersZijbalk";
import MerkMailZijbalk from "@/components/marketingAnalyse/MerkMailZijbalk";
import MailLogZijbalk from "@/components/marketingAnalyse/MailLogZijbalk";
import VoorstellenBalk from "@/components/marketingAnalyse/VoorstellenBalk";
import OpzetFilterBalk, { BedrijfFilterBalk } from "@/components/marketingAnalyse/OpzetFilterBalk";
import PlanningKeuze from "@/components/marketingAnalyse/PlanningKeuze";
import { dagNL, type PlanningInvoer } from "@/lib/marketingAnalyse/planning";
import { getBrandLogo } from "@/components/brandLogos";
import { IconBook, IconBrain, IconChevronDown, IconMail, IconNotes, IconPencil, IconPlus, IconShield } from "@/components/icons";
import {
  bedrijfFilterKnoppen,
  bedrijvenLabel,
  filterOpBedrijf,
  filterOpOpzet,
  isLive,
  formatWaarde,
  looptijdLabel,
  opzetFilterKnoppen,
  overzichtCijfers,
  sorteerOpStatus,
  vandaagNL,
  versieLabel,
  type LeadBron,
  type StatusFilter,
} from "@/lib/marketingAnalyse/rekenen";
import { STANDAARD_SEMANTIEK } from "@/lib/marketingAnalyse/standaardSemantiek";
import type { MaCampagne, MaOpzet, MaOverzichtRegel, MaVoorstel, MaZoekronde, Planning } from "@/lib/marketingAnalyse/types";

type Voorstellen = { open: MaVoorstel[]; genegeerd: MaVoorstel[]; laatsteZoekronde: MaZoekronde | null };

const URL_PARAM = "analyse";
/** Het filter op soort analyse (opzet-id) staat ook in de URL: overleeft een refresh, is te delen. */
const FILTER_PARAM = "soort";
/** De soort die standaard aan staat in de filterbalk (sleutel uit `opzetSoort`). */
const STANDAARD_SOORT = "campagne analyse";
/** Het statusfilter (live / niet-live) staat ook in de URL. */
const STATUS_PARAM = "status";
/** Het filter op bedrijf staat ook in de URL. */
const BEDRIJF_PARAM = "bedrijf";

const BEHEER_SLEUTEL = "marketing-analyse-beheer";

function zetUrl(id: string | null, param: string = URL_PARAM) {
  const params = new URLSearchParams(window.location.search);
  if (id) params.set(param, id);
  else params.delete(param);
  const zoek = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${zoek ? `?${zoek}` : ""}`);
}

/** Wat de rekenregel van de planning van een regel nodig heeft. */
function planningInvoer(c: MaOverzichtRegel, opzet: MaOpzet | undefined): PlanningInvoer {
  return {
    planning: c.planning,
    formulier: opzet?.formulier ?? "campagne",
    startdatum: c.startdatum,
    einddatum: c.einddatum,
    laatsteAnalyse: c.laatsteAnalyse ? dagNL(c.laatsteAnalyse.geanalyseerdOp) : null,
  };
}

function AnalysePromptsMenu({
  opzetten,
  isEigenaar,
  onKies,
  onNieuw,
}: {
  opzetten: MaOpzet[];
  isEigenaar: boolean;
  onKies: (opzet: MaOpzet) => void;
  onNieuw: () => void;
}) {
  const [plek, setPlek] = useState<{ top: number; right: number } | null>(null);
  const open = plek !== null;
  const knopRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function wissel() {
    const r = knopRef.current?.getBoundingClientRect();
    setPlek((huidig) => (huidig || !r ? null : { top: r.bottom + 8, right: window.innerWidth - r.right }));
  }

  useEffect(() => {
    if (!open) return;
    const sluit = () => setPlek(null);
    function buiten(e: MouseEvent) {
      const doel = e.target as Node;
      if (!knopRef.current?.contains(doel) && !menuRef.current?.contains(doel)) sluit();
    }
    function toets(e: KeyboardEvent) {
      if (e.key === "Escape") sluit();
    }
    document.addEventListener("mousedown", buiten);
    document.addEventListener("keydown", toets);
    // Vaste positie: bij scrollen of een ander venstermaat klopt hij niet meer, dus dicht.
    window.addEventListener("scroll", sluit, true);
    window.addEventListener("resize", sluit);
    return () => {
      document.removeEventListener("mousedown", buiten);
      document.removeEventListener("keydown", toets);
      window.removeEventListener("scroll", sluit, true);
      window.removeEventListener("resize", sluit);
    };
  }, [open]);

  const zichtbaar = opzetten.filter((o) => o.actief || isEigenaar);

  return (
    <>
      <button
        ref={knopRef}
        type="button"
        onClick={wissel}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-button border border-line bg-card px-4 py-2 text-sm font-medium text-ink vdu:text-ink-muted transition-colors duration-[var(--duur-snel)] hover:bg-surface vdu:ease-merk vdu:hover:border-ink-faint vdu:hover:text-ink vdu:hover:bg-card"
      >
        <IconBrain className="h-4 w-4 text-ink-muted" />
        Analyse prompts
        <IconChevronDown className={`h-4 w-4 text-ink-faint transition-transform duration-[var(--duur-snel)] ${open ? "rotate-180" : ""}`} />
      </button>
      {plek &&
        createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ top: plek.top, right: plek.right }}
          className="fixed z-50 max-h-[70vh] w-80 overflow-y-auto rounded-card border border-line bg-card py-1 shadow-dropdown"
        >
          {zichtbaar.length === 0 && <p className="px-4 py-2 text-sm text-ink-muted">Laden…</p>}
          {zichtbaar.map((o) => (
            <button
              key={o.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setPlek(null);
                onKies(o);
              }}
              className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition-colors hover:bg-surface"
            >
              <span className={o.actief ? "text-ink" : "text-ink-faint"}>{o.naam}</span>
              <span className="whitespace-nowrap text-meta text-ink-faint">
                {!o.actief ? "uitgezet" : !o.heeftPrompt ? "nog geen prompt" : o.standaard ? "standaard" : ""}
              </span>
            </button>
          ))}
          {isEigenaar && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setPlek(null);
                onNieuw();
              }}
              className="flex w-full items-center gap-2 border-t border-line-soft px-4 py-2.5 text-left text-sm font-medium text-ink transition-colors hover:bg-surface"
            >
              <IconPlus className="h-4 w-4 text-ink-muted" />
              Nieuwe opzet
            </button>
          )}
        </div>,
          document.body,
        )}
    </>
  );
}

type TabelProps = {
  campagnes: MaOverzichtRegel[];
  opzetten: Map<string, MaOpzet>;
  vandaag: string;
  planningBezig: Set<string>;
  onOpen: (id: string) => void;
  onBewerk: (c: MaOverzichtRegel) => void;
  onPlanning: (c: MaOverzichtRegel, planning: Planning) => void;
  onVolgers: (c: MaOverzichtRegel) => void;
};

const KOP = "label-theme whitespace-nowrap px-3 py-2.5 font-normal";
const RIJ =
  "cursor-pointer align-top transition-colors duration-[var(--duur-snel)] hover:bg-surface vdu:ease-merk vdu:hover:bg-surface-tint [&>td]:border-t [&>td]:border-line-soft";

/** Groen ademend stipje als de analyse live is (vandaag tussen start en eind), anders grijs. */
function StatusStip({ c, vandaag }: { c: MaOverzichtRegel; vandaag: string }) {
  const live = isLive(c, vandaag);
  const titel = live ? "Live: vandaag valt binnen de looptijd" : "Niet live: vandaag valt buiten de looptijd";
  return (
    <span
      role="img"
      aria-label={titel}
      title={titel}
      className={`mt-1.5 block h-2 w-2 rounded-full ${live ? "live-stip bg-open" : "bg-closed opacity-70"}`}
    />
  );
}

const STIP_KOP = (
  <th className="w-4 py-2.5 pl-6 pr-0">
    <span className="sr-only">Status</span>
  </th>
);

/** De laatste analyse als korte regel onder de naam. */
function LaatsteAnalyse({ c, opzet }: { c: MaOverzichtRegel; opzet: MaOpzet | undefined }) {
  if (c.laatsteAnalyse) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <span>{versieLabel(c.laatsteAnalyse.versie, c.laatsteAnalyse.geanalyseerdOp)}</span>
        <LabelBadge label={c.laatsteAnalyse.label} />
      </span>
    );
  }
  if (opzet && !opzet.heeftPrompt) {
    return (
      <span className="text-negative" title={`Er is nog geen prompt voor ${opzet.naam}; Claude weigert de analyse`}>
        Nog geen prompt
      </span>
    );
  }
  return <span>Nog niet geanalyseerd</span>;
}

function BewerkKnop({ c, onBewerk }: { c: MaOverzichtRegel; onBewerk: (c: MaOverzichtRegel) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onBewerk(c);
      }}
      title="Briefing bewerken"
      aria-label={`Briefing van ${c.naam} bewerken`}
      className="inline-flex h-7 w-7 items-center justify-center rounded-control text-ink-faint transition-colors hover:bg-card hover:text-ink"
    >
      <IconPencil className="h-4 w-4" />
    </button>
  );
}

/** Het mail-icoontje: opent de zijbalk met wie een mail krijgt bij een nieuwe versie. */
function MailKnop({ c, onVolgers }: { c: MaOverzichtRegel; onVolgers: (c: MaOverzichtRegel) => void }) {
  const titel = c.aantalVolgers > 0 ? `${c.aantalVolgers} ${c.aantalVolgers === 1 ? "adres krijgt" : "adressen krijgen"} een mail bij een nieuwe analyse` : "Mail bij een nieuwe analyse";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onVolgers(c);
      }}
      title={titel}
      aria-label={`${titel} — ${c.naam}`}
      className="inline-flex h-7 items-center gap-1 rounded-control px-1.5 text-ink-faint transition-colors hover:bg-card hover:text-ink"
    >
      <IconMail className="h-4 w-4" />
      {c.aantalVolgers > 0 && <span className="text-meta tabular-nums">{c.aantalVolgers}</span>}
    </button>
  );
}

/** Een cel met een bedrag of aantal, een balkje en een regel eronder. */
function BalkCel({
  waarde,
  pct,
  onder,
  toon = "neutraal",
}: {
  waarde: string;
  pct: number | null;
  onder: string;
  /** Kleur van de regel eronder: rood bij boven budget, groen bij een gehaald doel. */
  toon?: "neutraal" | "positief" | "negatief";
}) {
  return (
    <div className="flex min-w-[150px] flex-col gap-1.5">
      <span className="tabular-nums vdu:font-semibold text-ink">{waarde}</span>
      {pct !== null ? <ProgressBar percent={pct} className="h-1 max-w-40" /> : null}
      <span className={`text-meta ${toon === "negatief" ? "text-negative" : toon === "positief" ? "text-positive" : "text-ink-faint"}`}>
        {onder}
      </span>
    </div>
  );
}

const BRON_UITLEG: Record<LeadBron, string> = {
  syntec:
    "Syntec, omdat het doel dat zegt: alleen leads met kanaalgroep Internet en udenhout.nl in Kanaal of Onderwerp, van de soort uit het doel",
  ga4: "Google Analytics (standaard): lead-events van de soort uit het doel, in sessies die op de campagnepagina('s) begonnen",
};

/** Eén regel in de leadkolom: het getal, en ernaast wat het is. */
function LeadRegel({ waarde, naam, soort, title }: { waarde: string; naam: string; soort: string | null; title: string }) {
  return (
    <div className="flex items-baseline gap-2.5" title={title}>
      <span className="min-w-[2.5rem] text-right vdu:font-semibold tabular-nums text-ink">{waarde}</span>
      <span className="text-meta text-ink-faint">
        {naam}
        {soort ? ` · ${soort}` : ""}
      </span>
    </div>
  );
}

/**
 * De leadkolom (besluit van de eigenaar, 27 november 2026): altijd de leads in Google Analytics,
 * en bij Van den Udenhout met merk en model ook de internetleads en orders uit Syntec. Ontbreekt
 * merk of model, dan een knop naar de briefing; bij een ander bedrijf een rustige regel.
 */
function LeadsCel({
  o,
  geanalyseerd,
  c,
  onBewerk,
}: {
  o: ReturnType<typeof overzichtCijfers>;
  geanalyseerd: boolean;
  c: MaOverzichtRegel;
  onBewerk: (c: MaOverzichtRegel) => void;
}) {
  const getal = (n: number | null) => (!geanalyseerd ? "—" : n === null ? "–" : formatWaarde(n));
  const s = o.syntec;
  const vdu = s.stand === "cijfers" && s.alleenVdu ? " (alleen VDU)" : "";
  return (
    <div className="flex min-w-[230px] flex-col gap-1">
      <LeadRegel
        waarde={getal(o.ga4Leads)}
        naam="Google Analytics"
        soort={o.oudeTelling ? "alle lead-events" : o.ga4Soort}
        title={
          o.oudeTelling
            ? "Uit een analyse van vóór de leadregel van 25 november 2026: alle lead-events in GA4. De volgende analyse telt alleen de soort uit het doel."
            : BRON_UITLEG.ga4
        }
      />
      {s.stand === "cijfers" ? (
        <>
          <LeadRegel
            waarde={getal(s.leads)}
            naam={`Syntec internet${vdu}`}
            soort={s.leadsSoort}
            title={`Leads in Syntec met kanaalgroep Internet, voor merk en model in de periode${s.alleenVdu ? ", alleen Van den Udenhout" : ""}${geanalyseerd && s.leads === null ? ". Komt bij de volgende analyse." : ""}`}
          />
          <LeadRegel
            waarde={getal(s.orders)}
            naam={`Syntec orders${vdu}`}
            soort={s.ordersSoort}
            title={`Orders in Syntec voor merk en model in de periode; welke orders tellen staat in de briefing (standaard alle klantgroepen, nieuw en gebruikt)${s.alleenVdu ? ", alleen Van den Udenhout" : ""}${geanalyseerd && s.orders === null ? ". Komt bij de volgende analyse." : ""}`}
          />
        </>
      ) : s.stand === "briefing" ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onBewerk(c);
          }}
          title="Syntec zoekt leads en orders op merk en model. Vul ze in de briefing in; de volgende analyse haalt ze op."
          className="mt-0.5 self-start text-left text-meta text-orange-dark underline decoration-dotted underline-offset-2 hover:text-ink"
        >
          Vul {s.mist} in voor Syntec-leads en orders
        </button>
      ) : (
        <span className="text-meta text-ink-faint" title="Syntec-leads en -orders bestaan alleen voor Van den Udenhout.">
          Geen Syntec-data voor dit bedrijf
        </span>
      )}
    </div>
  );
}

/**
 * Campagne-analyses: status, campagne, uitgaven tegen budget, gezamenlijke CTR van de
 * advertentiekanalen, bezoekers op de campagnepagina, leads (met bron) en het leaddoel met
 * hoeveel er gehaald is, en rechts de planning. De cijfers komen uit de laatste analyse.
 */
function CampagneAnalyseTabel({ campagnes, opzetten, vandaag, planningBezig, onOpen, onBewerk, onPlanning, onVolgers }: TabelProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-label text-ink-faint">
            {STIP_KOP}
            <th className={`${KOP} pl-3`}>Campagne</th>
            <th className={KOP} title="Mediakosten uit Google Ads, Meta Ads en LinkedIn Ads, tegen het totaalbudget">
              Uitgaven
            </th>
            <th className={KOP} title="Alle klikken ÷ alle vertoningen van Google Ads, Meta Ads en LinkedIn Ads samen">
              CTR
            </th>
            <th className={KOP} title="Sessies die op de campagnepagina('s) begonnen, uit elk kanaal (GA4)">
              Bezoekers
            </th>
            <th
              className={KOP}
              title="Leads in Google Analytics; bij Van den Udenhout met merk en model ook de internetleads en orders uit Syntec"
            >
              Leads en orders
            </th>
            <th className={KOP} title="Het aantal leads uit het doel van de briefing, en hoeveel daarvan gehaald is">
              Doel leads
            </th>
            <th className="px-3 py-2.5" title="Hoe vaak “voer de analyseronde uit” deze campagne maakt">
              <span className="label-theme font-normal">Planning</span>
            </th>
            <th className="w-24 px-4 py-2.5">
              <span className="sr-only">Briefing en mail</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {campagnes.map((c) => {
            const Logo = c.merk ? getBrandLogo(c.merk) : null;
            const opzet = opzetten.get(c.opzetId);
            const o = overzichtCijfers(c, c.laatsteAnalyse?.kerncijfers);
            const geanalyseerd = Boolean(c.laatsteAnalyse);
            return (
              <tr key={c.id} onClick={() => onOpen(c.id)} className={RIJ}>
                <td className="py-3 pl-6 pr-0">
                  <StatusStip c={c} vandaag={vandaag} />
                </td>
                <td className="max-w-[340px] px-3 py-3">
                  <div className="flex items-center gap-2">
                    {Logo && <Logo role="img" aria-label={c.merk ?? undefined} className="h-4 w-4 shrink-0 text-ink-muted" />}
                    <p className="truncate font-semibold text-ink" title={c.naam}>
                      {c.naam}
                    </p>
                  </div>
                  <p className="mt-0.5 text-meta text-ink-faint">
                    {opzet && !opzet.standaard && `${opzet.naam} · `}
                    {bedrijvenLabel(c.bedrijven)} · {looptijdLabel(c.startdatum, c.einddatum)}
                  </p>
                  <p className="mt-1 text-meta text-ink-faint">
                    <LaatsteAnalyse c={c} opzet={opzet} />
                  </p>
                </td>
                <td className="px-3 py-3">
                  <BalkCel
                    waarde={geanalyseerd ? formatWaarde(o.kosten, "euro") : "—"}
                    pct={o.besteedPct}
                    toon={o.besteedPct !== null && o.besteedPct > 100 ? "negatief" : "neutraal"}
                    onder={
                      o.budget === null
                        ? "Geen budget opgegeven"
                        : o.besteedPct === null
                          ? `Budget ${formatWaarde(o.budget, "euro")}`
                          : `${formatWaarde(o.besteedPct, "procent")} van ${formatWaarde(o.budget, "euro")}`
                    }
                  />
                </td>
                <td className="px-3 py-3" title="Alle klikken ÷ alle vertoningen van Google Ads, Meta Ads en LinkedIn Ads samen">
                  <div className="flex min-w-[110px] flex-col gap-1.5">
                    <span className="tabular-nums vdu:font-semibold text-ink">{geanalyseerd ? formatWaarde(o.ctr, "procent") : "—"}</span>
                    <span className="text-meta text-ink-faint">
                      {geanalyseerd && o.ctr === null ? "Bij de volgende analyse" : "Google, Meta en LinkedIn"}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3" title="Sessies die op de campagnepagina('s) begonnen, uit elk kanaal (GA4)">
                  <div className="flex min-w-[110px] flex-col gap-1.5">
                    <span className="tabular-nums vdu:font-semibold text-ink">{geanalyseerd ? formatWaarde(o.bezoekers) : "—"}</span>
                    <span className="text-meta text-ink-faint">Op de campagnepagina</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <LeadsCel o={o} geanalyseerd={geanalyseerd} c={c} onBewerk={onBewerk} />
                </td>
                <td
                  className="px-3 py-3"
                  title={
                    o.syntecNietMogelijk
                      ? "Het doel noemt Syntec, maar Syntec geldt alleen voor een analyse die uitsluitend over Van den Udenhout gaat. Daarom gemeten in Google Analytics."
                      : BRON_UITLEG[o.bron]
                  }
                >
                  <BalkCel
                    waarde={o.doelLeads !== null ? formatWaarde(o.doelLeads) : "—"}
                    pct={o.gehaaldPct}
                    toon={o.gehaaldPct !== null && o.gehaaldPct >= 100 ? "positief" : "neutraal"}
                    onder={
                      o.doelLeads === null
                        ? "Geen aantal in het doel"
                        : o.gehaaldPct === null
                          ? "Nog niet gemeten"
                          : o.bron === "syntec"
                            ? `${formatWaarde(o.gehaaldPct, "procent")} gehaald · Syntec (${formatWaarde(o.leads)} websiteleads)`
                            : `${formatWaarde(o.gehaaldPct, "procent")} gehaald · GA4`
                    }
                  />
                </td>
                <td className="px-3 py-3">
                  <PlanningKeuze
                    regel={planningInvoer(c, opzet)}
                    naam={c.naam}
                    vandaag={vandaag}
                    bezig={planningBezig.has(c.id)}
                    onKies={(p) => onPlanning(c, p)}
                    compact
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <BewerkKnop c={c} onBewerk={onBewerk} />
                  <MailKnop c={c} onVolgers={onVolgers} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Rapportages en andere opzetten zonder funnel: alleen naam, laatste analyse en planning. */
function RapportageTabel({ campagnes, opzetten, vandaag, planningBezig, onOpen, onBewerk, onPlanning, onVolgers }: TabelProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-label text-ink-faint">
            {STIP_KOP}
            <th className={`${KOP} pl-3`}>Rapportage</th>
            <th className={KOP}>Laatste analyse</th>
            <th className="w-48 px-3 py-2.5" title="Hoe vaak “voer de analyseronde uit” deze rapportage maakt">
              <span className="label-theme font-normal">Planning</span>
            </th>
            <th className="w-24 px-4 py-2.5">
              <span className="sr-only">Briefing en mail</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {campagnes.map((c) => {
            const opzet = opzetten.get(c.opzetId);
            return (
              <tr key={c.id} onClick={() => onOpen(c.id)} className={RIJ}>
                <td className="py-3 pl-6 pr-0">
                  <StatusStip c={c} vandaag={vandaag} />
                </td>
                <td className="max-w-[420px] px-3 py-3">
                  <p className="truncate font-semibold text-ink" title={c.naam}>
                    {c.naam}
                  </p>
                  <p className="mt-0.5 text-meta text-ink-faint">
                    {opzet ? `${opzet.naam} · ` : ""}
                    {bedrijvenLabel(c.bedrijven)} · {c.periodeTekst || "Geen periode"}
                  </p>
                </td>
                <td className="px-3 py-3 text-ink">
                  <LaatsteAnalyse c={c} opzet={opzet} />
                </td>
                <td className="px-3 py-3">
                  <PlanningKeuze
                    regel={planningInvoer(c, opzet)}
                    naam={c.naam}
                    vandaag={vandaag}
                    bezig={planningBezig.has(c.id)}
                    onKies={(p) => onPlanning(c, p)}
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <BewerkKnop c={c} onBewerk={onBewerk} />
                  <MailKnop c={c} onVolgers={onVolgers} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Campagne-analyses en rapportages onder elkaar, elk met hun eigen kolommen. */
function OverzichtTabellen(props: TabelProps) {
  const isRapportage = (c: MaOverzichtRegel) => props.opzetten.get(c.opzetId)?.formulier === "rapportage";
  const campagnes = props.campagnes.filter((c) => !isRapportage(c));
  const rapportages = props.campagnes.filter(isRapportage);
  return (
    <>
      {campagnes.length > 0 && <CampagneAnalyseTabel {...props} campagnes={campagnes} />}
      {rapportages.length > 0 && (
        <div className={campagnes.length > 0 ? "border-t border-line-soft pt-2" : ""}>
          <RapportageTabel {...props} campagnes={rapportages} />
        </div>
      )}
    </>
  );
}

export default function MarketingAnalysePaneel({ ingelogd }: { ingelogd: boolean }) {
  const [campagnes, setCampagnes] = useState<MaOverzichtRegel[] | null>(null);
  const [opzetten, setOpzetten] = useState<MaOpzet[]>([]);
  const [bedrijven, setBedrijven] = useState<string[]>(STANDAARD_SEMANTIEK.bedrijven);
  const [isEigenaar, setIsEigenaar] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [zijbalk, setZijbalk] = useState<{ campagne: MaCampagne | null; voorstel?: MaVoorstel; startOpzetId?: string } | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [voorstellen, setVoorstellen] = useState<Voorstellen | null>(null);
  const [voorstelBezig, setVoorstelBezig] = useState<Set<string>>(new Set());
  const [paneel, setPaneel] = useState<
    { soort: "prompt"; opzetId: string | null } | { soort: "semantiek" } | { soort: "merk-mail" } | { soort: "mails" } | null
  >(null);
  // Analyse prompts en Semantic layer staan achter het schildje: ze zijn vooral voor beheerders.
  const [beheerOpen, setBeheerOpen] = useState(false);
  const [status, setStatus] = useState<StatusFilter | null>(null);
  const [bedrijfFilter, setBedrijfFilter] = useState<string | null>(null);
  const [planningBezig, setPlanningBezig] = useState<Set<string>>(new Set());
  const [volgersVan, setVolgersVan] = useState<MaOverzichtRegel | null>(null);

  const laad = useCallback(() => {
    fetch("/api/marketing-analyse")
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          campagnes?: MaOverzichtRegel[];
          opzetten?: MaOpzet[];
          isEigenaar?: boolean;
          fout?: string;
        };
        if (!res.ok) throw new Error(data.fout ?? "Kon de campagnes niet laden.");
        setCampagnes(data.campagnes ?? []);
        setOpzetten(data.opzetten ?? []);
        setIsEigenaar(Boolean(data.isEigenaar));
        setFout(null);
      })
      .catch((err) => setFout(err instanceof Error ? err.message : String(err)));
    // De voorgestelde analyses staan los: lukt dat niet, dan staat de balk er gewoon niet.
    fetch("/api/marketing-analyse/voorstellen")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Voorstellen | null) => {
        if (data) setVoorstellen({ open: data.open ?? [], genegeerd: data.genegeerd ?? [], laatsteZoekronde: data.laatsteZoekronde ?? null });
      })
      .catch(() => {});
    // De keuzelijst Bedrijf komt uit de semantic layer; lukt dat niet, dan de startlijst.
    fetch("/api/marketing-analyse/semantiek")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { semantiek?: { inhoud?: { bedrijven?: string[] } } } | null) => {
        const lijst = data?.semantiek?.inhoud?.bedrijven;
        if (lijst && lijst.length > 0) setBedrijven(lijst);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(BEHEER_SLEUTEL) === "open") setBeheerOpen(true);
    } catch {
      // Geen opslag (privévenster): dan gewoon dicht.
    }
  }, []);

  function wisselBeheer() {
    const open = !beheerOpen;
    setBeheerOpen(open);
    try {
      window.localStorage.setItem(BEHEER_SLEUTEL, open ? "open" : "dicht");
    } catch {
      // Niet erg: alleen een gemak.
    }
  }

  useEffect(() => {
    if (!ingelogd) return;
    laad();
    const params = new URLSearchParams(window.location.search);
    const gevraagd = params.get(URL_PARAM);
    if (gevraagd) setOpenId(gevraagd);
    const soort = params.get(FILTER_PARAM);
    if (soort) setFilter(soort);
    const st = params.get(STATUS_PARAM);
    if (st === "live" || st === "niet-live") setStatus(st);
    const bf = params.get(BEDRIJF_PARAM);
    if (bf) setBedrijfFilter(bf);
  }, [ingelogd, laad]);

  // De pagina-header van AppShell (titel + ondertitel) wijkt voor de kruimelrij zodra een analyse openstaat.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("ma-detail", { detail: Boolean(openId) }));
    return () => {
      window.dispatchEvent(new CustomEvent("ma-detail", { detail: false }));
    };
  }, [openId]);

  function open(id: string | null) {
    setOpenId(id);
    zetUrl(id);
    window.scrollTo({ top: 0 });
  }

  function kiesFilter(soort: string) {
    setFilter(soort);
    zetUrl(soort, FILTER_PARAM);
  }

  function kiesBedrijf(b: string | null) {
    setBedrijfFilter(b);
    zetUrl(b, BEDRIJF_PARAM);
  }

  function kiesStatus(st: StatusFilter | null) {
    setStatus(st);
    zetUrl(st, STATUS_PARAM);
  }

  function bijgewerkt(c: MaCampagne) {
    setCampagnes((lijst) => {
      if (!lijst) return lijst;
      if (lijst.some((x) => x.id === c.id)) return lijst.map((x) => (x.id === c.id ? { ...x, ...c } : x));
      return [{ ...c, laatsteAnalyse: null, aantalAnalyses: 0, aantalVolgers: 0 }, ...lijst];
    });
  }

  /** De planning omzetten: meteen in beeld, terug als het niet lukt. */
  async function kiesPlanning(c: MaOverzichtRegel, planning: Planning) {
    const vorige = c.planning;
    setPlanningBezig((s) => new Set(s).add(c.id));
    bijgewerkt({ ...c, planning, analyseRonde: planning !== "uit" });
    try {
      const res = await fetch(`/api/marketing-analyse?id=${encodeURIComponent(c.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planning }),
      });
      const data = (await res.json().catch(() => ({}))) as { campagne?: MaCampagne; fout?: string };
      if (!res.ok || !data.campagne) throw new Error(data.fout ?? "Kon de planning niet aanpassen.");
      bijgewerkt(data.campagne);
    } catch (err) {
      bijgewerkt({ ...c, planning: vorige, analyseRonde: vorige !== "uit" });
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setPlanningBezig((s) => {
        const n = new Set(s);
        n.delete(c.id);
        return n;
      });
    }
  }

  /** Negeren of terugzetten: meteen in beeld, terug als het niet lukt. */
  async function zetVoorstel(v: MaVoorstel, actie: "negeren" | "terugzetten") {
    const vorige = voorstellen;
    setVoorstelBezig((s) => new Set(s).add(v.id));
    setVoorstellen((h) => {
      if (!h) return h;
      const open = h.open.filter((x) => x.id !== v.id);
      const genegeerd = h.genegeerd.filter((x) => x.id !== v.id);
      return actie === "negeren"
        ? { ...h, open, genegeerd: [{ ...v, status: "genegeerd" }, ...genegeerd] }
        : { ...h, open: [{ ...v, status: "open" }, ...open], genegeerd };
    });
    try {
      const res = await fetch(`/api/marketing-analyse/voorstellen?id=${encodeURIComponent(v.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actie }),
      });
      const data = (await res.json().catch(() => ({}))) as { fout?: string };
      if (!res.ok) throw new Error(data.fout ?? "Kon het voorstel niet aanpassen.");
    } catch (err) {
      setVoorstellen(vorige);
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setVoorstelBezig((s) => {
        const n = new Set(s);
        n.delete(v.id);
        return n;
      });
    }
  }

  if (!ingelogd) return <Inlogprompt tekst="Log in om de marketing analyses te bekijken." />;

  const geopend = campagnes?.find((c) => c.id === openId) ?? null;
  const opzetPerId = new Map(opzetten.map((o) => [o.id, o]));
  const promptOpzet = paneel?.soort === "prompt" && paneel.opzetId ? (opzetPerId.get(paneel.opzetId) ?? null) : null;
  const vandaag = vandaagNL();
  // De aantallen op de soortknoppen tellen binnen het statusfilter.
  const binnenStatus = (c: MaOverzichtRegel) => status === null || isLive(c, vandaag) === (status === "live");
  const alle = campagnes ?? [];
  const bedrijfKnoppen = bedrijfFilterKnoppen(bedrijven, alle);
  // Een bedrijf uit de URL dat er niet (meer) is, telt als Alle.
  const actiefBedrijf = bedrijfKnoppen.find((b) => b.naam.toLowerCase() === bedrijfFilter?.trim().toLowerCase())?.naam ?? null;
  const vanBedrijf = filterOpBedrijf(alle, actiefBedrijf);
  const filterKnoppen = opzetFilterKnoppen(
    opzetten,
    vanBedrijf.map((c) => ({ opzetId: c.opzetId, lopend: binnenStatus(c) })),
  );
  // Er staat altijd precies één soort aan: soorten met andere kolommen komen nooit in één lijst.
  // Standaard (en bij een soort uit de URL die er niet meer is) is dat Campagne analyse, of anders
  // de eerste soort.
  const filterKnop =
    (filter !== null ? filterKnoppen.find((k) => k.id === filter) : undefined) ??
    filterKnoppen.find((k) => k.id === STANDAARD_SOORT) ??
    filterKnoppen[0] ??
    null;
  const actiefFilter = filterKnop?.id ?? null;
  const filterHeeftActieve = Boolean(filterKnop?.opzetIds.some((id) => opzetPerId.get(id)?.actief));
  const gefilterd = filterOpOpzet(vanBedrijf, filterKnop?.opzetIds ?? null);
  // De aantallen op de bedrijfsknoppen tellen binnen het statusfilter en het filter op soort.
  const bedrijfKnoppenGeteld = bedrijfFilterKnoppen(
    bedrijven,
    filterOpOpzet(alle, filterKnop?.opzetIds ?? null).filter(binnenStatus),
  ).filter((k) => bedrijfKnoppen.some((b) => b.naam === k.naam));
  const zichtbaar = sorteerOpStatus(gefilterd, vandaag, status);
  const aantalLive = gefilterd.filter((c) => isLive(c, vandaag)).length;
  const ingepland = zichtbaar.filter((c) => c.planning !== "uit").length;
  const statusNaam = status === "live" ? "Live" : status === "niet-live" ? "Niet live" : null;

  const knoppen = (
    <div className="flex items-center gap-2">
      {beheerOpen && (
        <div id="ma-beheer" className="flex items-center gap-2">
          <AnalysePromptsMenu
            opzetten={opzetten}
            isEigenaar={isEigenaar}
            onKies={(o) => setPaneel({ soort: "prompt", opzetId: o.id })}
            onNieuw={() => setPaneel({ soort: "prompt", opzetId: null })}
          />
          <button
            type="button"
            onClick={() => setPaneel({ soort: "semantiek" })}
            className="flex items-center gap-2 rounded-button border border-line bg-card px-4 py-2 text-sm font-medium text-ink vdu:text-ink-muted transition-colors duration-[var(--duur-snel)] hover:bg-surface vdu:ease-merk vdu:hover:border-ink-faint vdu:hover:text-ink vdu:hover:bg-card"
          >
            <IconBook className="h-4 w-4 text-ink-muted" />
            Semantic layer
          </button>
          {isEigenaar && (
            <button
              type="button"
              onClick={() => setPaneel({ soort: "mails" })}
              title="Wie wanneer welke analyse per mail kreeg"
              className="flex items-center gap-2 rounded-button border border-line bg-card px-4 py-2 text-sm font-medium text-ink vdu:text-ink-muted transition-colors duration-[var(--duur-snel)] hover:bg-surface vdu:ease-merk vdu:hover:border-ink-faint vdu:hover:text-ink vdu:hover:bg-card"
            >
              <IconNotes className="h-4 w-4 text-ink-muted" />
              Verzonden e-mails
            </button>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={wisselBeheer}
        aria-expanded={beheerOpen}
        aria-controls="ma-beheer"
        aria-label={beheerOpen ? "Beheer verbergen" : "Beheer: Analyse prompts, Semantic layer en Verzonden e-mails"}
        title={beheerOpen ? "Beheer verbergen" : "Beheer: Analyse prompts, Semantic layer en Verzonden e-mails"}
        className={`flex items-center justify-center self-stretch rounded-button border px-2.5 transition-colors duration-[var(--duur-snel)] ${
          beheerOpen ? "border-line vdu:border-ink-faint bg-surface text-ink" : "border-line bg-card text-ink-muted hover:bg-surface vdu:hover:border-ink-faint vdu:hover:bg-card hover:text-ink"
        }`}
      >
        <IconShield className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setPaneel({ soort: "merk-mail" })}
        className="flex items-center gap-2 rounded-button border border-line bg-card px-4 py-2 text-sm font-medium text-ink vdu:text-ink-muted transition-colors duration-[var(--duur-snel)] hover:bg-surface vdu:ease-merk vdu:hover:border-ink-faint vdu:hover:text-ink vdu:hover:bg-card"
      >
        <IconMail className="h-4 w-4 text-ink-muted" />
        E-mail settings
      </button>
      {!geopend && (
        <button
          type="button"
          // Staat het filter op een soort, dan begint de nieuwe analyse met die opzet.
          onClick={() => setZijbalk({ campagne: null, startOpzetId: filterKnop?.startOpzetId ?? undefined })}
          className="flex items-center gap-2 rounded-button bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors duration-[var(--duur-snel)] vdu:ease-merk hover:bg-primary-dark"
        >
          <IconPlus className="h-4 w-4" />
          Nieuwe analyse
        </button>
      )}
    </div>
  );

  const tabelProps = {
    opzetten: opzetPerId,
    vandaag,
    planningBezig,
    onOpen: (id: string) => open(id),
    onBewerk: (c: MaOverzichtRegel) => setZijbalk({ campagne: c }),
    onPlanning: kiesPlanning,
    onVolgers: (c: MaOverzichtRegel) => setVolgersVan(c),
  };

  return (
    <div className="flex flex-col gap-5">
      {geopend ? (
        <>
          <AnalyseWeergave
            acties={knoppen}
            key={geopend.id}
            campagne={geopend}
            opzet={opzetPerId.get(geopend.opzetId) ?? null}
            isEigenaar={isEigenaar}
            onTerug={() => {
              open(null);
              laad();
            }}
            onBewerk={() => setZijbalk({ campagne: geopend })}
            onCampagneBijgewerkt={bijgewerkt}
          />
        </>
      ) : (
        <>
          {voorstellen && (
            <VoorstellenBalk
              open={voorstellen.open}
              genegeerd={voorstellen.genegeerd}
              laatsteZoekronde={voorstellen.laatsteZoekronde}
              bezig={voorstelBezig}
              onToevoegen={(v) => setZijbalk({ campagne: null, voorstel: v })}
              onNegeren={(v) => zetVoorstel(v, "negeren")}
              onTerugzetten={(v) => zetVoorstel(v, "terugzetten")}
            />
          )}
          {campagnes && bedrijfKnoppenGeteld.length > 0 && (
            <BedrijfFilterBalk
              bedrijven={bedrijfKnoppenGeteld}
              totaal={filterOpOpzet(alle, filterKnop?.opzetIds ?? null).filter(binnenStatus).length}
              gekozen={actiefBedrijf}
              onKies={kiesBedrijf}
            />
          )}
          {campagnes && filterKnoppen.length > 0 && (
            <OpzetFilterBalk
              knoppen={filterKnoppen}
              aantalLive={aantalLive}
              aantalNietLive={gefilterd.length - aantalLive}
              status={status}
              onStatus={kiesStatus}
              gekozen={actiefFilter}
              onKies={kiesFilter}
            />
          )}
          <section className="kaart-accent overflow-hidden rounded-panel border border-line bg-card shadow-card">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-6 py-4">
              <div>
                <h2 className="label-theme text-label text-ink-muted">
                  {statusNaam ? `${statusNaam} analyses` : "Analyses"}
                  {actiefBedrijf && <span className="text-ink"> · {actiefBedrijf}</span>}
                  {filterKnop && <span className="text-ink"> · {filterKnop.naam}</span>}
                </h2>
                <p className="mt-0.5 text-meta text-ink-faint">
                  Cijfers uit de laatste analyse. Klik op een regel voor de volledige analyse.
                  {ingepland > 0 && ` ${ingepland} ${ingepland === 1 ? "staat" : "staan"} ingepland.`}
                </p>
              </div>
              {knoppen}
            </header>
            {fout && <p className="px-6 py-3 text-sm text-negative">{fout}</p>}
            {!campagnes ? (
              !fout && <p className="px-6 py-5 text-sm text-ink-muted">Laden…</p>
            ) : zichtbaar.length === 0 && (filterKnop || status || actiefBedrijf) ? (
              <div className="px-6 py-10 text-center">
                <p className="font-semibold text-ink">
                  Geen {statusNaam ? `${statusNaam.toLowerCase()} ` : ""}analyses{actiefBedrijf ? ` voor ${actiefBedrijf}` : ""}
                  {filterKnop ? ` van het soort ${filterKnop.naam}` : ""}
                </p>
                <p className="mx-auto mt-1 max-w-lg text-sm text-ink-muted">
                  {filterKnop && filterHeeftActieve ? "Maak er een aan met Nieuwe analyse" : ""}
                  {(status || actiefBedrijf) && (
                    <>
                      {filterKnop && filterHeeftActieve ? ", of " : ""}
                      <button
                        type="button"
                        onClick={() => {
                          kiesStatus(null);
                          kiesBedrijf(null);
                        }}
                        className="text-ink underline underline-offset-2 hover:text-primary"
                      >
                        {filterKnop && filterHeeftActieve ? "toon alle" : "Toon alle"}
                        {filterKnop ? ` ${filterKnop.naam.toLowerCase()}s` : " analyses"}
                      </button>
                    </>
                  )}
                  .
                </p>
              </div>
            ) : zichtbaar.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="font-semibold text-ink">Nog geen analyses</p>
                <p className="mx-auto mt-1 max-w-lg text-sm text-ink-muted">
                  Maak met Nieuwe analyse een campagne-analyse of een rapportage aan. Zeg daarna in Claude Code dat hij de analyse moet
                  maken; het resultaat verschijnt hier.
                </p>
              </div>
            ) : (
              <OverzichtTabellen campagnes={zichtbaar} {...tabelProps} />
            )}
          </section>
        </>
      )}

      {zijbalk && (
        <CampagneZijbalk
          key={zijbalk.campagne?.id ?? zijbalk.voorstel?.id ?? `nieuw-${zijbalk.startOpzetId ?? ""}`}
          campagne={zijbalk.campagne}
          voorstel={zijbalk.voorstel ?? null}
          startOpzetId={zijbalk.startOpzetId}
          opzetten={opzetten}
          bedrijven={bedrijven}
          isEigenaar={isEigenaar}
          onClose={() => setZijbalk(null)}
          onOpgeslagen={(c) => {
            bijgewerkt(c);
            const uit = zijbalk.voorstel?.id;
            if (uit) setVoorstellen((h) => (h ? { ...h, open: h.open.filter((x) => x.id !== uit) } : h));
          }}
          onVerwijderd={(id) => {
            setCampagnes((lijst) => lijst?.filter((x) => x.id !== id) ?? lijst);
            if (openId === id) open(null);
          }}
        />
      )}
      {paneel?.soort === "prompt" && (paneel.opzetId === null || promptOpzet) && (
        <AnalysePromptZijbalk
          key={paneel.opzetId ?? "nieuw"}
          opzet={promptOpzet}
          bedrijven={bedrijven}
          isEigenaar={isEigenaar}
          onOpzetOpgeslagen={(o) => {
            setOpzetten((lijst) => (lijst.some((x) => x.id === o.id) ? lijst.map((x) => (x.id === o.id ? o : x)) : [...lijst, o]));
            setPaneel({ soort: "prompt", opzetId: o.id });
          }}
          onOpzetVerwijderd={(id) => {
            setOpzetten((lijst) => lijst.filter((x) => x.id !== id));
            setPaneel(null);
          }}
          onClose={() => setPaneel(null)}
        />
      )}
      {volgersVan && (
        <VolgersZijbalk
          key={volgersVan.id}
          campagneId={volgersVan.id}
          naam={volgersVan.naam}
          onAantal={(aantal) =>
            setCampagnes((lijst) => lijst?.map((x) => (x.id === volgersVan.id ? { ...x, aantalVolgers: aantal } : x)) ?? lijst)
          }
          onClose={() => setVolgersVan(null)}
        />
      )}
      {paneel?.soort === "merk-mail" && <MerkMailZijbalk onClose={() => setPaneel(null)} onGewijzigd={laad} />}
      {paneel?.soort === "mails" && (
        <MailLogZijbalk
          onClose={() => setPaneel(null)}
          onOpen={(id) => {
            setPaneel(null);
            open(id);
          }}
        />
      )}
      {paneel?.soort === "semantiek" && (
        <SemantiekZijbalk onClose={() => setPaneel(null)} onOpgeslagen={(inhoud) => setBedrijven(inhoud.bedrijven)} />
      )}
    </div>
  );
}
