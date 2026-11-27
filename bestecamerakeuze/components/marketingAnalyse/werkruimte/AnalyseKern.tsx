"use client";

import AnalyseGrafiek, { kortLabel } from "@/components/marketingAnalyse/AnalyseGrafiek";
import {
  KpiCel,
  KpiOppervlak,
  KplWaarde,
  SectieKop,
  TEMPO_KOSTEN,
  TEMPO_LEADS,
  TempoTekst,
  VoortgangBalk,
  kplUitleg,
} from "@/components/marketingAnalyse/werkruimte/Visueel";
import { leadTempo, versieVerschil } from "@/lib/marketingAnalyse/portefeuille";
import { datumKort, formatWaarde, overzichtCijfers, voortgangVanAnalyse } from "@/lib/marketingAnalyse/rekenen";
import { kostenPer, prognoseBijHuidigTempo } from "@/lib/marketingAnalyse/uitsplitsing";
import type { Grafiek, MaAnalyse, MaResultaat } from "@/lib/marketingAnalyse/types";

/**
 * De kern van een analyse (redesign november 2026): eerst de kerncijfers met waar je ze tegen
 * afzet, dan de ontwikkeling per week. Dezelfde definities als het overzicht (`overzichtCijfers`,
 * `voortgangVanAnalyse`); hier wordt niets nieuw gedefinieerd.
 */

export type Vergelijking = "looptijd" | "vorige";

export interface VorigeVersie {
  versie: number;
  periodeTot: string | null;
  geanalyseerdOp: string;
  semantiekVersie: number | null;
  promptVersie: number | null;
  kerncijfers: MaAnalyse["kerncijfers"];
}

function Verschil({
  nu,
  toen,
  eenheid,
  hogerIsBeter,
  vorige,
}: {
  nu: number | null;
  toen: number | null;
  eenheid: "euro" | "aantal" | "procent";
  /** Weglaten: geen oordeel (uitgaven). */
  hogerIsBeter?: boolean;
  vorige: VorigeVersie;
}) {
  const v = versieVerschil(nu, toen);
  if (!v) return <span className="text-ink-faint">Niet te vergelijken met v{vorige.versie}</span>;
  const punten = eenheid === "procent";
  const gelijk = Math.abs(v.absoluut) < (eenheid === "euro" ? 0.5 : punten ? 0.05 : 0.5);
  const teken = v.absoluut > 0 ? "+" : "−";
  const abs = punten
    ? `${teken}${formatWaarde(Math.abs(v.absoluut), "aantal")} procentpunt`
    : `${teken}${formatWaarde(Math.abs(v.absoluut), eenheid)}`;
  const rel = !punten && v.relatief !== null ? ` (${v.relatief >= 0 ? "+" : "−"}${formatWaarde(Math.abs(v.relatief), "procent")})` : "";
  const kleur =
    gelijk || hogerIsBeter === undefined ? "text-ink" : (v.absoluut > 0) === hogerIsBeter ? "text-positive" : "text-negative";
  return (
    <span>
      <span className={`ma-getal font-medium ${kleur}`}>{gelijk ? "Gelijk" : `${abs}${rel}`}</span>
      <span className="text-ink-muted"> sinds v{vorige.versie}</span>
      <span className="ma-getal text-ink-faint"> ({formatWaarde(toen, eenheid)})</span>
    </span>
  );
}

