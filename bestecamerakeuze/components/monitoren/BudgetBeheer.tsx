"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Inlogprompt from "@/components/Inlogprompt";
import ProgressBar from "@/components/ProgressBar";
import { IconInfo } from "@/components/icons";
import { AS_GROOTTE, formatteer, type Eenheid } from "@/components/chat/chartTheme";
import { useGrafiekKleuren } from "@/components/ThemeProvider";
import type { GrafiekKleuren } from "@/lib/themes";
import {
  forecast,
  huidigeMaand,
  maandVoortgang,
  oordeelVan,
  platformGroep,
  sleutelVan,
  telOpVoorMaand,
  type BudgetDoel,
  type DagRegel,
  type Oordeel,
} from "@/lib/kanalen/budgetBeheer";

/**
 * Budget beheer: gaan we deze maand te langzaam, goed of te snel — per account en
 * platform, voor budget én klikken?
 *
 * Bovenaan de filterbalk: een rij platforms en een rij accounts, waarvan er steeds
 * precies één aan staat — de kaartjes en de grafiek gaan altijd over één combinatie.
 * Daaronder links (1/3) zes kaartjes in twee kolommen (links geld, rechts klikken):
 * gerealiseerd, forecast en afspraak, altijd voor de lopende maand. Rechts (2/3) een
 * staafgrafiek met budget en uitgaven per maand, januari t/m december van dit jaar.
 * Onderaan de tabel waarin de afspraak voor de gekozen combinatie per maand wordt
 * ingevuld: januari t/m december van dit jaar, de lopende maand gemarkeerd.
 *
 * De bron is dezelfde als op Social ads (Meta plus LinkedIn). Het rekenwerk staat in
 * `lib/kanalen/budgetBeheer.ts`.
 */

interface Antwoord {
  maand: string;
  dagen: DagRegel[];
  paren: { account: string; platform: string }[];
  doelen: BudgetDoel[];
  doelenFout: string | null;
  laatsteDatum: string | null;
  fout?: string;
}

/**
 * Op dit tabblad staat het platform altijd al gegroepeerd (`platformGroep`): Meta
 * (Facebook, Instagram, Threads, Audience Network, Messenger) en LinkedIn.
 */
const PLATFORM_LABEL: Record<string, string> = {
  meta: "Meta",
  linkedin: "LinkedIn",
};

function platformLabel(platform: string): string {
  return PLATFORM_LABEL[platform] ?? platform.charAt(0).toUpperCase() + platform.slice(1);
}

