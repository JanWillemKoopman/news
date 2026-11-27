"use client";

import { getBrandLogo } from "@/components/brandLogos";
import { IconChevronRight } from "@/components/icons";
import { bedrijvenLabel, formatWaarde } from "@/lib/marketingAnalyse/rekenen";
import type { CampagneVoortgang, Portefeuille } from "@/lib/marketingAnalyse/portefeuille";
import type { MaOverzichtRegel } from "@/lib/marketingAnalyse/types";
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

/**
 * Het overzicht van Marketing analyse (redesign november 2026), in de leesvolgorde van de vraag
 * die een marketingmanager stelt: hoe staan we ervoor (de kerncijfers van alle campagnes in beeld,
 * tegen het verwachte tempo), waar zit het verschil (voortgang en aandeel per campagne), en waar
 * klik ik door (elke regel opent het detailpaneel).
 */

function procent(x: number | null): string {
  return x === null ? "—" : formatWaarde(x, "procent");
}

function verschilTegenVerwacht(werkelijk: number | null, verwacht: number | null): string | null {
  if (werkelijk === null || verwacht === null || verwacht <= 0) return null;
  const pct = ((werkelijk - verwacht) / verwacht) * 100;
  if (Math.abs(pct) < 0.5) return "gelijk aan verwacht";
  return `${pct > 0 ? "+" : "−"}${formatWaarde(Math.abs(pct), "procent")} t.o.v. verwacht`;
}

export function OverzichtKpis({ p }: { p: Portefeuille }) {
  const tijdKosten = p.verwachtKosten !== null && p.budget ? (p.verwachtKosten / p.budget) * 100 : null;
  const tijdLeads = p.verwachtLeads !== null && p.doelLeads ? (p.verwachtLeads / p.doelLeads) * 100 : null;
  const doelPct = p.leadsMetDoel !== null && p.doelLeads ? (p.leadsMetDoel / p.doelLeads) * 100 : null;
  const metKpl = p.campagnes.filter((c) => c.kostenPerLead !== null).sort((a, b) => (a.kostenPerLead ?? 0) - (b.kostenPerLead ?? 0));
  const laagst = metKpl[0];
  const hoogst = metKpl.length > 1 ? metKpl[metKpl.length - 1] : undefined;
  const zonderLeads = p.campagnes.filter((c) => c.kplReden === "geen-leads");
  return (
    <KpiOppervlak>
      <KpiCel
        label="Mediakosten"
        bron="Ads-platforms"
        waarde={formatWaarde(p.kosten, "euro")}
        eenheid={p.budget !== null ? `van ${formatWaarde(p.budget, "euro")}` : undefined}
        balk={
          p.besteedPct !== null ? (
            <VoortgangBalk
              pct={p.besteedPct}
              tijdPct={tijdKosten}
              label={`${procent(p.besteedPct)} van het budget besteed; bij de looptijd verwacht ${procent(tijdKosten)}`}
            />
          ) : undefined
        }
        vergelijking={
          p.kostenTempo ? (
            <>
              <TempoTekst {...TEMPO_KOSTEN[p.kostenTempo]} titel={TEMPO_KOSTEN[p.kostenTempo].uitleg} />
              {" · "}
              {verschilTegenVerwacht(p.kostenMetTempo, p.verwachtKosten)}
            </>
          ) : (
            "Geen budget of looptijd om tegen te zetten"
          )
        }
        toelichting={p.verwachtKosten !== null ? `Verwacht bij de looptijd ${formatWaarde(p.verwachtKosten, "euro")}` : undefined}
      />
      <KpiCel
        label="Leads"
        bron="GA4"
        waarde={formatWaarde(p.leads)}
        eenheid={p.doelLeads !== null ? `· doel ${formatWaarde(p.leadsMetDoel)} van ${formatWaarde(p.doelLeads)}` : undefined}
        balk={
          doelPct !== null ? (
            <VoortgangBalk
              pct={doelPct}
              tijdPct={tijdLeads}
              label={`${procent(doelPct)} van het leaddoel gehaald; bij de looptijd verwacht ${procent(tijdLeads)}`}
            />
          ) : undefined
        }
        vergelijking={
          p.leadTempo ? (
            <>
              <TempoTekst {...TEMPO_LEADS[p.leadTempo]} />
              {" · "}
              verwacht {formatWaarde(p.verwachtLeads)} bij de looptijd
            </>
          ) : (
            "Geen campagne met een aantal in het doel"
          )
        }
        toelichting={
          p.aantalMetDoel > 0
            ? `Doel: ${p.aantalMetDoel} ${p.aantalMetDoel === 1 ? "campagne" : "campagnes"} met een aantal; soort lead per campagne`
            : undefined
        }
      />
      <KpiCel
        label="Kosten per lead"
        bron="kosten ÷ leads"
        waarde={<KplWaarde waarde={p.kostenPerLead} reden={p.kostenPerLead === null ? "niet-gemeten" : null} />}
        vergelijking={
          laagst ? (
            <>
              Laagst {laagst.naam} <span className="ma-getal text-ink">{formatWaarde(laagst.kostenPerLead, "euro")}</span>
              {hoogst && (
                <>
                  {" · hoogst "}
                  {hoogst.naam} <span className="ma-getal text-ink">{formatWaarde(hoogst.kostenPerLead, "euro")}</span>
                </>
              )}
            </>
          ) : undefined
        }
        toelichting={zonderLeads.length > 0 ? `0 leads bij uitgaven: ${zonderLeads.map((c) => c.naam).join(", ")}` : undefined}
      />
      <KpiCel
        label="Bezoekers"
        bron="campagnepagina's"
        waarde={formatWaarde(p.bezoekers)}
        vergelijking={p.ctr !== null ? <>CTR advertenties <span className="ma-getal text-ink">{procent(p.ctr)}</span> (gewogen)</> : undefined}
        toelichting="Sessies die op de campagnepagina begonnen"
      />
    </KpiOppervlak>
  );
}

