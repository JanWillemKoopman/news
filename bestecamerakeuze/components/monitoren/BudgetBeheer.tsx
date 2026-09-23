"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import FilterSelect from "@/components/FilterSelect";
import Inlogprompt from "@/components/Inlogprompt";
import ProgressBar from "@/components/ProgressBar";
import { IconInfo } from "@/components/icons";
import { formatteer } from "@/components/chat/chartTheme";
import {
  forecast,
  huidigeMaand,
  maandVoortgang,
  oordeelVan,
  sleutelVan,
  telOpVoorMaand,
  verschuifMaand,
  type BudgetDoel,
  type DagRegel,
  type Oordeel,
} from "@/lib/kanalen/budgetBeheer";

/**
 * Budget beheer: gaan we deze maand te langzaam, goed of te snel — per account en
 * platform, voor budget én klikken?
 *
 * Bovenaan zes kaartjes in twee kolommen (links geld, rechts klikken): gerealiseerd,
 * forecast en afspraak. Onderaan de tabel waarin die afspraak per account × platform ×
 * maand wordt ingevuld; dezelfde tabel toont per regel ook de realisatie en de forecast,
 * zodat je ziet wélk account de totalen boven de tabel uit de pas trekt.
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

const PLATFORM_LABEL: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  threads: "Threads",
  linkedin: "LinkedIn",
  audience_network: "Audience Network",
  messenger: "Messenger",
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

/** Twaalf maanden terug en twee vooruit — vooruit, zodat je het budget op tijd invult. */
function maandOpties(): string[] {
  const nu = huidigeMaand();
  return Array.from({ length: 15 }, (_, i) => verschuifMaand(nu, 2 - i));
}