function maandLabel(maand: string): string {
  const [jaar, mnd] = maand.split("-").map(Number);
  const tekst = new Date(Date.UTC(jaar, mnd - 1, 1)).toLocaleDateString("nl-NL", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return tekst.charAt(0).toUpperCase() + tekst.slice(1);
}

/** Wat de filters kiezen zolang er nog niets gekozen is (en als het bestaat). */
const STANDAARD_ACCOUNT = "porsche centrum brabant";
const STANDAARD_PLATFORM = "meta";

const MAANDEN_KORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

const OORDEEL_TEKST: Record<Oordeel, string> = {
  "te-langzaam": "te langzaam",
  "op-koers": "op koers",
  "te-snel": "te snel",
};

/** Welk cijfer de grafiek toont, en in welke vorm — de keuzebalk boven de grafiek. */
type Cijfer = "budget" | "klikken";
type Weergave = "waarden" | "resultaat";

const CIJFER_LABEL: Record<Cijfer, string> = { budget: "Budget", klikken: "Klikken" };
const WEERGAVE_LABEL: Record<Weergave, string> = { waarden: "Waarden", resultaat: "Resultaat" };

/** Eén maand in de jaargrafiek: doel en werkelijk, voor zowel budget als klikken. */
interface MaandPunt {
  label: string;
  maand: string;
  /** False voor de lopende maand: die staaf is een forecast, geen afgeronde stand. */
  volledig: boolean;
  budget: number | null;
  uitgaven: number | null;
  doelKlikken: number | null;
  klikken: number | null;
  /** Uitgaven min budget, resp. klikken min doel klikken — de "resultaat"-weergave. */
  resultaatBudget: number | null;
  resultaatKlikken: number | null;
  oordeelBudget: Oordeel | null;
  oordeelKlikken: Oordeel | null;
}

/**
 * Kleur van een resultaatstaaf: dezelfde betekenis als `oordeelKleur` hierboven, maar dan
 * als hex voor Recharts (SVG-attributen lezen geen CSS-variabelen/Tailwind-classes).
 * Groen op koers, rood bij het probleem-oordeel (te snel voor budget, te langzaam voor
 * klikken), grijs/neutraal in de rest — kleur zegt "let op", niet "hoger of lager".
 */
function resultaatKleur(oordeel: Oordeel | null, soort: "budget" | "klikken", kleuren: GrafiekKleuren): string {
  if (!oordeel) return kleuren.context;
  if (oordeel === "op-koers") return kleuren.positief;
  if (soort === "budget") return oordeel === "te-snel" ? kleuren.negatief : kleuren.context;
  return oordeel === "te-langzaam" ? kleuren.negatief : kleuren.positief;
}

/**
 * Te snel is bij geld het probleem (het budget raakt op), te langzaam bij klikken (het
 * doel wordt niet gehaald). Kleur zegt "let op", niet "hoger" — net als elders.
 */
function oordeelKleur(oordeel: Oordeel | null, soort: "budget" | "klikken"): string {
  if (!oordeel || oordeel === "op-koers") return "text-positive";
  if (soort === "budget") return oordeel === "te-snel" ? "text-negative" : "text-ink-muted";
  return oordeel === "te-langzaam" ? "text-negative" : "text-positive";
}

export default function BudgetBeheer({ ingelogd }: { ingelogd: boolean }) {
  // Altijd de lopende maand; de grafiek toont het jaar waarin die valt.
  const [maand] = useState(huidigeMaand);
  const jaar = maand.slice(0, 4);
  const kleuren = useGrafiekKleuren();
  const [data, setData] = useState<Antwoord | null>(null);
  const [bezig, setBezig] = useState(true);
  const [fout, setFout] = useState<string | null>(null);
  const [gekozenAccount, setAccount] = useState<string | null>(null);
  const [gekozenPlatform, setPlatform] = useState<string | null>(null);
  const [bewaard, setBewaard] = useState<string | null>(null);
  const [cijfer, setCijfer] = useState<Cijfer>("budget");
  const [weergave, setWeergave] = useState<Weergave>("waarden");
  // De maanden vóór de lopende, voor de grafiek. Een eigen verzoek, zodat de kaartjes er
  // niet op wachten; null zolang het nog laadt.
  const [eerder, setEerder] = useState<DagRegel[] | null>(null);
  const [eerderFout, setEerderFout] = useState<string | null>(null);

  const haal = useCallback(() => {
    setBezig(true);
    fetch("/api/budgetbeheer")
      .then(async (res) => {
        const antwoord = (await res.json()) as Antwoord;
        if (!res.ok) {
          setFout(antwoord.fout ?? `Ophalen mislukt (${res.status}).`);
          return;
        }
        setData(antwoord);
        setFout(null);
      })
      .catch((err: unknown) => setFout(err instanceof Error ? err.message : String(err)))
      .finally(() => setBezig(false));
  }, []);

  useEffect(haal, [haal]);

  useEffect(() => {
    fetch("/api/budgetbeheer?deel=eerder")
      .then(async (res) => {
        const antwoord = (await res.json()) as { dagen?: DagRegel[]; fout?: string };
        if (!res.ok) throw new Error(antwoord.fout ?? `Ophalen mislukt (${res.status}).`);
        setEerder(antwoord.dagen ?? []);
      })
      .catch((err: unknown) => setEerderFout(err instanceof Error ? err.message : String(err)));
  }, []);

  const voortgang = useMemo(() => maandVoortgang(maand), [maand]);
  const dagen = useMemo(() => data?.dagen ?? [], [data]);
  const doelen = useMemo(() => data?.doelen ?? [], [data]);

  /**
   * Elke account × platformgroep die in de data, in de recente maanden of in de doelen
   * voorkomt — hier al gebundeld tot Meta/LinkedIn, zodat de filterbalk en de tabel
   * nooit een los Facebook- of Instagram-platform te zien krijgen.
   */
  const paren = useMemo(() => {
    const gezien = new Map<string, { account: string; platform: string }>();
    // Maandregels zonder uitgaven (Meta's 'unknown'-platform) horen er niet bij, net als
    // in de paren die de server teruggeeft.
    for (const p of [...(data?.paren ?? []), ...dagen.filter((d) => d.uitgaven > 0), ...doelen]) {
      const platform = platformGroep(p.platform);
      gezien.set(sleutelVan(p.account, platform), { account: p.account, platform });
    }
    return [...gezien.values()].sort(
      (a, b) => a.account.localeCompare(b.account, "nl") || a.platform.localeCompare(b.platform, "nl"),
    );
  }, [data, dagen, doelen]);

  const accountOpties = useMemo(
    () => [...new Set(paren.map((p) => p.account))].sort((a, b) => a.localeCompare(b, "nl")),
    [paren],
  );
  const platformOpties = useMemo(
    () =>
      [...new Set(paren.map((p) => p.platform))].sort((a, b) =>
        platformLabel(a).localeCompare(platformLabel(b), "nl"),
      ),
    [paren],
  );

  // Er staat altijd precies één account en één platform aan. Zolang er niets (geldigs)
  // gekozen is: Porsche Centrum Brabant en Facebook, of anders de eerste in de lijst.
  const account =
    gekozenAccount && accountOpties.includes(gekozenAccount)
      ? gekozenAccount
      : (accountOpties.find((a) => a.toLowerCase() === STANDAARD_ACCOUNT) ?? accountOpties[0] ?? null);
  const platform =
    gekozenPlatform && platformOpties.includes(gekozenPlatform)
      ? gekozenPlatform
      : (platformOpties.find((p) => p === STANDAARD_PLATFORM) ?? platformOpties[0] ?? null);

  // Vergelijkt op de gebundelde groep, niet op het losse platform: zo tellen Facebook,
  // Instagram, Threads en Audience Network samen op tot "Meta".
  const binnen = useCallback(
    (a: string, p: string) => a === account && platformGroep(p) === platform,
    [account, platform],
  );

  const totalen = useMemo(() => telOpVoorMaand(dagen, doelen, maand, binnen), [dagen, doelen, maand, binnen]);

  /** Welke velden, namen en eenheid de grafiek tekent — bepaald door de keuzebalk erboven. */
  const grafiekConfig = useMemo(() => {
    if (weergave === "resultaat") {
      return cijfer === "budget"
        ? {
            soort: "resultaat" as const,
            resultaatKey: "resultaatBudget" as const,
            oordeelKey: "oordeelBudget" as const,
            eenheid: "euro-heel" as Eenheid,
          }
        : {
            soort: "resultaat" as const,
            resultaatKey: "resultaatKlikken" as const,
            oordeelKey: "oordeelKlikken" as const,
            eenheid: "aantal" as Eenheid,
          };
    }
    return cijfer === "budget"
      ? {
          soort: "waarden" as const,
          doelKey: "budget" as const,
          waardeKey: "uitgaven" as const,
          naamDoel: "Budget",
          naamWaarde: "Uitgaven",
          eenheid: "euro-heel" as Eenheid,
        }
      : {
          soort: "waarden" as const,
          doelKey: "doelKlikken" as const,
          waardeKey: "klikken" as const,
          naamDoel: "Doel klikken",
          naamWaarde: "Klikken behaald",
          eenheid: "aantal" as Eenheid,
        };
  }, [cijfer, weergave]);

  const grafiekTitel =
    weergave === "resultaat"
      ? `Resultaat ${cijfer === "budget" ? "budget" : "klikken"} per maand`
      : cijfer === "budget"
        ? "Budget en uitgaven per maand"
        : "Doel klikken en klikken behaald per maand";

  /**
   * Budget/doel en werkelijk per maand van dit jaar, voor de gekozen combinatie.
   *
   * `forecast` op een volledig verstreken maand levert het werkelijke totaal terug
   * (verstreken dagen = dagen in de maand, dus geen wiskundig verschil); alleen de
   * lopende maand — de laatste met data — verandert daardoor van een gedeeltelijke stand
   * in de projectie tot einde maand. Zo is de laatste staaf in de grafiek altijd de
   * forecast, net als de kaartjes hierboven.
   */
  const jaarReeks = useMemo<MaandPunt[]>(
    () =>
      MAANDEN_KORT.map((label, i) => {
        const m = `${jaar}-${String(i + 1).padStart(2, "0")}`;
        const bekend = m === maand || (m < maand && eerder !== null);
        const t = telOpVoorMaand(m < maand ? (eerder ?? []) : dagen, doelen, m, binnen);
        const v = maandVoortgang(m);
        const uitgaven = bekend ? forecast(t.uitgaven, v) : null;
        const klikkenRuw = bekend ? forecast(t.klikken, v) : null;
        const klikken = klikkenRuw === null ? null : Math.round(klikkenRuw);
        return {
          label,
          maand: m,
          volledig: m !== maand,
          budget: t.budget,
          uitgaven,
          doelKlikken: t.doelKlikken,
          klikken,
          resultaatBudget: uitgaven === null || t.budget === null ? null : uitgaven - t.budget,
          resultaatKlikken: klikken === null || t.doelKlikken === null ? null : klikken - t.doelKlikken,
          oordeelBudget: oordeelVan(uitgaven, t.budget),
          oordeelKlikken: oordeelVan(klikken, t.doelKlikken),
        };
      }),
    [jaar, maand, dagen, eerder, doelen, binnen],
  );

  /**
   * Budget, uitgaven en het resultaat daarvan, opgeteld van januari t/m de actieve maand.
   *
   * Leunt op `jaarReeks`: die heeft voor de actieve maand al de forecast staan in plaats
   * van de gedeeltelijke stand (zie de toelichting daar), dus deze optelsom hoeft daar zelf
   * niets voor te doen. Null zolang niet elke maand in de reeks een bekende uitgave heeft
   * (het jaaroverzicht laadt nog, of de 1e van de maand zonder verstreken dag) — een
   * gedeeltelijke som zou lezen als het echte totaal.
   */
  const ytd = useMemo(() => {
    const tomEnMaand = jaarReeks.slice(0, Number(maand.slice(5, 7)));
    const budget = tomEnMaand.some((p) => p.budget !== null)
      ? tomEnMaand.reduce((som, p) => som + (p.budget ?? 0), 0)
      : null;
    const uitgaven = tomEnMaand.every((p) => p.uitgaven !== null)
      ? tomEnMaand.reduce((som, p) => som + (p.uitgaven ?? 0), 0)
      : null;
    const oordeel = oordeelVan(uitgaven, budget);
    return {
      budget,
      uitgaven,
      resultaat: budget === null || uitgaven === null ? null : budget - uitgaven,
      oordeel,
    };
  }, [jaarReeks, maand]);

  /** "Januari t/m september 2026" — de periode die de drie jaartotaal-kaartjes bestrijken. */
  const ytdPeriode = useMemo(() => {
    const vanTekst = new Date(Date.UTC(Number(jaar), 0, 1)).toLocaleDateString("nl-NL", {
      month: "long",
      timeZone: "UTC",
    });
    return `${vanTekst.charAt(0).toUpperCase()}${vanTekst.slice(1)} t/m ${maandLabel(maand)}`;
  }, [jaar, maand]);

  /**
   * De invultabel: de twaalf maanden van dit jaar voor de gekozen combinatie, oplopend.
   * Uitgaven en klikken zijn null waar ze (nog) niet bekend zijn — een maand die nog moet
   * komen, of een eerdere maand zolang het jaaroverzicht laadt.
   */
  const regels = useMemo(
    () =>
      MAANDEN_KORT.map((_, i) => {
        const m = `${jaar}-${String(i + 1).padStart(2, "0")}`;
        const t = telOpVoorMaand(m < maand ? (eerder ?? []) : dagen, doelen, m, binnen);
        const bekend = m === maand || (m < maand && eerder !== null);
        return {
          maand: m,
          budget: t.budget,
          doelKlikken: t.doelKlikken,
          uitgaven: bekend ? t.uitgaven : null,
          klikken: bekend ? t.klikken : null,
        };
      }),
    [jaar, maand, dagen, eerder, doelen, binnen],
  );

  async function bewaar(
    account: string,
    platform: string,
    maand: string,
    patch: Partial<Pick<BudgetDoel, "budget" | "doelKlikken">>,
  ) {
    const huidig = doelen.find((d) => d.account === account && d.platform === platform && d.maand === maand) ?? {
      account,
      platform,
      maand,
      budget: null,
      doelKlikken: null,
    };
    const nieuw: BudgetDoel = { ...huidig, ...patch, maand };
    if (nieuw.budget === huidig.budget && nieuw.doelKlikken === huidig.doelKlikken) return;

    // Meteen in beeld, zodat de kaartjes bovenaan direct meebewegen; de server bevestigt.
    setData((oud) =>
      oud
        ? {
            ...oud,
            doelen: [
              ...oud.doelen.filter(
                (d) => !(d.account === account && d.platform === platform && d.maand === maand),
              ),
              nieuw,
            ],
          }
        : oud,
    );

    try {
      const res = await fetch("/api/budgetbeheer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nieuw),
      });
      if (!res.ok) {
        const antwoord = (await res.json()) as { fout?: string };
        throw new Error(antwoord.fout ?? `Opslaan mislukt (${res.status}).`);
      }
      const sleutel = `${sleutelVan(account, platform)}\u0000${maand}`;
      setBewaard(sleutel);
      setTimeout(() => setBewaard((s) => (s === sleutel ? null : s)), 1500);
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
      haal(); // terug naar wat er echt staat
    }
  }

  if (!ingelogd) {
    return <Inlogprompt tekst="Log in om budgetten en doelen te bekijken en in te vullen." />;
  }

  const forecastUitgaven = forecast(totalen.uitgaven, voortgang);
  const forecastKlikken = forecast(totalen.klikken, voortgang);

  return (
    <div className="flex flex-col gap-6">
      <div className="kaart-omlijst flex flex-col gap-3 rounded-panel border border-line bg-card px-4 py-3 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <KeuzeRij
            label="Platform"
            opties={platformOpties}
            gekozen={platform}
            weergave={platformLabel}
            onKies={setPlatform}
          />
          <div className="shrink-0 text-right">
            <p className="font-sans-w7 text-sm font-semibold text-ink">{maandLabel(maand)}</p>
            <p className="text-meta text-ink-faint">
              {bezig
                ? "Laden…"
                : voortgang.verstrekenDagen === 0
                  ? "Eerste dag van de maand"
                  : `Dag ${voortgang.verstrekenDagen} van ${voortgang.dagenInMaand} · t/m gisteren`}
            </p>
          </div>
        </div>
        <KeuzeRij label="Account" opties={accountOpties} gekozen={account} onKies={setAccount} />
      </div>

      {fout && (
        <p className="rounded-panel border border-line bg-card px-4 py-3 text-sm text-negative">{fout}</p>
      )}
      {data?.doelenFout && (
        <p className="rounded-panel border border-line bg-card px-4 py-3 text-sm text-negative">
          Budgetten en doelen konden niet worden gelezen ({data.doelenFout}). Is migratie
          0027_budget_doelen.sql al gedraaid?
        </p>
      )}

      <div className="grid grid-cols-8 gap-6">
        <div className="col-span-1 flex flex-col gap-3">
          <p className="label-theme text-label text-ink-faint">Budget</p>
          <Kaart
            label="Uitgaven"
            waarde={formatteer(totalen.uitgaven, "euro-heel")}
            toelichting={
              totalen.budget ? `${Math.round((totalen.uitgaven / totalen.budget) * 100)}% van het budget` : "in deze maand"
            }
            balk={totalen.budget ? (totalen.uitgaven / totalen.budget) * 100 : null}
          />
          <Kaart
            label="Forecast uitgaven"
            waarde={formatteer(forecastUitgaven, "euro-heel")}
            {...verschilRegel(forecastUitgaven, totalen.budget, "budget")}
          />
          <Kaart
            label="Budget"
            waarde={formatteer(totalen.budget, "euro-heel")}
            toelichting={
              totalen.budget === null
                ? "nog niet ingevuld — zie de tabel hieronder"
                : `${formatteer(Math.max(0, totalen.budget - totalen.uitgaven), "euro-heel")} nog te besteden`
            }
          />
        </div>

        <div className="col-span-1 flex flex-col gap-3">
          <p className="label-theme text-label text-ink-faint">Klikken</p>
          <Kaart
            label="Klikken behaald"
            waarde={formatteer(totalen.klikken, "aantal")}
            toelichting={
              totalen.doelKlikken
                ? `${Math.round((totalen.klikken / totalen.doelKlikken) * 100)}% van het doel`
                : "in deze maand"
            }
            balk={totalen.doelKlikken ? (totalen.klikken / totalen.doelKlikken) * 100 : null}
          />
          <Kaart
            label="Forecast klikken"
            waarde={formatteer(forecastKlikken === null ? null : Math.round(forecastKlikken), "aantal")}
            {...verschilRegel(forecastKlikken, totalen.doelKlikken, "klikken")}
          />
          <Kaart
            label="Doel klikken"
            waarde={formatteer(totalen.doelKlikken, "aantal")}
            toelichting={
              totalen.doelKlikken === null
                ? "nog niet ingevuld — zie de tabel hieronder"
                : `nog ${formatteer(Math.max(0, totalen.doelKlikken - totalen.klikken), "aantal")} te gaan`
            }
          />
        </div>

        <section className="kaart-omlijst col-span-5 flex flex-col rounded-panel border border-line bg-card px-5 py-4 shadow-subtle">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-sans-w7 text-cell font-semibold text-ink">{grafiekTitel}</h2>
              <p className="mt-0.5 text-meta text-ink-muted">
                {account && platform ? `${account} · ${platformLabel(platform)} · ${jaar}` : jaar}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <KeuzeRij
                label="Cijfer"
                opties={["budget", "klikken"]}
                gekozen={cijfer}
                weergave={(o) => CIJFER_LABEL[o as Cijfer]}
                onKies={(o) => setCijfer(o as Cijfer)}
              />
              <KeuzeRij
                label="Weergave"
                opties={["waarden", "resultaat"]}
                gekozen={weergave}
                weergave={(o) => WEERGAVE_LABEL[o as Weergave]}
                onKies={(o) => setWeergave(o as Weergave)}
              />
            </div>
          </div>
          {eerderFout ? (
          <p className="mt-2 text-meta text-negative">
            De uitgaven van de eerdere maanden konden niet worden geladen ({eerderFout}).
          </p>
        ) : (
          eerder === null && <p className="mt-2 text-meta text-ink-faint">Eerdere maanden laden…</p>
        )}
        <div className="mt-4 min-h-72 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={jaarReeks}
                margin={{ top: 20, right: 8, bottom: 16, left: 4 }}
                barGap={2}
              >
                <CartesianGrid stroke={kleuren.raster} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: AS_GROOTTE, fill: kleuren.as }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: AS_GROOTTE, fill: kleuren.as }}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tickFormatter={(v: number) => formatteer(v, grafiekConfig.eenheid, true)}
                />
                <Tooltip
                  content={<MaandTooltip eenheid={grafiekConfig.eenheid} />}
                  cursor={{ fill: "rgba(25,36,59,0.04)" }}
                />
                {grafiekConfig.soort === "waarden" ? (
                  <>
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="square"
                      iconSize={10}
                      wrapperStyle={{ fontSize: AS_GROOTTE, paddingBottom: 8 }}
                    />
                    <Bar
                      dataKey={grafiekConfig.doelKey}
                      name={grafiekConfig.naamDoel}
                      fill={kleuren.categorieen[0]}
                      radius={[kleuren.staafradius, kleuren.staafradius, 0, 0]}
                      isAnimationActive={false}
                    >
                      {jaarReeks.map((p) => (
                        <Cell key={p.maand} fillOpacity={p.volledig ? 1 : 0.35} />
                      ))}
                      <LabelList
                        dataKey={grafiekConfig.doelKey}
                        position="top"
                        fill={kleuren.label}
                        fontSize={10}
                        fontWeight={600}
                        formatter={(v: unknown) =>
                          v === null || v === undefined ? "" : formatteer(Number(v), grafiekConfig.eenheid)
                        }
                      />
                    </Bar>
                    <Bar
                      dataKey={grafiekConfig.waardeKey}
                      name={grafiekConfig.naamWaarde}
                      fill={kleuren.categorieen[1]}
                      radius={[kleuren.staafradius, kleuren.staafradius, 0, 0]}
                      isAnimationActive={false}
                    >
                      {jaarReeks.map((p) => (
                        <Cell key={p.maand} fillOpacity={p.volledig ? 1 : 0.35} />
                      ))}
                      <LabelList
                        dataKey={grafiekConfig.waardeKey}
                        position="top"
                        fill={kleuren.label}
                        fontSize={10}
                        fontWeight={600}
                        formatter={(v: unknown) =>
                          v === null || v === undefined ? "" : formatteer(Number(v), grafiekConfig.eenheid)
                        }
                      />
                    </Bar>
                  </>
                ) : (
                  <>
                    <ReferenceLine y={0} stroke={kleuren.as} />
                    <Bar
                      dataKey={grafiekConfig.resultaatKey}
                      name="Resultaat"
                      radius={[kleuren.staafradius, kleuren.staafradius, kleuren.staafradius, kleuren.staafradius]}
                      isAnimationActive={false}
                    >
                      {jaarReeks.map((p) => (
                        <Cell
                          key={p.maand}
                          fill={resultaatKleur(p[grafiekConfig.oordeelKey], cijfer, kleuren)}
                          fillOpacity={p.volledig ? 1 : 0.35}
                        />
                      ))}
                      <LabelList
                        dataKey={grafiekConfig.resultaatKey}
                        content={(props) => (
                          <ResultaatLabel {...props} kleuren={kleuren} eenheid={grafiekConfig.eenheid} />
                        )}
                      />
                    </Bar>
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
          {weergave === "resultaat" && (
            <p className="mt-2 text-meta text-ink-faint">
              Positief is meer dan {cijfer === "budget" ? "budget" : "doel"} uitgegeven resp. behaald; kleur
              volgt het oordeel hierboven, niet alleen het teken.
            </p>
          )}
        </section>

        <div className="col-span-1 flex flex-col gap-3">
          <p className="label-theme text-label text-ink-faint">{ytdPeriode}</p>
          <Kaart
            label="Budget totaal"
            waarde={formatteer(ytd.budget, "euro-heel")}
            toelichting={ytd.budget === null ? "nog niet ingevuld" : ytdPeriode}
          />
          <Kaart
            label="Uitgaven totaal"
            waarde={formatteer(ytd.uitgaven, "euro-heel")}
            toelichting={
              ytd.uitgaven === null
                ? "jaaroverzicht laadt…"
                : ytd.budget
                  ? `${Math.round((ytd.uitgaven / ytd.budget) * 100)}% van het budget`
                  : ytdPeriode
            }
            balk={ytd.uitgaven !== null && ytd.budget ? (ytd.uitgaven / ytd.budget) * 100 : null}
          />
          <Kaart
            label="Resultaat"
            waarde={formatteer(ytd.resultaat, "euro-heel")}
            toelichting={
              ytd.resultaat === null
                ? "budget of uitgaven nog niet compleet"
                : `${ytd.resultaat >= 0 ? "binnen" : "boven"} budget${ytd.oordeel ? ` · ${OORDEEL_TEKST[ytd.oordeel]}` : ""}`
            }
            toelichtingKleur={oordeelKleur(ytd.oordeel, "budget")}
          />
        </div>
      </div>

      <p className="flex items-start gap-2 text-meta text-ink-muted">
        <IconInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        De forecast rekent met het gemiddelde per verstreken dag: (gerealiseerd ÷ verstreken
        dagen) × dagen in de maand. Vandaag telt nog niet mee, de data wordt &apos;s nachts
        bijgewerkt. Binnen 10% van budget of doel heet &quot;op koers&quot;. De bron is dezelfde als
        Social ads (Meta en LinkedIn), klikken zijn álle klikken.
      </p>

      <section className="kaart-omlijst rounded-panel border border-line bg-card shadow-subtle">
        <header className="border-b border-line px-5 py-4">
          <h2 className="font-sans-w7 text-cell font-semibold text-ink">Budget en doelen per account en platform</h2>
          <p className="mt-0.5 text-meta text-ink-muted">
            {account && platform ? `${account} · ${platformLabel(platform)} · ${jaar}. ` : ""}
            Vul per maand het budget en het doel aantal klikken in. Opslaan gebeurt zodra je het
            veld verlaat.
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                {[
                  "Account",
                  "Platform",
                  "Maand",
                  "Uitgaven",
                  "Forecast",
                  "Budget",
                  "Klikken",
                  "Forecast",
                  "Doel klikken",
                ].map((kop, i) => (
                  <th
                    key={`${kop}-${i}`}
                    className={`whitespace-nowrap border-b border-line bg-surface-tint px-4 py-2.5 ${
                      i >= 3 ? "text-right" : "text-left"
                    }`}
                  >
                    <span className="label-theme text-label text-ink-faint">{kop}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!account || !platform ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-ink-muted">
                    {bezig ? "Laden…" : "Nog geen accounts of platforms met uitgaven."}
                  </td>
                </tr>
              ) : (
                regels.map((r) => {
                  const sleutel = `${sleutelVan(account, platform)}\u0000${r.maand}`;
                  const v = maandVoortgang(r.maand);
                  const fUitgaven = r.uitgaven === null ? null : forecast(r.uitgaven, v);
                  const fKlikken = r.klikken === null ? null : forecast(r.klikken, v);
                  const oBudget = oordeelVan(fUitgaven, r.budget);
                  const oKlikken = oordeelVan(fKlikken, r.doelKlikken);
                  return (
                    <tr key={sleutel} className={r.maand === maand ? "bg-primary-light" : undefined}>
                      <td className="border-b border-line-soft px-4 py-2.5 text-ink">
                        {account}
                        {bewaard === sleutel && <span className="ml-2 text-meta text-positive">opgeslagen</span>}
                      </td>
                      <td className="border-b border-line-soft px-4 py-2.5 text-ink">{platformLabel(platform)}</td>
                      <td className="whitespace-nowrap border-b border-line-soft px-4 py-2.5 text-ink-muted">
                        {maandLabel(r.maand)}
                      </td>
                      <td className="whitespace-nowrap border-b border-line-soft px-4 py-2.5 text-right text-ink">
                        {formatteer(r.uitgaven, "euro-heel")}
                      </td>
                      <td className="whitespace-nowrap border-b border-line-soft px-4 py-2.5 text-right">
                        <span className="text-ink">{formatteer(fUitgaven, "euro-heel")}</span>
                        {oBudget && (
                          <span className={`block text-meta ${oordeelKleur(oBudget, "budget")}`}>
                            {OORDEEL_TEKST[oBudget]}
                          </span>
                        )}
                      </td>
                      <td className="border-b border-line-soft px-4 py-2 text-right">
                        <GetalVeld
                          waarde={r.budget}
                          voorvoegsel="€"
                          label={`Budget ${account} ${platformLabel(platform)} ${maandLabel(r.maand)}`}
                          onBewaar={(budget) => bewaar(account, platform, r.maand, { budget })}
                        />
                      </td>
                      <td className="whitespace-nowrap border-b border-line-soft px-4 py-2.5 text-right text-ink">
                        {formatteer(r.klikken, "aantal")}
                      </td>
                      <td className="whitespace-nowrap border-b border-line-soft px-4 py-2.5 text-right">
                        <span className="text-ink">
                          {formatteer(fKlikken === null ? null : Math.round(fKlikken), "aantal")}
                        </span>
                        {oKlikken && (
                          <span className={`block text-meta ${oordeelKleur(oKlikken, "klikken")}`}>
                            {OORDEEL_TEKST[oKlikken]}
                          </span>
                        )}
                      </td>
                      <td className="border-b border-line-soft px-4 py-2 text-right">
                        <GetalVeld
                          waarde={r.doelKlikken}
                          label={`Doel klikken ${account} ${platformLabel(platform)} ${maandLabel(r.maand)}`}
                          heel
                          onBewaar={(doelKlikken) => bewaar(account, platform, r.maand, { doelKlikken })}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/** De regel onder een forecast: hoeveel boven of onder budget/doel, en het oordeel. */
function verschilRegel(
  verwacht: number | null,
  doel: number | null,
  soort: "budget" | "klikken",
): { toelichting: string; toelichtingKleur?: string } {
  if (verwacht === null) return { toelichting: "nog geen verstreken dag in deze maand" };
  if (doel === null || doel <= 0) {
    return { toelichting: soort === "budget" ? "geen budget om tegen af te zetten" : "geen doel om tegen af te zetten" };
  }
  const oordeel = oordeelVan(verwacht, doel);
  const verschil = verwacht - doel;
  const bedrag =
    soort === "budget"
      ? formatteer(Math.abs(verschil), "euro-heel")
      : formatteer(Math.round(Math.abs(verschil)), "aantal");
  const richting = verschil >= 0 ? "boven" : "onder";
  const tegen = soort === "budget" ? "budget" : "doel";
  return {
    toelichting: `${bedrag} ${richting} ${tegen} · ${oordeel ? OORDEEL_TEKST[oordeel] : ""}`,
    toelichtingKleur: oordeelKleur(oordeel, soort),
  };
}

/**
 * Eén rij keuzeknoppen waarvan er altijd precies één aan staat. Nogmaals klikken op de
 * gekozen knop doet niets: "niets gekozen" bestaat hier niet.
 */
function KeuzeRij({
  label,
  opties,
  gekozen,
  weergave = (o) => o,
  onKies,
}: {
  label: string;
  opties: string[];
  gekozen: string | null;
  weergave?: (optie: string) => string;
  onKies: (optie: string) => void;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3" role="radiogroup" aria-label={label}>
      <span className="label-theme w-16 shrink-0 pt-1.5 text-label text-ink-faint">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {opties.length === 0 && <span className="py-1 text-sm text-ink-faint">—</span>}
        {opties.map((optie) => {
          const aan = optie === gekozen;
          return (
            <button
              key={optie}
              type="button"
              role="radio"
              aria-checked={aan}
              onClick={() => onKies(optie)}
              className={`rounded-control border px-2.5 py-1 text-sm font-medium transition-colors duration-[var(--duur-snel)] ${
                aan
                  ? "border-primary bg-primary-light text-primary"
                  : "border-line text-ink-muted hover:bg-surface hover:text-ink"
              }`}
            >
              {weergave(optie)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Volgt welke staven de grafiek op dat moment tekent (budget/uitgaven, doel/klikken of
 * het ene resultaat) in plaats van vaste velden aan te nemen — dezelfde tooltip bedient
 * dus alle vier de weergaven uit de keuzebalk.
 */
function MaandTooltip({
  active,
  payload,
  eenheid,
}: {
  active?: boolean;
  payload?: { name: string; value: number | null; payload: MaandPunt }[];
  eenheid: Eenheid;
}) {
  if (!active || !payload?.[0]) return null;
  return (
    <div className="rounded-card border border-line bg-card px-3 py-2 text-xs shadow-card">
      <p className="text-ink-muted">{maandLabel(payload[0].payload.maand)}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-ink">
          {p.name} <span className="font-sans-w7 font-bold">{formatteer(p.value, eenheid)}</span>
        </p>
      ))}
    </div>
  );
}

/**
 * Label boven een resultaatstaaf: boven de staaf bij een plus, eronder bij een min. De
 * ingebouwde `position="top"` van Recharts zet het label altijd bij de bovenkant van de
 * rechthoek — bij een negatieve staaf (die vanaf nul omlaag tekent) is dat de nullijn, niet
 * de punt van de staaf, dus hier bepaalt het teken van de waarde de kant.
 */
function ResultaatLabel(props: {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  value?: unknown;
  kleuren: GrafiekKleuren;
  eenheid: Eenheid;
}) {
  const { value, kleuren, eenheid } = props;
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const width = Number(props.width ?? 0);
  const height = Number(props.height ?? 0);
  if (value === null || value === undefined || value === "") return null;
  const getal = Number(value as string | number);
  if (!Number.isFinite(getal)) return null;
  const negatief = getal < 0;
  const labelY = negatief ? y + height + 14 : y - 6;
  return (
    <text
      x={x + width / 2}
      y={labelY}
      textAnchor="middle"
      fontSize={10}
      fontWeight={600}
      fill={kleuren.label}
    >
      {formatteer(getal, eenheid)}
    </text>
  );
}

function Kaart({
  label,
  waarde,
  toelichting,
  toelichtingKleur = "text-ink-faint",
  balk = null,
}: {
  label: string;
  waarde: string;
  toelichting: string;
  toelichtingKleur?: string;
  balk?: number | null;
}) {
  return (
    <div className="kaart-omlijst flex min-h-32 flex-col justify-center gap-1.5 rounded-card border border-line bg-card px-4 py-4 shadow-subtle">
      <span className="label-theme text-label text-ink-faint">{label}</span>
      <span className="titel-theme font-sans-w7 text-title font-semibold text-ink">{waarde}</span>
      {balk !== null && <ProgressBar percent={balk} className="h-1 w-full max-w-64" />}
      <span className={`text-meta ${toelichtingKleur}`}>{toelichting}</span>
    </div>
  );
}

/**
 * Een getalveld dat pas opslaat bij het verlaten (of Enter), niet bij elke toetsaanslag.
 * Leeg betekent "geen budget/doel", niet nul. Een komma als decimaalteken mag.
 */
function GetalVeld({
  waarde,
  label,
  voorvoegsel,
  heel = false,
  onBewaar,
}: {
  waarde: number | null;
  label: string;
  voorvoegsel?: string;
  heel?: boolean;
  onBewaar: (waarde: number | null) => void;
}) {
  const [tekst, setTekst] = useState(waarde === null ? "" : String(waarde).replace(".", ","));
  const [ongeldig, setOngeldig] = useState(false);

  useEffect(() => {
    setTekst(waarde === null ? "" : String(waarde).replace(".", ","));
  }, [waarde]);

  function verlaat() {
    const kaal = tekst.trim().replace(/\./g, "").replace(",", ".");
    if (!kaal) {
      setOngeldig(false);
      onBewaar(null);
      return;
    }
    const getal = Number(kaal);
    if (!Number.isFinite(getal) || getal < 0) {
      setOngeldig(true);
      return;
    }
    setOngeldig(false);
    onBewaar(heel ? Math.round(getal) : Math.round(getal * 100) / 100);
  }

  return (
    <span className="inline-flex items-center gap-1">
      {voorvoegsel && <span className="text-ink-faint">{voorvoegsel}</span>}
      <input
        inputMode="decimal"
        value={tekst}
        onChange={(e) => setTekst(e.target.value)}
        onBlur={verlaat}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        placeholder="—"
        aria-label={label}
        aria-invalid={ongeldig}
        className={`w-28 rounded-control border bg-card px-2 py-1 text-right text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none ${
          ongeldig ? "border-negative" : "border-line"
        }`}
      />
    </span>
  );
}
