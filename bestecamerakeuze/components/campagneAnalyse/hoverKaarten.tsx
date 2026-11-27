import type { ReactNode } from "react";
import { type TijdVoortgang } from "@/lib/campagneAnalyseOverzicht";
import { datumKort, formatWaarde, type OverzichtCijfers } from "@/lib/marketingAnalyse/rekenen";
import type { MaKerncijfers, MaOverzichtRegel } from "@/lib/marketingAnalyse/types";
import { aandeel, kostenPer, prognoseBijHuidigTempo, type GeldigeUitsplitsing } from "@/lib/marketingAnalyse/uitsplitsing";

/**
 * De inhoud van de kaartjes die opengaan als je met de muis over een cijfer in Campagne analyse
 * staat. Twee soorten:
 *
 *  - een **uitsplitsing** (per platform, kanaal, event, soort lead, klantgroep), alleen als
 *    `leesUitsplitsing` heeft nagerekend dat ze optelt tot het cijfer zelf;
 *  - een **afgeleid cijfer** uit getallen die het overzicht al heeft (kosten per klik, bezoeker en
 *    lead; prognose bij het huidige tempo).
 *
 * Een kaartje zonder inhoud bestaat niet: dan geeft de functie `null` en is er geen hover.
 */

export type KaartBron = {
  c: MaOverzichtRegel;
  o: OverzichtCijfers;
  k: MaKerncijfers | null;
  u: GeldigeUitsplitsing;
  /** De looptijd tot en met de laatste dag waarover de analyse cijfers heeft (de dag vóór de analyse). */
  dataTot: TijdVoortgang | null;
  /** De dag van de analyse, "27 nov 2026". */
  analyseDatum: string | null;
};

export type Kaart = { titel: string; inhoud: ReactNode };

type Regel = {
  label: string;
  detail?: string | null;
  waarde: string;
  /** Aandeel in het geheel, 0–100: komt als dun streepje onder de regel. */
  aandeel?: number | null;
  gedempt?: boolean;
};