const OORDEEL_TEKST: Record<Oordeel, string> = {
  "te-langzaam": "te langzaam",
  "op-koers": "op koers",
  "te-snel": "te snel",
};

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
  const [maand, setMaand] = useState(huidigeMaand);
  const [data, setData] = useState<Antwoord | null>(null);
  const [bezig, setBezig] = useState(true);
  const [fout, setFout] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [bewaard, setBewaard] = useState<string | null>(null);

  const haal = useCallback(() => {
    setBezig(true);
    fetch(`/api/budgetbeheer?maand=${maand}`)
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
  }, [maand]);

  useEffect(haal, [haal]);

  const voortgang = useMemo(() => maandVoortgang(maand), [maand]);
  const dagen = useMemo(() => data?.dagen ?? [], [data]);
  const doelen = useMemo(() => data?.doelen ?? [], [data]);

  /** Elke account × platform die in de data, in de recente maanden of in de doelen voorkomt. */
  const paren = useMemo(() => {
    const gezien = new Map<string, { account: string; platform: string }>();
    for (const p of [...(data?.paren ?? []), ...dagen, ...doelen]) {
      gezien.set(sleutelVan(p.account, p.platform), { account: p.account, platform: p.platform });
    }
    return [...gezien.values()].sort(
      (a, b) => a.account.localeCompare(b.account, "nl") || a.platform.localeCompare(b.platform, "nl"),
    );
  }, [data, dagen, doelen]);

  const accountOpties = useMemo(() => [...new Set(paren.map((p) => p.account))], [paren]);
  const platformOpties = useMemo(
    () => [...new Set(paren.map((p) => platformLabel(p.platform)))].sort((a, b) => a.localeCompare(b, "nl")),
    [paren],
  );

  const binnen = useCallback(
    (account: string, platform: string) =>
      (accounts.length === 0 || accounts.includes(account)) &&
      (platforms.length === 0 || platforms.includes(platformLabel(platform))),
    [accounts, platforms],
  );

  const totalen = useMemo(() => telOpVoorMaand(dagen, doelen, maand, binnen), [dagen, doelen, maand, binnen]);

  const regels = useMemo(
    () =>
      paren
        .filter((p) => binnen(p.account, p.platform))
        .map((p) => {
          const t = telOpVoorMaand(dagen, doelen, maand, (a, pl) => a === p.account && pl === p.platform);
          return { ...p, ...t };
        }),
    [paren, binnen, dagen, doelen, maand],
  );

  async function bewaar(account: string, platform: string, patch: Partial<Pick<BudgetDoel, "budget" | "doelKlikken">>) {
    const huidig = doelen.find((d) => d.account === account && d.platform === platform) ?? {
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
              ...oud.doelen.filter((d) => !(d.account === account && d.platform === platform)),
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
      const sleutel = sleutelVan(account, platform);
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
  const lopend = maand === huidigeMaand();

  return (
    <div className="flex flex-col gap-6">
      <div className="kaart-omlijst flex flex-wrap items-center justify-between gap-3 rounded-panel border border-line bg-card px-4 py-3 shadow-card">
        <div>
          <p className="font-sans-w7 text-sm font-semibold text-ink">{maandLabel(maand)}</p>
          <p className="text-meta text-ink-faint">
            {bezig
              ? "Laden…"
              : voortgang.verstrekenDagen === 0
                ? "Deze maand is nog niet begonnen"
                : lopend
                  ? `Dag ${voortgang.verstrekenDagen} van ${voortgang.dagenInMaand} · t/m gisteren`
                  : `Afgelopen maand · ${voortgang.dagenInMaand} dagen`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <label className="flex min-w-[128px] flex-col gap-0.5 rounded-control px-3 py-1.5 hover:bg-surface">
            <span className="label-theme text-label text-ink-faint">Maand</span>
            <select
              value={maand}
              onChange={(e) => setMaand(e.target.value)}
              className="bg-card text-sm font-medium text-ink focus:outline-none"
            >
              {maandOpties().map((m) => (
                <option key={m} value={m}>
                  {maandLabel(m)}
                </option>
              ))}
            </select>
          </label>
          <FilterSelect label="Account" options={accountOpties} selected={accounts} onChange={setAccounts} zoekbaar />
          <FilterSelect label="Platform" options={platformOpties} selected={platforms} onChange={setPlatforms} />
        </div>
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

      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <p className="label-theme text-label text-ink-faint">Budget</p>
        <p className="label-theme text-label text-ink-faint">Klikken</p>

        <Kaart
          label="Uitgaven"
          waarde={formatteer(totalen.uitgaven, "euro-heel")}
          toelichting={
            totalen.budget ? `${Math.round((totalen.uitgaven / totalen.budget) * 100)}% van het budget` : "in deze maand"
          }
          balk={totalen.budget ? (totalen.uitgaven / totalen.budget) * 100 : null}
        />
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
          label="Forecast uitgaven"
          waarde={formatteer(forecastUitgaven, "euro-heel")}
          {...verschilRegel(forecastUitgaven, totalen.budget, "budget")}
        />
        <Kaart
          label="Forecast klikken"
          waarde={formatteer(forecastKlikken === null ? null : Math.round(forecastKlikken), "aantal")}
          {...verschilRegel(forecastKlikken, totalen.doelKlikken, "klikken")}
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
            Vul per regel het budget en het doel aantal klikken voor {maandLabel(maand).toLowerCase()} in.
            Opslaan gebeurt zodra je het veld verlaat.
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
              {!bezig && regels.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-ink-muted">
                    Geen accounts of platforms in deze selectie.
                  </td>
                </tr>
              )}
              {regels.map((r) => {
                const sleutel = sleutelVan(r.account, r.platform);
                const fUitgaven = forecast(r.uitgaven, voortgang);
                const fKlikken = forecast(r.klikken, voortgang);
                const oBudget = oordeelVan(fUitgaven, r.budget);
                const oKlikken = oordeelVan(fKlikken, r.doelKlikken);
                return (
                  <tr key={`${maand}-${sleutel}`}>
                    <td className="border-b border-line-soft px-4 py-2.5 text-ink">
                      {r.account}
                      {bewaard === sleutel && <span className="ml-2 text-meta text-positive">opgeslagen</span>}
                    </td>
                    <td className="border-b border-line-soft px-4 py-2.5 text-ink">{platformLabel(r.platform)}</td>
                    <td className="whitespace-nowrap border-b border-line-soft px-4 py-2.5 text-ink-muted">
                      {maandLabel(maand)}
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
                        label={`Budget ${r.account} ${platformLabel(r.platform)}`}
                        onBewaar={(budget) => bewaar(r.account, r.platform, { budget })}
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
                        label={`Doel klikken ${r.account} ${platformLabel(r.platform)}`}
                        heel
                        onBewaar={(doelKlikken) => bewaar(r.account, r.platform, { doelKlikken })}
                      />
                    </td>
                  </tr>
                );
              })}
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
    <div className="kaart-omlijst flex min-h-32 flex-col justify-center gap-1.5 rounded-card border border-line bg-card px-6 py-5 shadow-subtle">
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
