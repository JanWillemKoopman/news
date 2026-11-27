"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Inlogprompt from "@/components/Inlogprompt";
import AnalyseWeergave, { LabelBadge } from "@/components/marketingAnalyse/AnalyseWeergave";
import CampagneZijbalk from "@/components/marketingAnalyse/CampagneZijbalk";
import AnalysePromptZijbalk from "@/components/marketingAnalyse/AnalysePromptZijbalk";
import SemantiekZijbalk from "@/components/marketingAnalyse/SemantiekZijbalk";
import VolgersZijbalk from "@/components/marketingAnalyse/VolgersZijbalk";
import MerkMailZijbalk from "@/components/marketingAnalyse/MerkMailZijbalk";
import MailLogZijbalk from "@/components/marketingAnalyse/MailLogZijbalk";
import VoorstellenBalk from "@/components/marketingAnalyse/VoorstellenBalk";
import PlanningKeuze from "@/components/marketingAnalyse/PlanningKeuze";
import Knoppenbalk from "@/components/marketingAnalyse/werkruimte/Knoppenbalk";
import Inspector from "@/components/marketingAnalyse/werkruimte/Inspector";
import { MenuKop, MenuRegel, MenuScheiding, PopoverKnop, Segmenten } from "@/components/marketingAnalyse/werkruimte/Bediening";
import { SectieKop, TEMPO_KOSTEN, TEMPO_LEADS, TempoTekst, VoortgangBalk } from "@/components/marketingAnalyse/werkruimte/Visueel";
import { dagNL, type PlanningInvoer } from "@/lib/marketingAnalyse/planning";
import { getBrandLogo } from "@/components/brandLogos";
import {
  IconBook,
  IconBrain,
  IconCalendar,
  IconChevronDown,
  IconClose,
  IconDots,
  IconFilter,
  IconMail,
  IconNotes,
  IconPencil,
  IconPlus,
} from "@/components/icons";
import {
  bedrijfFilterKnoppen,
  bedrijvenLabel,
  datumKort,
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
import { filterOpMerk, merkFilterKnoppen, portefeuille, type CampagneVoortgang } from "@/lib/marketingAnalyse/portefeuille";
import { STANDAARD_SEMANTIEK } from "@/lib/marketingAnalyse/standaardSemantiek";
import { type MaCampagne, type MaOpzet, type MaOverzichtRegel, type MaVoorstel, type MaZoekronde, type Planning } from "@/lib/marketingAnalyse/types";

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
/** Het filter op merk (sleutel, zie `merkFilterKnoppen`) staat ook in de URL. */
const MERK_PARAM = "merk";

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

/**
 * Het menu "Meer" rechts in de knoppenbalk: alles wat je niet bij elke analyse nodig hebt (E-mail
 * settings, Analyse prompts per opzet, Semantic layer en, voor de eigenaar, Verzonden e-mails).
 * Vervangt het schildje Beheer en de losse knoppen: één vaste, voorspelbare plek.
 */
function MeerMenu({
  opzetten,
  isEigenaar,
  onPrompt,
  onNieuweOpzet,
  onSemantiek,
  onMerkMail,
  onMails,
}: {
  opzetten: MaOpzet[];
  isEigenaar: boolean;
  onPrompt: (o: MaOpzet) => void;
  onNieuweOpzet: () => void;
  onSemantiek: () => void;
  onMerkMail: () => void;
  onMails: () => void;
}) {
  const zichtbaar = opzetten.filter((o) => o.actief || isEigenaar);
  return (
    <PopoverKnop label="Meer acties" titel="Meer: e-mail, prompts, semantic layer" rol="menu" uitlijning="rechts" breedte={300} inhoud={<IconDots />} className="px-2">
      {(sluit) => (
        <>
          <MenuRegel icoon={<IconMail />} onClick={() => (sluit(), onMerkMail())}>
            E-mail settings
          </MenuRegel>
          {isEigenaar && (
            <MenuRegel icoon={<IconNotes />} onClick={() => (sluit(), onMails())}>
              Verzonden e-mails
            </MenuRegel>
          )}
          <MenuRegel icoon={<IconBook />} onClick={() => (sluit(), onSemantiek())}>
            Semantic layer
          </MenuRegel>
          <MenuScheiding />
          <MenuKop>Analyse prompts</MenuKop>
          {zichtbaar.length === 0 && <p className="px-2.5 py-1.5 text-[13px] text-ink-muted">Laden…</p>}
          {zichtbaar.map((o) => (
            <MenuRegel
              key={o.id}
              icoon={<IconBrain />}
              uit={!o.actief}
              onClick={() => (sluit(), onPrompt(o))}
              rechts={!o.actief ? "uitgezet" : !o.heeftPrompt ? "geen prompt" : o.standaard ? "standaard" : ""}
            >
              {o.naam}
            </MenuRegel>
          ))}
          {isEigenaar && (
            <MenuRegel icoon={<IconPlus />} onClick={() => (sluit(), onNieuweOpzet())}>
              Nieuwe opzet
            </MenuRegel>
          )}
        </>
      )}
    </PopoverKnop>
  );
}

type TabelProps = {
  campagnes: MaOverzichtRegel[];
  opzetten: Map<string, MaOpzet>;
  vandaag: string;
  planningBezig: Set<string>;
  gekozen: string | null;
  onKies: (id: string, knop: HTMLElement) => void;
  onBewerk: (c: MaOverzichtRegel) => void;
  onPlanning: (c: MaOverzichtRegel, planning: Planning) => void;
  onVolgers: (c: MaOverzichtRegel) => void;
};

const KOP = "ma-kolomkop whitespace-nowrap px-2.5 py-2.5 text-left font-semibold";
/** De eerste kolom blijft staan bij horizontaal scrollen: een bedrag hoort altijd bij zijn campagne. */
const VAST = "sticky left-0 z-[1] bg-[var(--ma-ondergrond)]";

/** Groen ademend stipje als de analyse live is (vandaag tussen start en eind), anders grijs. */
function StatusStip({ c, vandaag }: { c: MaOverzichtRegel; vandaag: string }) {
  const live = isLive(c, vandaag);
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

function RijActies({ c, onBewerk, onVolgers }: { c: MaOverzichtRegel; onBewerk: (c: MaOverzichtRegel) => void; onVolgers: (c: MaOverzichtRegel) => void }) {
  const titel = c.aantalVolgers > 0 ? `${c.aantalVolgers} ${c.aantalVolgers === 1 ? "adres krijgt" : "adressen krijgen"} een mail bij een nieuwe analyse` : "Mail bij een nieuwe analyse";
  return (
    <div className="flex items-center justify-end gap-0.5">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onBewerk(c);
        }}
        title="Briefing bewerken"
        aria-label={`Briefing van ${c.naam} bewerken`}
        className="ma-knop px-1 text-ink-faint hover:text-ink"
      >
        <IconPencil />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onVolgers(c);
        }}
        title={titel}
        aria-label={`${titel} — ${c.naam}`}
        className="ma-knop gap-0.5 px-1 text-ink-faint hover:text-ink"
      >
        <IconMail />
        {c.aantalVolgers > 0 && <span className="ma-getal text-[12px]">{c.aantalVolgers}</span>}
      </button>
    </div>
  );
}