function Lijst({ regels }: { regels: Regel[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {regels.map((r, i) => (
        <li key={`${r.label}-${i}`} className={r.gedempt ? "opacity-70" : ""}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-ink">{r.label}</span>
            <span className="shrink-0 tabular-nums font-medium text-ink">{r.waarde}</span>
          </div>
          {r.detail && <p className="truncate text-meta text-ink-faint">{r.detail}</p>}
          {r.aandeel != null && (
            <div className="mt-1 h-0.5 w-full rounded-pill bg-progress-track">
              <div className="h-full rounded-pill bg-progress-fill/70" style={{ width: `${Math.min(100, Math.max(0, r.aandeel))}%` }} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function Sectie({ titel, children }: { titel?: string; children: ReactNode }) {
  return (
    <div className="[&:not(:first-child)]:mt-3 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-line-soft [&:not(:first-child)]:pt-3">
      {titel && <p className="mb-2 text-meta font-semibold text-ink-muted">{titel}</p>}
      {children}
    </div>
  );
}

function Voet({ b, extra }: { b: KaartBron; extra?: string | null }) {
  return (
    <p className="mt-3 text-meta leading-snug text-ink-faint">
      {extra ? `${extra} ` : ""}
      {b.analyseDatum ? `Cijfers uit de analyse van ${b.analyseDatum}.` : ""}
    </p>
  );
}

const euro = (n: number | null) => formatWaarde(n, "euro");
const procent = (n: number | null) => formatWaarde(n, "procent");
const aantal = (n: number | null) => formatWaarde(n);

/** Uitgaven: per platform, de kosten per klik, bezoeker en lead, en waar het bij dit tempo op uitkomt. */
export function kaartUitgaven(b: KaartBron): Kaart | null {
  const { o, k, u, dataTot } = b;
  if (o.kosten === null) return null;
  const secties: ReactNode[] = [];

  if (u.kosten) {
    secties.push(
      <Sectie key="platform" titel="Per platform">
        <Lijst
          regels={u.kosten.map((p) => ({
            label: p.naam,
            waarde: euro(p.kosten),
            aandeel: aandeel(p.kosten, o.kosten),
          }))}
        />
      </Sectie>,
    );
  }

  const per: Regel[] = [];
  const perKlik = kostenPer(o.kosten, k?.klikken);
  const perBezoeker = kostenPer(o.kosten, o.bezoekers);
  const perLead = kostenPer(o.kosten, o.ga4Leads);
  if (perKlik !== null) per.push({ label: "Per klik", waarde: euro(perKlik) });
  if (perBezoeker !== null) per.push({ label: "Per bezoeker", waarde: euro(perBezoeker) });
  if (perLead !== null) per.push({ label: "Per lead (Google Analytics)", waarde: euro(perLead) });
  if (per.length > 0) {
    secties.push(
      <Sectie key="per" titel="Mediakosten per">
        <Lijst regels={per} />
      </Sectie>,
    );
  }

  const prognose = dataTot && dataTot.dag < dataTot.dagen ? prognoseBijHuidigTempo(o.kosten, dataTot.dag, dataTot.dagen) : null;
  if (prognose !== null) {
    const verschil = o.budget ? ((prognose - o.budget) / o.budget) * 100 : null;
    const regels: Regel[] = [{ label: "Einde looptijd", waarde: `± ${euro(Math.round(prognose))}` }];
    if (o.budget !== null) regels.push({ label: "Budget", waarde: euro(o.budget) });
    secties.push(
      <Sectie key="prognose" titel="Bij het huidige tempo">
        <Lijst regels={regels} />
        {verschil !== null && Math.abs(verschil) >= 1 && (
          <p className={`mt-2 text-meta ${verschil > 0 ? "text-negative" : "text-ink-faint"}`}>
            {formatWaarde(Math.abs(verschil), "procent")} {verschil > 0 ? "boven" : "onder"} het budget. Rechte lijn: kosten tot nu toe ÷ verstreken dagen × alle dagen.
          </p>
        )}
      </Sectie>,
    );
  }

  if (secties.length === 0) return null;
  return {
    titel: "Uitgaven",
    inhoud: (
      <>
        {secties}
        <Voet b={b} extra="Alleen mediakosten." />
      </>
    ),
  };
}

/** CTR: per platform klikken ÷ vertoningen, en de gezamenlijke CTR. */
export function kaartCtr(b: KaartBron): Kaart | null {
  const { u, o, k } = b;
  if (!u.ctr || o.ctr === null) return null;
  const regels: Regel[] = u.ctr.map((p) => ({
    label: p.naam,
    detail: `${aantal(p.klikken)} klikken · ${aantal(p.vertoningen)} vertoningen`,
    waarde: procent(p.ctr),
  }));
  return {
    titel: "CTR per platform",
    inhoud: (
      <>
        <Lijst regels={regels} />
        <Sectie>
          <Lijst
            regels={[
              {
                label: "Samen",
                detail: `${aantal(k?.klikken ?? null)} klikken · ${aantal(k?.vertoningenAds ?? null)} vertoningen`,
                waarde: procent(o.ctr),
              },
            ]}
          />
        </Sectie>
        <Voet b={b} extra="Alle klikken ÷ alle vertoningen, gewogen; Meta telt linkklikken." />
      </>
    ),
  };
}

export function kaartBezoekers(b: KaartBron): Kaart | null {
  const { u, o } = b;
  if (!u.sessies) return null;
  return {
    titel: "Bezoekers per kanaal",
    inhoud: (
      <>
        <Lijst regels={u.sessies.map((r) => ({ label: r.naam, waarde: aantal(r.aantal), aandeel: aandeel(r.aantal, o.bezoekers) }))} />
        <Voet b={b} extra="Sessies die op de campagnepagina begonnen." />
      </>
    ),
  };
}

/** Leads in Google Analytics: welke events, en welke daarvan meetellen voor het doel. */
export function kaartLeadsGa4(b: KaartBron): Kaart | null {
  const { u, o } = b;
  if (!u.leadsGa4) return null;
  const telt = u.leadsGa4.filter((e) => e.telt);
  const overig = u.leadsGa4.filter((e) => !e.telt);
  const regel = (e: (typeof telt)[number], gedempt = false): Regel => ({
    label: e.naam,
    detail: e.detail,
    waarde: aantal(e.aantal),
    gedempt,
  });
  return {
    titel: "Leads in Google Analytics",
    inhoud: (
      <>
        <Sectie titel={o.ga4Soort ? `Telt mee: ${o.ga4Soort}` : "Telt mee"}>
          <Lijst regels={telt.map((e) => regel(e))} />
        </Sectie>
        {overig.length > 0 && (
          <Sectie titel="Andere lead-events op de campagnepagina">
            <Lijst regels={overig.map((e) => regel(e, true))} />
          </Sectie>
        )}
        <Voet b={b} extra="Lead-events in sessies die op de campagnepagina begonnen." />
      </>
    ),
  };
}

export function kaartSyntecLeads(b: KaartBron): Kaart | null {
  const { u, o } = b;
  if (!u.leadsInternet || o.syntec.stand !== "cijfers") return null;
  const totaal = o.syntec.leads;
  return {
    titel: "Syntec internet per soort lead",
    inhoud: (
      <>
        <Lijst regels={u.leadsInternet.map((r) => ({ label: r.naam, waarde: aantal(r.aantal), aandeel: aandeel(r.aantal, totaal) }))} />
        <Voet b={b} extra={o.syntec.leadsSoort ? `Geteld: ${o.syntec.leadsSoort}.` : null} />
      </>
    ),
  };
}

export function kaartSyntecOrders(b: KaartBron): Kaart | null {
  const { u, o } = b;
  if (!u.orders || o.syntec.stand !== "cijfers") return null;
  const totaal = o.syntec.orders;
  return {
    titel: "Syntec orders per klantgroep",
    inhoud: (
      <>
        <Lijst regels={u.orders.map((r) => ({ label: r.naam, waarde: aantal(r.aantal), aandeel: aandeel(r.aantal, totaal) }))} />
        <Voet b={b} extra={o.syntec.ordersSoort ? `Geteld: ${o.syntec.ordersSoort}.` : null} />
      </>
    ),
  };
}

/** Doel leads: hoeveel er nog nodig is en waar het bij het huidige tempo op uitkomt. */
export function kaartDoel(b: KaartBron): Kaart | null {
  const { o, dataTot } = b;
  if (o.doelLeads === null || o.leads === null) return null;
  const regels: Regel[] = [
    { label: "Gehaald", waarde: `${aantal(o.leads)} van ${aantal(o.doelLeads)}` },
    { label: "Nog nodig", waarde: o.leads >= o.doelLeads ? "Doel gehaald" : aantal(o.doelLeads - o.leads) },
  ];
  const prognose = dataTot && dataTot.dag < dataTot.dagen ? prognoseBijHuidigTempo(o.leads, dataTot.dag, dataTot.dagen) : null;
  return {
    titel: "Doel leads",
    inhoud: (
      <>
        <Lijst regels={regels} />
        {prognose !== null && (
          <Sectie titel="Bij het huidige tempo">
            <Lijst regels={[{ label: "Einde looptijd", waarde: `± ${aantal(Math.round(prognose))} leads` }]} />
            <p className={`mt-2 text-meta ${prognose >= o.doelLeads ? "text-positive" : "text-negative"}`}>
              {prognose >= o.doelLeads
                ? "Het doel wordt naar verwachting gehaald."
                : `Naar verwachting ${aantal(Math.round(o.doelLeads - prognose))} onder het doel.`}{" "}
              <span className="text-ink-faint">Rechte lijn: leads tot nu toe ÷ verstreken dagen × alle dagen.</span>
            </p>
          </Sectie>
        )}
        <Voet b={b} extra={`Gemeten in ${o.bron === "syntec" ? "Syntec" : "Google Analytics"}.`} />
      </>
    ),
  };
}

/** De datum van de analyse voor onderaan een kaartje. */
export function analyseDatumLabel(geanalyseerdOp: string | null | undefined): string | null {
  return geanalyseerdOp ? datumKort(geanalyseerdOp) : null;
}