export function AnalyseKpis({
  analyse,
  vergelijking,
  vorige,
  oud,
}: {
  analyse: MaAnalyse;
  vergelijking: Vergelijking;
  vorige: VorigeVersie | null;
  /** De cijfers horen nog bij de vorige keuze (er laadt een andere versie). */
  oud: boolean;
}) {
  const b = analyse.briefing;
  const v = voortgangVanAnalyse(analyse);
  const o = overzichtCijfers({ bedrijven: b.bedrijven ?? [], budget: b.budget ?? null, doel: b.doel ?? null }, analyse.kerncijfers);
  const kpl = kostenPer(o.kosten, o.leads);
  const kplReden = kpl !== null ? null : o.leads === 0 && (o.kosten ?? 0) > 0 ? "geen-leads" : "niet-gemeten";
  const lt = leadTempo(v.gehaaldPct, v.tijdPct);
  const prognose = prognoseBijHuidigTempo(o.kosten, v.dag, v.dagen);
  const vo =
    vergelijking === "vorige" && vorige
      ? overzichtCijfers({ bedrijven: b.bedrijven ?? [], budget: b.budget ?? null, doel: b.doel ?? null }, vorige.kerncijfers)
      : null;
  const vorigeKpl = vo ? kostenPer(vo.kosten, vo.leads) : null;
  const metVorige = vergelijking === "vorige" && vorige && vo;

  return (
    <KpiOppervlak kolommen={5}>
      <KpiCel
        oud={oud}
        label="Mediakosten"
        bron="Ads-platforms"
        waarde={formatWaarde(o.kosten, "euro")}
        eenheid={v.budget !== null ? `van ${formatWaarde(v.budget, "euro")}` : undefined}
        balk={
          v.besteedPct !== null ? (
            <VoortgangBalk
              pct={v.besteedPct}
              tijdPct={v.tijdPct}
              label={`${formatWaarde(v.besteedPct, "procent")} besteed bij ${formatWaarde(v.tijdPct, "procent")} van de looptijd`}
            />
          ) : undefined
        }
        vergelijking={
          metVorige ? (
            <Verschil nu={o.kosten} toen={vo.kosten} eenheid="euro" vorige={vorige} />
          ) : v.tempo ? (
            <>
              <TempoTekst {...TEMPO_KOSTEN[v.tempo]} titel={TEMPO_KOSTEN[v.tempo].uitleg} />
              <span className="ma-getal"> · {formatWaarde(v.besteedPct, "procent")} bij {formatWaarde(v.tijdPct, "procent")} looptijd</span>
            </>
          ) : (
            "Geen budget in de briefing"
          )
        }
        toelichting={prognose !== null && v.budget !== null ? `Bij dit tempo eind looptijd ± ${formatWaarde(prognose, "euro")}` : undefined}
      />
      <KpiCel
        oud={oud}
        label={v.leadSoort ? `Leads · ${v.leadSoort}` : "Leads"}
        bron={o.bron === "syntec" ? "Syntec" : "GA4"}
        waarde={formatWaarde(o.leads)}
        eenheid={v.doelLeads !== null ? `van ${formatWaarde(v.doelLeads)}` : "geen aantal in het doel"}
        balk={
          v.gehaaldPct !== null ? (
            <VoortgangBalk
              pct={v.gehaaldPct}
              tijdPct={v.tijdPct}
              label={`${formatWaarde(v.gehaaldPct, "procent")} van het doel bij ${formatWaarde(v.tijdPct, "procent")} van de looptijd`}
            />
          ) : undefined
        }
        vergelijking={
          metVorige ? (
            <Verschil nu={o.leads} toen={vo.leads} eenheid="aantal" hogerIsBeter vorige={vorige} />
          ) : lt ? (
            <>
              <TempoTekst {...TEMPO_LEADS[lt]} />
              <span className="ma-getal"> · {formatWaarde(v.gehaaldPct, "procent")} van het doel</span>
            </>
          ) : (
            "Het doel noemt geen aantal"
          )
        }
      />
      <KpiCel
        oud={oud}
        label="Kosten per lead"
        bron="kosten ÷ leads"
        waarde={<KplWaarde waarde={kpl} reden={kplReden} kosten={o.kosten} />}
        vergelijking={
          metVorige ? (
            <Verschil nu={kpl} toen={vorigeKpl} eenheid="euro" hogerIsBeter={false} vorige={vorige} />
          ) : (
            kplUitleg(kplReden, o.kosten) ?? `${formatWaarde(o.kosten, "euro")} ÷ ${formatWaarde(o.leads)} ${v.leadSoort ?? "leads"}`
          )
        }
      />
      <KpiCel
        oud={oud}
        label="Bezoekers"
        bron="campagnepagina"
        waarde={formatWaarde(o.bezoekers)}
        vergelijking={
          metVorige ? (
            <Verschil nu={o.bezoekers} toen={vo.bezoekers} eenheid="aantal" hogerIsBeter vorige={vorige} />
          ) : (
            <>
              <span className="ma-getal text-ink">{formatWaarde(kostenPer(o.kosten, o.bezoekers), "euro")}</span> per bezoeker
            </>
          )
        }
      />
      <KpiCel
        oud={oud}
        label="CTR advertenties"
        bron="gewogen"
        waarde={formatWaarde(o.ctr, "procent")}
        vergelijking={
          metVorige ? (
            <Verschil nu={o.ctr} toen={vo.ctr} eenheid="procent" hogerIsBeter vorige={vorige} />
          ) : (
            <>
              <span className="ma-getal text-ink">{formatWaarde(analyse.kerncijfers.klikken ?? null)}</span> klikken
            </>
          )
        }
      />
    </KpiOppervlak>
  );
}