const BRON_UITLEG: Record<LeadBron, string> = {
  syntec:
    "Syntec, omdat het doel dat zegt: alleen leads met kanaalgroep Internet en udenhout.nl in Kanaal of Onderwerp, van de soort uit het doel",
  ga4: "Google Analytics (standaard): lead-events van de soort uit het doel, in sessies die op de campagnepagina('s) begonnen",
};

/** Eén regel in de leadkolom: het getal rechts uitgelijnd, en ernaast wat het is en de bron. */
function LeadRegel({ waarde, naam, soort, title }: { waarde: string; naam: string; soort: string | null; title: string }) {
  return (
    <div className="grid grid-cols-[44px_minmax(0,1fr)] items-baseline gap-2.5" title={title}>
      <span className="ma-getal text-right text-ink">{waarde}</span>
      <span className="line-clamp-2 text-[11.5px] leading-snug text-ink-faint" title={`${naam}${soort ? ` · ${soort}` : ""}`}>
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
    <div className="flex min-w-[190px] flex-col gap-1">
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
          className="ml-[54px] mt-0.5 self-start text-left text-[11.5px] text-orange-dark underline decoration-dotted underline-offset-2 hover:text-ink"
        >
          Vul {s.mist} in voor Syntec-leads en orders
        </button>
      ) : (
        <span className="ml-[54px] text-[11.5px] text-ink-faint" title="Syntec-leads en -orders bestaan alleen voor Van den Udenhout.">
          Geen Syntec-data voor dit bedrijf
        </span>
      )}
    </div>
  );
}

function rijKlasse(gekozen: boolean) {
  return `cursor-pointer align-top transition-colors duration-[var(--ma-duur-klein)] [&>td]:border-t [&>td]:border-line-soft ${
    gekozen ? "ma-rij-gekozen [&>td:first-child]:bg-[color-mix(in_srgb,var(--color-brand)_8%,var(--ma-ondergrond))]" : "hover:bg-[color-mix(in_srgb,var(--color-ink)_2.5%,transparent)]"
  }`;
}

/** De naam van een campagne als knop: zo is elke regel met het toetsenbord te openen. */
function NaamKnop({ c, onKies }: { c: MaOverzichtRegel; onKies: (id: string, knop: HTMLElement) => void }) {
  const Logo = c.merk ? getBrandLogo(c.merk) : null;
  return (
    <button
      type="button"
      data-campagne={c.id}
      onClick={(e) => {
        e.stopPropagation();
        onKies(c.id, e.currentTarget);
      }}
      className="flex items-center gap-1.5 rounded-[4px] text-left text-[13.5px] font-semibold leading-snug text-ink hover:underline hover:underline-offset-2"
    >
      {Logo && <Logo role="img" aria-label={c.merk ?? undefined} className="h-3.5 w-3.5 shrink-0 text-ink-muted" />}
      <span lang="nl" className="line-clamp-2 hyphens-auto [overflow-wrap:anywhere] max-sm:line-clamp-3">{c.naam}</span>
    </button>
  );
}

/**
 * De campagne-analyses in één tabel (verzoek van de eigenaar, 27 november 2026: Voortgang per
 * campagne en Alle cijfers samengevoegd). Van links naar rechts: campagne, uitgaven tegen het budget,
 * leads tegen het doel (met wat het doel is en of het uit GA4 of Syntec komt), leads en orders, de
 * planning, en bewerken en e-mail. In beide balken is de streep het verstreken deel van de looptijd
 * op de laatste dag van de analyse (`portefeuille.ts`). Een klik op een regel opent het detailpaneel.
 */