function AandeelBalk({ label, pct, sterk }: { label: string; pct: number | null; sterk: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[11.5px]">
      <span className="w-[52px] shrink-0 text-ink-faint">{label}</span>
      <div className="h-1 min-w-0 flex-1 rounded-full bg-[color-mix(in_srgb,var(--color-ink)_7%,transparent)]">
        {pct !== null && (
          <div className={`h-full rounded-full ${sterk ? "bg-ink/70" : "bg-ink/30"}`} style={{ width: `${Math.max(pct > 0 ? 2 : 0, Math.min(100, pct))}%` }} />
        )}
      </div>
      <span className="ma-getal w-[34px] shrink-0 text-right text-ink-muted">{pct === null ? "—" : `${Math.round(pct)}%`}</span>
    </div>
  );
}

const RASTER =
  "lg:grid lg:grid-cols-[minmax(200px,1.5fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(96px,0.55fr)_minmax(140px,0.8fr)_16px] lg:items-center lg:gap-x-5";

/**
 * De voortgang per campagne: uitgaven tegen budget en leads tegen doel, elk met de streep van de
 * looptijd, de kosten per lead en het aandeel in uitgaven en leads. Gesorteerd op aandeel in de
 * uitgaven: wat het meest doorwerkt in het totaal staat bovenaan.
 */