/** Uitleg bij de vergelijking met de vorige versie: andere meetwijze = mogelijk ander getal. */
export function VergelijkingNoot({ analyse, vorige }: { analyse: MaAnalyse; vorige: VorigeVersie }) {
  const andereLaag = (vorige.semantiekVersie ?? 0) !== (analyse.semantiekVersie ?? 0);
  const anderePrompt = (vorige.promptVersie ?? 0) !== (analyse.promptVersie ?? 0);
  return (
    <p className="px-0.5 text-[12px] leading-snug text-ink-muted">
      Vergeleken met <span className="font-medium text-ink">v{vorige.versie}</span>
      {vorige.periodeTot ? ` (stand t/m ${datumKort(vorige.periodeTot)})` : ""} tegen v{analyse.versie}
      {analyse.periodeTot ? ` (stand t/m ${datumKort(analyse.periodeTot)})` : ""}: beide vanaf de start van de looptijd, dus het verschil is wat er
      tussen die twee dagen bij kwam.
      {(andereLaag || anderePrompt) && (
        <span className="text-orange-dark">
          {" "}
          Let op: v{vorige.versie} is gemaakt met {andereLaag ? `semantic layer v${vorige.semantiekVersie ?? "standaard"}` : ""}
          {andereLaag && anderePrompt ? " en " : ""}
          {anderePrompt ? `prompt v${vorige.promptVersie ?? "standaard"}` : ""}; een verschil kan ook uit de meetwijze komen.
        </span>
      )}
    </p>
  );
}

/** De eerste grafiek in een stap die aan de voorwaarde voldoet. */
function zoek(r: MaResultaat, tab: string, past: (g: Grafiek) => boolean): Grafiek | null {
  for (const s of r.secties) {
    if (s.tab !== tab) continue;
    const g = (s.grafieken ?? []).find(past);
    if (g) return g;
  }
  return null;
}

const ZELFDE_X = (a: Grafiek, b: Grafiek) => a.x.length === b.x.length && a.x.every((x, i) => x === b.x[i]);

/**
 * De hoofdvisualisatie op de samenvatting: mediakosten per week (per platform) en leads per week,
 * als twee uitgelijnde grafieken met dezelfde tijdas, zodat dezelfde week precies onder elkaar valt.
 * De grafieken komen uit de stappen Advertenties en Conversies van de analyse zelf; ontbreekt er
 * een, dan staat de andere alleen. Twee eenheden op één as zouden een verband suggereren dat de
 * schaal niet draagt; vandaar twee grafieken.
 */
export function TrendDuo({ analyse, resultaat }: { analyse: MaAnalyse; resultaat: MaResultaat }) {
  const kosten = zoek(resultaat, "advertenties", (g) => g.eenheid === "euro" && g.type === "staaf");
  const leads = zoek(resultaat, "conversies", (g) => g.eenheid === "aantal" && g.type === "staaf");
  if (!kosten && !leads) return null;
  const uitgelijnd = kosten && leads && ZELFDE_X(kosten, leads);
  const eerste = (kosten ?? leads)!.x[0];
  const laatste = (kosten ?? leads)!.x[(kosten ?? leads)!.x.length - 1];
  return (
    <section aria-labelledby="ma-trend" className="flex min-w-0 flex-col gap-3">
      <SectieKop
        id="ma-trend"
        titel={kosten && leads ? `${kosten.titel} en ${leads.titel.toLowerCase()}` : (kosten ?? leads)!.titel}
        uitleg={
          <>
            Per week (maandag t/m zondag), {eerste ? kortLabel(eerste) : ""} – {laatste ? kortLabel(laatste) : ""}
            {uitgelijnd ? "; dezelfde week staat precies onder elkaar" : ""}.
          </>
        }
      />
      <div className="flex flex-col gap-1 rounded-[14px] border border-line bg-[var(--ma-ondergrond)] px-4 py-3.5 shadow-subtle lg:px-5">
        {kosten && (
          <div>
            <p className="mb-1 text-[12px] font-medium text-ink-muted">{kosten.titel} · euro</p>
            <AnalyseGrafiek kaal zonderVoetnoot={Boolean(leads)} grafiek={{ ...kosten, voetnoot: undefined }} periodeVan={analyse.periodeVan} periodeTot={analyse.periodeTot} hoogte={150} syncId={uitgelijnd ? "ma-trend" : undefined} />
          </div>
        )}
        {kosten && leads && <div className="my-2 h-px bg-line-soft" />}
        {leads && (
          <div>
            <p className="mb-1 text-[12px] font-medium text-ink-muted">{leads.titel} · aantal (GA4)</p>
            <AnalyseGrafiek kaal grafiek={leads} periodeVan={analyse.periodeVan} periodeTot={analyse.periodeTot} hoogte={130} syncId={uitgelijnd ? "ma-trend" : undefined} />
          </div>
        )}
      </div>
    </section>
  );
}