function CampagneTabel({
  campagnes,
  voortgang,
  opzetten,
  vandaag,
  planningBezig,
  gekozen,
  onKies,
  onBewerk,
  onPlanning,
  onVolgers,
}: TabelProps & { voortgang: Map<string, CampagneVoortgang> }) {
  return (
    <div className="relative overflow-x-auto rounded-[14px] border border-line bg-[var(--ma-ondergrond)] shadow-subtle">
      <table className="w-full min-w-[900px] border-separate border-spacing-0 text-[13px]">
        <thead>
          <tr>
            <th className={`${KOP} ${VAST} w-[220px] pl-5 max-sm:w-[150px] max-sm:pl-3`}>Campagne</th>
            <th className={KOP} title="Mediakosten uit Google Ads, Meta Ads en LinkedIn Ads, tegen het totaalbudget. De streep is het verstreken deel van de looptijd.">
              Uitgaven
            </th>
            <th className={KOP} title="De leads van de soort uit het doel, tegen het aantal in het doel. De streep is het verstreken deel van de looptijd.">
              Leads tegen doel
            </th>
            <th className={KOP} title="Leads in Google Analytics; bij Van den Udenhout met merk en model ook de internetleads en orders uit Syntec">
              Leads en orders
            </th>
            <th className={KOP} title="Hoe vaak “voer de analyseronde uit” deze campagne maakt">
              Planning
            </th>
            <th className="w-16 px-2 py-2.5">
              <span className="sr-only">Briefing en mail</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {campagnes.map((c) => {
            const opzet = opzetten.get(c.opzetId);
            const o = overzichtCijfers(c, c.laatsteAnalyse?.kerncijfers);
            const v = voortgang.get(c.id);
            const geanalyseerd = Boolean(c.laatsteAnalyse);
            const bron = o.bron === "syntec" ? "Syntec" : "GA4";
            const bronUitleg = o.syntecNietMogelijk
              ? "Het doel noemt Syntec, maar Syntec geldt alleen voor een analyse die uitsluitend over Van den Udenhout gaat. Daarom gemeten in Google Analytics."
              : BRON_UITLEG[o.bron];
            return (
              <tr
                key={c.id}
                onClick={(e) => onKies(c.id, (e.currentTarget.querySelector("[data-campagne]") as HTMLElement) ?? e.currentTarget)}
                className={rijKlasse(gekozen === c.id)}
              >
                <td className={`${VAST} max-w-[240px] py-3 pl-5 pr-3 max-sm:max-w-[150px] max-sm:overflow-hidden max-sm:pl-3`}>
                  <div className="flex items-start gap-2.5">
                    <StatusStip c={c} vandaag={vandaag} />
                    <div className="min-w-0">
                      <NaamKnop c={c} onKies={onKies} />
                      <p className="mt-0.5 text-[11.5px] text-ink-faint">
                        {opzet && !opzet.standaard && `${opzet.naam} · `}
                        {bedrijvenLabel(c.bedrijven)} · {looptijdLabel(c.startdatum, c.einddatum)}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-ink-faint max-sm:hidden">
                        {c.laatsteAnalyse ? (
                          <>
                            {versieLabel(c.laatsteAnalyse.versie, c.laatsteAnalyse.geanalyseerdOp)}
                            {c.laatsteAnalyse.label ? ` · ${c.laatsteAnalyse.label === "eind" ? "eindevaluatie" : "tussentijds"}` : ""}
                          </>
                        ) : (
                          <LaatsteAnalyse c={c} opzet={opzet} />
                        )}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="min-w-[148px] px-2.5 py-3">
                  <p className="ma-getal flex items-baseline gap-1 whitespace-nowrap text-ink">
                    <span className="font-semibold">{geanalyseerd ? formatWaarde(o.kosten, "euro") : "—"}</span>
                    <span className="text-[11.5px] text-ink-faint">{o.budget !== null ? `/ ${formatWaarde(o.budget, "euro")}` : "geen budget"}</span>
                  </p>
                  {o.budget !== null && (
                    <div className="mt-1.5 max-w-[180px]">
                      <VoortgangBalk
                        dun
                        pct={v?.besteedPct ?? null}
                        tijdPct={v?.tijdPct ?? null}
                        label={`${formatWaarde(v?.besteedPct ?? null, "procent")} van het budget besteed bij ${formatWaarde(v?.tijdPct ?? null, "procent")} van de looptijd`}
                      />
                    </div>
                  )}
                  <p className="mt-1 whitespace-nowrap text-[11.5px]">
                    {v?.kostenTempo ? (
                      <TempoTekst {...TEMPO_KOSTEN[v.kostenTempo]} titel={TEMPO_KOSTEN[v.kostenTempo].uitleg} />
                    ) : (
                      <span className="text-ink-faint">{o.budget === null ? "Geen budget in de briefing" : "—"}</span>
                    )}
                    {v?.besteedPct != null && (
                      <span className={`ma-getal ${v.besteedPct > 100 ? "text-negative" : "text-ink-faint"}`}> · {formatWaarde(v.besteedPct, "procent")}</span>
                    )}
                  </p>
                </td>

                <td className="min-w-[160px] px-2.5 py-3" title={`${c.doel ? `Doel in de briefing: ${c.doel}\n` : ""}${bronUitleg}`}>
                  <p className="ma-getal flex items-baseline gap-1 whitespace-nowrap text-ink">
                    <span className="font-semibold">{geanalyseerd ? formatWaarde(o.leads) : "—"}</span>
                    {o.doelLeads !== null && <span className="text-[11.5px] text-ink-faint">/ {formatWaarde(o.doelLeads)}</span>}
                  </p>
                  {o.doelLeads !== null && (
                    <div className="mt-1.5 max-w-[180px]">
                      <VoortgangBalk
                        dun
                        pct={o.gehaaldPct}
                        tijdPct={v?.tijdPct ?? null}
                        label={`${formatWaarde(o.gehaaldPct, "procent")} van het doel bij ${formatWaarde(v?.tijdPct ?? null, "procent")} van de looptijd`}
                      />
                    </div>
                  )}
                  {v?.leadTempo && (
                    <p className="mt-1 whitespace-nowrap text-[11.5px]">
                      <TempoTekst {...TEMPO_LEADS[v.leadTempo]} />
                      <span className="ma-getal text-ink-faint"> · {formatWaarde(o.gehaaldPct, "procent")}</span>
                    </p>
                  )}
                  <p className="mt-1 text-[11.5px] leading-snug text-ink-muted">
                    <span className="text-ink-faint">Doel </span>
                    {o.doelLeads !== null ? `${formatWaarde(o.doelLeads)} ${o.leadSoort ?? "leads"}` : `${o.leadSoort ?? "leads"}, zonder aantal`}
                    <span className="ml-1.5 inline-flex rounded-[4px] border border-line px-1 text-[10.5px] font-semibold leading-[15px] text-ink-muted">{bron}</span>
                  </p>
                </td>

                <td className="px-2.5 py-3">
                  <LeadsCel o={o} geanalyseerd={geanalyseerd} c={c} onBewerk={onBewerk} />
                </td>

                <td className="px-2.5 py-3" onClick={(e) => e.stopPropagation()}>
                  <PlanningKeuze
                    regel={planningInvoer(c, opzet)}
                    naam={c.naam}
                    vandaag={vandaag}
                    bezig={planningBezig.has(c.id)}
                    onKies={(pl) => onPlanning(c, pl)}
                    compact
                  />
                </td>

                <td className="py-3 pl-1 pr-3">
                  <RijActies c={c} onBewerk={onBewerk} onVolgers={onVolgers} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Rapportages en andere opzetten zonder funnel: naam, laatste analyse en planning. */
function RapportageTabel({ campagnes, opzetten, vandaag, planningBezig, gekozen, onKies, onBewerk, onPlanning, onVolgers }: TabelProps) {
  return (
    <div className="relative overflow-x-auto rounded-[14px] border border-line bg-[var(--ma-ondergrond)] shadow-subtle">
      <table className="w-full min-w-[720px] border-separate border-spacing-0 text-[13px]">
        <thead>
          <tr>
            <th className={`${KOP} ${VAST} pl-5`}>Rapportage</th>
            <th className={KOP}>Laatste analyse</th>
            <th className={`${KOP} w-48`} title="Hoe vaak “voer de analyseronde uit” deze rapportage maakt">
              Planning
            </th>
            <th className="w-20 px-3 py-2.5">
              <span className="sr-only">Briefing en mail</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {campagnes.map((c) => {
            const opzet = opzetten.get(c.opzetId);
            return (
              <tr
                key={c.id}
                onClick={(e) => onKies(c.id, (e.currentTarget.querySelector("[data-campagne]") as HTMLElement) ?? e.currentTarget)}
                className={rijKlasse(gekozen === c.id)}
              >
                <td className={`${VAST} max-w-[460px] py-3 pl-5 pr-3`}>
                  <div className="flex items-start gap-2.5">
                    <StatusStip c={c} vandaag={vandaag} />
                    <div className="min-w-0">
                      <NaamKnop c={c} onKies={onKies} />
                      <p className="mt-0.5 text-[11.5px] text-ink-faint">
                        {opzet ? `${opzet.naam} · ` : ""}
                        {bedrijvenLabel(c.bedrijven)} · {c.periodeTekst || "Geen periode"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-ink">
                  <LaatsteAnalyse c={c} opzet={opzet} />
                  {c.laatsteAnalyse?.periodeVan && (
                    <p className="mt-0.5 text-[11.5px] text-ink-faint">periode {looptijdLabel(c.laatsteAnalyse.periodeVan, c.laatsteAnalyse.periodeTot)}</p>
                  )}
                </td>
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <PlanningKeuze
                    regel={planningInvoer(c, opzet)}
                    naam={c.naam}
                    vandaag={vandaag}
                    bezig={planningBezig.has(c.id)}
                    onKies={(p) => onPlanning(c, p)}
                  />
                </td>
                <td className="px-3 py-3">
                  <RijActies c={c} onBewerk={onBewerk} onVolgers={onVolgers} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Een actief filter in de knoppenbalk, met een kruisje om het te wissen. */
function FilterChip({ naam, onWis }: { naam: string; onWis: () => void }) {
  return (
    <span className="ma-groep inline-flex h-[26px] shrink-0 items-center gap-1 rounded-[7px] pl-2.5 pr-1 text-[12.5px] font-medium text-ink">
      {naam}
      <button type="button" onClick={onWis} aria-label={`Filter ${naam} wissen`} title="Filter wissen" className="flex h-5 w-5 items-center justify-center rounded-[5px] text-ink-muted hover:bg-[color-mix(in_srgb,var(--color-ink)_8%,transparent)] hover:text-ink">
        <IconClose className="h-3 w-3" />
      </button>
    </span>
  );
}

/** Eén filterknop: naam en aantal; gekozen = de selectiekleur van de werkruimte. */
function FilterKeuze({ naam, aantal, gekozen, onClick, logo }: { naam: string; aantal: number; gekozen: boolean; onClick: () => void; logo?: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={gekozen}
      onClick={onClick}
      className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[7px] px-2.5 text-[12.5px] transition-colors duration-[var(--ma-duur-klein)] ${
        gekozen
          ? "bg-ink font-medium text-card"
          : "text-ink-muted hover:bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)] hover:text-ink"
      }`}
    >
      {logo}
      {naam}
      <span className={`ma-getal text-[11.5px] ${gekozen ? "opacity-70" : "text-ink-faint"}`}>{aantal}</span>
    </button>
  );
}

/**
 * De filters op bedrijf en merk, als twee rijen boven de voorstellen en de tabel (verzoek van de
 * eigenaar, 27 november 2026). Ze gelden voor allebei: de voorgestelde campagne-analyses en de
 * campagne-analyses zelf. Eén keuze per rij; nog eens klikken of "Alle" wist hem.
 */
function FilterRijen({
  bedrijven,
  totaalBedrijf,
  actiefBedrijf,
  onBedrijf,
  merken,
  totaalMerk,
  actiefMerk,
  onMerk,
  metVoorstellen,
}: {
  bedrijven: { naam: string; aantal: number }[];
  totaalBedrijf: number;
  actiefBedrijf: string | null;
  onBedrijf: (b: string | null) => void;
  merken: { sleutel: string; naam: string; aantal: number }[];
  totaalMerk: number;
  actiefMerk: string | null;
  onMerk: (m: string | null) => void;
  metVoorstellen: boolean;
}) {
  const rij = "flex items-center gap-1 overflow-x-auto [scrollbar-width:none] lg:flex-wrap lg:overflow-visible";
  const label = "w-[58px] shrink-0 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-faint";
  return (
    <section aria-label={`Filter op bedrijf en merk${metVoorstellen ? ", voor de voorstellen en de analyses" : ""}`} className="-mb-2 flex flex-col gap-1.5">
      <div role="group" aria-label="Bedrijf" className={rij}>
        <span className={label}>Bedrijf</span>
        <FilterKeuze naam="Alle" aantal={totaalBedrijf} gekozen={actiefBedrijf === null} onClick={() => onBedrijf(null)} />
        {bedrijven.map((b) => (
          <FilterKeuze key={b.naam} naam={b.naam} aantal={b.aantal} gekozen={actiefBedrijf === b.naam} onClick={() => onBedrijf(actiefBedrijf === b.naam ? null : b.naam)} />
        ))}
      </div>
      {merken.length > 0 && (
        <div role="group" aria-label="Merk" className={rij}>
          <span className={label}>Merk</span>
          <FilterKeuze naam="Alle" aantal={totaalMerk} gekozen={actiefMerk === null} onClick={() => onMerk(null)} />
          {merken.map((m) => {
            const Logo = getBrandLogo(m.naam);
            return (
              <FilterKeuze
                key={m.sleutel}
                naam={m.naam}
                aantal={m.aantal}
                gekozen={actiefMerk === m.sleutel}
                onClick={() => onMerk(actiefMerk === m.sleutel ? null : m.sleutel)}
                logo={Logo ? <Logo role="img" aria-hidden="true" className="h-3 w-3 shrink-0" /> : undefined}
              />
            );
          })}
        </div>
      )}
    </section>
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
  const [status, setStatus] = useState<StatusFilter | null>(null);
  const [bedrijfFilter, setBedrijfFilter] = useState<string | null>(null);
  const [merkFilter, setMerkFilter] = useState<string | null>(null);
  const [planningBezig, setPlanningBezig] = useState<Set<string>>(new Set());
  const [volgersVan, setVolgersVan] = useState<MaOverzichtRegel | null>(null);
  // Het detailpaneel: welke campagne, en welk element het opende (daar gaat de focus naar terug).
  const [inspectorId, setInspectorId] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const inspectorAnker = useRef<HTMLElement | null>(null);
  // Waar je was in het overzicht toen je een analyse opende: daar kom je bij terugkeren weer uit.
  const terug = useRef<{ scrollY: number; id: string } | null>(null);

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
    const mf = params.get(MERK_PARAM);
    if (mf) setMerkFilter(mf);
  }, [ingelogd, laad]);

  // Terug uit een analyse: dezelfde scrollpositie, en de focus op de regel waar je vandaan kwam.
  useEffect(() => {
    if (openId || !terug.current) return;
    const { scrollY, id } = terug.current;
    terug.current = null;
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY });
      document.querySelector<HTMLElement>(`[data-campagne="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
    });
  }, [openId]);

  function open(id: string | null) {
    if (id) {
      terug.current = { scrollY: window.scrollY, id };
      setInspectorOpen(false);
    }
    setOpenId(id);
    zetUrl(id);
    if (id) window.scrollTo({ top: 0 });
  }

  function kiesInspector(id: string, knop: HTMLElement) {
    // Nog eens op dezelfde regel: dicht. Een andere regel: het paneel wisselt meteen van inhoud.
    if (inspectorOpen && inspectorId === id) return sluitInspector();
    inspectorAnker.current = knop;
    setInspectorId(id);
    setInspectorOpen(true);
  }

  const sluitInspector = useCallback(() => {
    setInspectorOpen(false);
    inspectorAnker.current?.focus({ preventScroll: true });
  }, []);

  function kiesFilter(soort: string) {
    setFilter(soort);
    zetUrl(soort, FILTER_PARAM);
  }

  function kiesBedrijf(b: string | null) {
    setBedrijfFilter(b);
    zetUrl(b, BEDRIJF_PARAM);
  }

  function kiesMerk(m: string | null) {
    setMerkFilter(m);
    zetUrl(m, MERK_PARAM);
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

  const vandaag = vandaagNL();
  const alle = useMemo(() => campagnes ?? [], [campagnes]);
  const opzetPerId = useMemo(() => new Map(opzetten.map((o) => [o.id, o])), [opzetten]);

  // ── Filters ── (de regels zijn dezelfde als vóór de redesign; alleen de bediening is anders)
  const binnenStatus = (c: MaOverzichtRegel) => status === null || isLive(c, vandaag) === (status === "live");
  const bedrijfKnoppen = bedrijfFilterKnoppen(bedrijven, alle);
  // Een bedrijf uit de URL dat er niet (meer) is, telt als Alle.
  const actiefBedrijf = bedrijfKnoppen.find((b) => b.naam.toLowerCase() === bedrijfFilter?.trim().toLowerCase())?.naam ?? null;
  // Het merk geldt voor de campagne-analyses en de voorstellen (verzoek van de eigenaar, 27 november 2026).
  const openVoorstellen = voorstellen?.open ?? [];
  const merkKnoppenAlle = merkFilterKnoppen([...alle, ...openVoorstellen]);
  const actiefMerk = merkKnoppenAlle.find((m) => m.sleutel === merkFilter)?.sleutel ?? null;
  const actiefMerkNaam = merkKnoppenAlle.find((m) => m.sleutel === actiefMerk)?.naam ?? null;
  const vanBedrijf = filterOpMerk(filterOpBedrijf(alle, actiefBedrijf), actiefMerk);
  const filterKnoppen = opzetFilterKnoppen(
    opzetten,
    vanBedrijf.map((c) => ({ opzetId: c.opzetId, lopend: binnenStatus(c) })),
  );
  // Er staat altijd precies één soort aan: soorten met andere kolommen komen nooit in één lijst.
  const filterKnop =
    (filter !== null ? filterKnoppen.find((k) => k.id === filter) : undefined) ??
    filterKnoppen.find((k) => k.id === STANDAARD_SOORT) ??
    filterKnoppen[0] ??
    null;
  const filterHeeftActieve = Boolean(filterKnop?.opzetIds.some((id) => opzetPerId.get(id)?.actief));
  const gefilterd = filterOpOpzet(vanBedrijf, filterKnop?.opzetIds ?? null);
  const isCampagneSoort = filterKnop?.id === STANDAARD_SOORT;
  // De aantallen op de knoppen tellen de analyses van deze soort (binnen het statusfilter) en, bij
  // Campagnes, de open voorstellen, telkens binnen het andere filter (bedrijf of merk).
  const binnenSoort = filterOpOpzet(alle, filterKnop?.opzetIds ?? null).filter(binnenStatus);
  const telBasis = [...binnenSoort, ...(isCampagneSoort ? openVoorstellen : [])];
  const bedrijfKnoppenGeteld = bedrijfFilterKnoppen(bedrijven, filterOpMerk(telBasis, actiefMerk)).filter(
    (k) => bedrijfKnoppen.some((b) => b.naam === k.naam) && (k.aantal > 0 || k.naam === actiefBedrijf),
  );
  const totaalBedrijf = filterOpMerk(telBasis, actiefMerk).length;
  const merkKnoppenGeteld = merkFilterKnoppen(filterOpBedrijf(telBasis, actiefBedrijf));
  const totaalMerk = filterOpBedrijf(telBasis, actiefBedrijf).length;
  const voorstellenGefilterd = voorstellen
    ? {
        ...voorstellen,
        open: filterOpMerk(filterOpBedrijf(voorstellen.open, actiefBedrijf), actiefMerk),
        genegeerd: filterOpMerk(filterOpBedrijf(voorstellen.genegeerd, actiefBedrijf), actiefMerk),
      }
    : null;
  const zichtbaar = sorteerOpStatus(gefilterd, vandaag, status);
  const aantalLive = gefilterd.filter((c) => isLive(c, vandaag)).length;
  const statusNaam = status === "live" ? "Live" : status === "niet-live" ? "Niet live" : null;
  const isRapportage = (c: MaOverzichtRegel) => opzetPerId.get(c.opzetId)?.formulier === "rapportage";
  const campagneRegels = zichtbaar.filter((c) => !isRapportage(c));
  const rapportageRegels = zichtbaar.filter(isRapportage);
  const aantalFilters = status ? 1 : 0;

  const p = useMemo(() => portefeuille(campagneRegels, vandaag), [campagneRegels, vandaag]);
  const voortgangPerId = useMemo(() => new Map(p.campagnes.map((c) => [c.id, c])), [p]);
  const regelPerId = useMemo(() => new Map(alle.map((c) => [c.id, c])), [alle]);
  const standVan = p.standVan;
  const standTot = p.standTot;
  const kort = (d: string) => datumKort(d).replace(/ \d{4}$/, "");
  const standLabel = standTot ? (standVan && standVan !== standTot ? `t/m ${kort(standVan)} – ${kort(standTot)}` : `t/m ${kort(standTot)}`) : "Laatste analyse";

  if (!ingelogd) return <Inlogprompt tekst="Log in om de marketing analyses te bekijken." />;

  const geopend = campagnes?.find((c) => c.id === openId) ?? null;
  const promptOpzet = paneel?.soort === "prompt" && paneel.opzetId ? (opzetPerId.get(paneel.opzetId) ?? null) : null;

  const meer = (
    <MeerMenu
      opzetten={opzetten}
      isEigenaar={isEigenaar}
      onPrompt={(o) => setPaneel({ soort: "prompt", opzetId: o.id })}
      onNieuweOpzet={() => setPaneel({ soort: "prompt", opzetId: null })}
      onSemantiek={() => setPaneel({ soort: "semantiek" })}
      onMerkMail={() => setPaneel({ soort: "merk-mail" })}
      onMails={() => setPaneel({ soort: "mails" })}
    />
  );

  const tabelProps: Omit<TabelProps, "campagnes"> = {
    opzetten: opzetPerId,
    vandaag,
    planningBezig,
    gekozen: inspectorOpen ? inspectorId : null,
    onKies: kiesInspector,
    onBewerk: (c: MaOverzichtRegel) => setZijbalk({ campagne: c }),
    onPlanning: kiesPlanning,
    onVolgers: (c: MaOverzichtRegel) => setVolgersVan(c),
  };

  const inspectorRegel = inspectorId ? (regelPerId.get(inspectorId) ?? null) : null;
  // Uit het overzicht zelf, zodat het aandeel tegen dezelfde campagnes staat; anders los berekend.
  const inspectorVoortgang = inspectorId
    ? (p.campagnes.find((c) => c.id === inspectorId) ?? portefeuille(inspectorRegel ? [inspectorRegel] : [], vandaag).campagnes[0] ?? null)
    : null;

  return (
    <div className="ma-werkruimte min-h-screen">
      {geopend ? (
        <AnalyseWeergave
          acties={meer}
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
      ) : (
        <>
          <Knoppenbalk
            titel="Marketing analyse"
            selectie={
              <>
                {filterKnoppen.length > 0 && filterKnop && (
                  <Segmenten
                    label="Soort analyse"
                    waarde={filterKnop.id}
                    onKies={kiesFilter}
                    opties={filterKnoppen.map((k) => ({
                      id: k.id,
                      naam: k.id === STANDAARD_SOORT ? "Campagnes" : "Rapportages",
                      aantal: k.aantal,
                      uit: k.aantal === 0,
                      titel: k.naam,
                    }))}
                  />
                )}
                {isCampagneSoort && (
                  <PopoverKnop
                    label="Periode en vergelijking"
                    titel="Welke periode en waarmee vergeleken"
                    breedte={360}
                    className="ma-groep"
                    inhoud={
                      <>
                        <IconCalendar />
                        <span className="ma-getal">{standLabel}</span>
                        <span className="hidden font-normal text-ink-muted min-[1360px]:inline">· tegen looptijd</span>
                        <IconChevronDown className="!h-3.5 !w-3.5 text-ink-faint" />
                      </>
                    }
                  >
                    {() => (
                      <div className="p-1.5">
                        <MenuKop>Periode</MenuKop>
                        <p className="px-2.5 text-[12.5px] leading-snug text-ink-muted">
                          Elke campagne staat op de stand van zijn laatste analyse: vanaf de start van de looptijd t/m de laatste dag van de
                          analyseperiode.
                        </p>
                        <ul className="mt-2 flex flex-col">
                          {p.campagnes.map((c) => {
                            const r = regelPerId.get(c.id);
                            return (
                              <li key={c.id} className="flex items-baseline justify-between gap-3 rounded-[8px] px-2.5 py-1.5 text-[12.5px]">
                                <span className="min-w-0 truncate font-medium text-ink">{c.naam}</span>
                                <span className="ma-getal shrink-0 text-ink-muted">
                                  {r?.laatsteAnalyse?.periodeVan ? looptijdLabel(r.laatsteAnalyse.periodeVan, r.laatsteAnalyse.periodeTot) : "geen analyse"}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                        <MenuScheiding />
                        <MenuKop>Vergeleken met</MenuKop>
                        <p className="px-2.5 pb-1.5 text-[12.5px] leading-snug text-ink-muted">
                          <span className="font-medium text-ink">Het tempo van de looptijd.</span> Budget en leaddoel × het verstreken deel van de
                          looptijd op die dag. De streep in elke balk is die verwachting; binnen 10 procentpunt heet op schema.
                        </p>
                        <p className="px-2.5 pb-1 text-[11.5px] text-ink-faint">
                          Een vergelijking met de vorige versie staat op de analysepagina zelf (periode-knop).
                        </p>
                      </div>
                    )}
                  </PopoverKnop>
                )}
                <PopoverKnop
                  label="Filters"
                  titel="Filter op status"
                  breedte={300}
                  className="ma-groep"
                  inhoud={
                    <>
                      <IconFilter />
                      <span className="hidden sm:inline">Filters</span>
                      {aantalFilters > 0 && (
                        <span className="ma-getal flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10.5px] font-semibold text-on-primary">
                          {aantalFilters}
                        </span>
                      )}
                    </>
                  }
                >
                  {(sluit) => (
                    <div className="p-1">
                      <MenuKop>Status</MenuKop>
                      <div className="px-1.5 pb-1">
                        <Segmenten<"alle" | StatusFilter>
                          label="Status"
                          waarde={status ?? "alle"}
                          onKies={(s) => kiesStatus(s === "alle" ? null : s)}
                          opties={[
                            { id: "alle", naam: "Alle", aantal: gefilterd.length },
                            { id: "live", naam: "Live", aantal: aantalLive },
                            { id: "niet-live", naam: "Niet live", aantal: gefilterd.length - aantalLive },
                          ]}
                        />
                      </div>
                      <MenuScheiding />
                      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                        <p className="text-[11.5px] leading-snug text-ink-faint">Bedrijf en merk staan boven de lijst.</p>
                        <button
                          type="button"
                          disabled={aantalFilters === 0}
                          onClick={() => {
                            kiesStatus(null);
                            sluit();
                          }}
                          className="ma-knop shrink-0 px-2 text-[12.5px] disabled:opacity-40"
                        >
                          Wis filters
                        </button>
                      </div>
                    </div>
                  )}
                </PopoverKnop>
                {statusNaam && <FilterChip naam={statusNaam} onWis={() => kiesStatus(null)} />}
              </>
            }
            acties={
              <>
                <button
                  type="button"
                  // Staat het filter op een soort, dan begint de nieuwe analyse met die opzet.
                  onClick={() => setZijbalk({ campagne: null, startOpzetId: filterKnop?.startOpzetId ?? undefined })}
                  className="ma-knop ma-knop-primair"
                  title="Nieuwe analyse"
                >
                  <IconPlus />
                  <span className="hidden sm:inline">Nieuwe analyse</span>
                </button>
                {meer}
              </>
            }
          />

          <div className="ma-in mx-auto flex max-w-[1360px] flex-col gap-6 px-3 pb-16 pt-4 sm:px-4 lg:px-6 lg:pt-5">
            {fout && <p className="rounded-[10px] border border-negative/25 bg-negative/5 px-4 py-2.5 text-[13px] text-negative">{fout}</p>}
            {/* Bovenaan, op de plek van de vroegere kerncijfers (verzoek van de eigenaar, 27 november 2026):
                de campagnes die Claude in de advertenties vond en die nog geanalyseerd kunnen worden. */}
            {campagnes && (
              <FilterRijen
                bedrijven={bedrijfKnoppenGeteld}
                totaalBedrijf={totaalBedrijf}
                actiefBedrijf={actiefBedrijf}
                onBedrijf={kiesBedrijf}
                merken={merkKnoppenGeteld}
                totaalMerk={totaalMerk}
                actiefMerk={actiefMerk}
                onMerk={kiesMerk}
                metVoorstellen={isCampagneSoort && openVoorstellen.length > 0}
              />
            )}
            {voorstellenGefilterd && isCampagneSoort && (
              <VoorstellenBalk
                open={voorstellenGefilterd.open}
                genegeerd={voorstellenGefilterd.genegeerd}
                gefilterd={Boolean(actiefBedrijf || actiefMerk)}
                laatsteZoekronde={voorstellenGefilterd.laatsteZoekronde}
                bezig={voorstelBezig}
                onToevoegen={(v) => setZijbalk({ campagne: null, voorstel: v })}
                onNegeren={(v) => zetVoorstel(v, "negeren")}
                onTerugzetten={(v) => zetVoorstel(v, "terugzetten")}
              />
            )}
            {!campagnes ? (
              !fout && <p className="px-1 py-6 text-[13px] text-ink-muted">Laden…</p>
            ) : zichtbaar.length === 0 ? (
              <div className="rounded-[14px] border border-dashed border-line bg-[var(--ma-ondergrond)] px-6 py-10 text-center">
                <p className="ma-kop text-ink">
                  {filterKnop || status || actiefBedrijf || actiefMerk
                    ? `Geen ${statusNaam ? `${statusNaam.toLowerCase()} ` : ""}analyses${actiefBedrijf ? ` voor ${actiefBedrijf}` : ""}${actiefMerkNaam ? ` met ${actiefMerkNaam}` : ""}${filterKnop ? ` van het soort ${filterKnop.naam}` : ""}`
                    : "Nog geen analyses"}
                </p>
                <p className="mx-auto mt-1 max-w-lg text-[13px] text-ink-muted">
                  {filterKnop && filterHeeftActieve ? "Maak er een aan met Nieuwe analyse" : "Maak met Nieuwe analyse een campagne-analyse of een rapportage aan"}
                  {(status || actiefBedrijf || actiefMerk) && (
                    <>
                      {", of "}
                      <button
                        type="button"
                        onClick={() => {
                          kiesStatus(null);
                          kiesBedrijf(null);
                          kiesMerk(null);
                        }}
                        className="text-ink underline underline-offset-2 hover:text-primary"
                      >
                        wis de filters
                      </button>
                    </>
                  )}
                  .
                </p>
              </div>
            ) : (
              <>
                {campagneRegels.length > 0 && (
                  <section aria-labelledby="ma-campagnes" className="flex flex-col gap-3">
                    <SectieKop
                      id="ma-campagnes"
                      titel="Campagne-analyses"
                      uitleg="Cijfers uit de laatste analyse. Balk = bereikt, streep = waar je bij een gelijk tempo zou staan. Klik op een campagne voor de details."
                    />
                    <CampagneTabel campagnes={campagneRegels} voortgang={voortgangPerId} {...tabelProps} />
                  </section>
                )}
                {rapportageRegels.length > 0 && (
                  <section aria-labelledby="ma-rapportages" className="flex flex-col gap-3">
                    <SectieKop id="ma-rapportages" titel="Rapportages" uitleg="Maand-, kwartaal- en maatwerkrapportages. Klik voor de details." />
                    <RapportageTabel campagnes={rapportageRegels} {...tabelProps} />
                  </section>
                )}
              </>
            )}

          </div>

          <Inspector
            regel={inspectorRegel}
            voortgang={inspectorVoortgang}
            open={inspectorOpen && Boolean(inspectorRegel)}
            onSluit={sluitInspector}
            onOpenAnalyse={(id) => open(id)}
            onBriefing={(r) => setZijbalk({ campagne: r })}
            onVolgers={(r) => setVolgersVan(r)}
          />
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
            if (inspectorId === id) setInspectorOpen(false);
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