export function VoortgangLijst({
  p,
  regels,
  gekozen,
  onKies,
}: {
  p: Portefeuille;
  regels: Map<string, MaOverzichtRegel>;
  gekozen: string | null;
  onKies: (id: string, knop: HTMLElement) => void;
}) {
  const lijst = [...p.campagnes].sort(
    (a, b) => Number(b.live) - Number(a.live) || (b.kosten ?? -1) - (a.kosten ?? -1) || a.naam.localeCompare(b.naam, "nl"),
  );
  return (
    <section aria-labelledby="ma-voortgang" className="flex flex-col gap-3">
      <SectieKop
        id="ma-voortgang"
        titel="Voortgang per campagne"
        uitleg={
          <>
            Balk = bereikt, streep = waar je bij een gelijk tempo zou staan (verstreken deel van de looptijd). Op volgorde van uitgaven.
          </>
        }
      />
      <div className="overflow-hidden rounded-[14px] border border-line bg-[var(--ma-ondergrond)] shadow-subtle">
        <div className={`hidden border-b border-line-soft px-5 py-2.5 ${RASTER}`} aria-hidden="true">
          <span className="ma-kolomkop">Campagne</span>
          <span className="ma-kolomkop">Uitgaven tegen budget</span>
          <span className="ma-kolomkop">Leads tegen doel</span>
          <span className="ma-kolomkop text-right">Kosten per lead</span>
          <span className="ma-kolomkop">Aandeel in totaal</span>
          <span />
        </div>
        <ul>
          {lijst.map((c, i) => (
            <li key={c.id} className={i > 0 ? "border-t border-line-soft" : ""}>
              <VoortgangRegel c={c} regel={regels.get(c.id)} gekozen={gekozen === c.id} onKies={onKies} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function VoortgangRegel({
  c,
  regel,
  gekozen,
  onKies,
}: {
  c: CampagneVoortgang;
  regel: MaOverzichtRegel | undefined;
  gekozen: boolean;
  onKies: (id: string, knop: HTMLElement) => void;
}) {
  const Logo = regel?.merk ? getBrandLogo(regel.merk) : null;
  const uitleg = kplUitleg(c.kplReden, c.kosten);
  return (
    <button
      type="button"
      data-campagne={c.id}
      onClick={(e) => onKies(c.id, e.currentTarget)}
      aria-label={`${c.naam}: details openen`}
      className={`group w-full px-4 py-3.5 text-left transition-colors duration-[var(--ma-duur-klein)] hover:bg-[color-mix(in_srgb,var(--color-ink)_2.5%,transparent)] lg:px-5 ${RASTER} ${
        gekozen ? "ma-rij-gekozen" : ""
      }`}
    >
      {/* Campagne */}
      <div className="flex min-w-0 items-start gap-2.5">
        <span
          aria-hidden="true"
          className={`mt-[7px] h-[7px] w-[7px] shrink-0 rounded-full ${c.live ? "live-stip bg-open" : "bg-closed opacity-70"}`}
        />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[13.5px] font-semibold leading-snug text-ink">
            {Logo && <Logo role="img" aria-label={regel?.merk ?? undefined} className="h-3.5 w-3.5 shrink-0 text-ink-muted" />}
            <span className="line-clamp-2">{c.naam}</span>
          </p>
          <p className="mt-0.5 truncate text-[11.5px] text-ink-faint">
            {regel ? bedrijvenLabel(regel.bedrijven) : ""}
            {c.dag !== null && c.dagen !== null ? ` · dag ${c.dag} van ${c.dagen}` : ""}
            {!c.geanalyseerd ? " · nog niet geanalyseerd" : ""}
          </p>
        </div>
      </div>

      {/* Uitgaven en leads naast elkaar op mobiel, in kolommen op desktop. */}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 lg:contents">
        <div className="min-w-0">
          <p className="ma-getal flex items-baseline gap-1 text-[13px] text-ink">
            <span className="font-semibold">{formatWaarde(c.kosten, "euro")}</span>
            <span className="text-[11.5px] text-ink-faint">{c.budget !== null ? `/ ${formatWaarde(c.budget, "euro")}` : "geen budget"}</span>
          </p>
          <div className="mt-1.5">
            <VoortgangBalk
              dun
              pct={c.besteedPct}
              tijdPct={c.tijdPct}
              label={`${procent(c.besteedPct)} besteed bij ${procent(c.tijdPct)} van de looptijd`}
            />
          </div>
          <p className="mt-1 truncate text-[11.5px]">
            {c.kostenTempo ? <TempoTekst {...TEMPO_KOSTEN[c.kostenTempo]} titel={TEMPO_KOSTEN[c.kostenTempo].uitleg} /> : <span className="text-ink-faint">—</span>}
            {c.besteedPct !== null && <span className="ma-getal text-ink-faint"> · {procent(c.besteedPct)}</span>}
          </p>
        </div>
        <div className="min-w-0">
          <p className="ma-getal flex items-baseline gap-1 text-[13px] text-ink">
            <span className="font-semibold">{formatWaarde(c.leads)}</span>
            <span className="truncate text-[11.5px] text-ink-faint">
              {c.doelLeads !== null ? `/ ${formatWaarde(c.doelLeads)} ` : ""}
              {c.leadSoort ?? "leads"}
            </span>
          </p>
          <div className="mt-1.5">
            {c.doelLeads !== null ? (
              <VoortgangBalk
                dun
                pct={c.gehaaldPct}
                tijdPct={c.tijdPct}
                label={`${procent(c.gehaaldPct)} van het doel bij ${procent(c.tijdPct)} van de looptijd`}
              />
            ) : (
              <div className="h-1" />
            )}
          </div>
          <p className="mt-1 truncate text-[11.5px]">
            {c.leadTempo ? (
              <>
                <TempoTekst {...TEMPO_LEADS[c.leadTempo]} />
                <span className="ma-getal text-ink-faint"> · {procent(c.gehaaldPct)}</span>
              </>
            ) : (
              <span className="text-ink-faint">Geen aantal in het doel</span>
            )}
          </p>
        </div>
      </div>

      {/* Kosten per lead */}
      <div className="mt-3 flex items-baseline justify-between gap-2 lg:mt-0 lg:block lg:text-right">
        <span className="text-[11.5px] text-ink-faint lg:hidden">Kosten per lead</span>
        <span>
          <span className="ma-getal block text-[13px] font-semibold text-ink">
            <KplWaarde waarde={c.kostenPerLead} reden={c.kplReden} kosten={c.kosten} />
          </span>
          {uitleg && <span className="block text-[11px] leading-tight text-ink-faint">{uitleg}</span>}
        </span>
      </div>

      {/* Aandeel */}
      <div className="mt-2.5 flex flex-col gap-1 lg:mt-0">
        <AandeelBalk label="uitgaven" pct={c.aandeelKosten} sterk />
        <AandeelBalk label="leads" pct={c.aandeelLeads} sterk={false} />
      </div>

      <IconChevronRight
        className={`hidden h-4 w-4 text-ink-faint transition-transform duration-[var(--ma-duur-klein)] group-hover:translate-x-0.5 lg:block ${
          gekozen ? "text-primary" : ""
        }`}
      />
    </button>
  );
}
