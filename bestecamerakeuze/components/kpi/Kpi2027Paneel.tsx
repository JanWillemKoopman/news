"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Inlogprompt from "@/components/Inlogprompt";
import GaOverzichtTabel from "@/components/kpi/GaOverzichtTabel";
import EerdereJarenSchakelaar, { useEerdereJaren } from "@/components/kpi/EerdereJaren";
import KpiKaart, { type KanalenStand } from "@/components/kpi/KpiKaart";
import type { KanalenAntwoord } from "@/lib/kpi2027/kanalen";
import { IconInfo, IconRefresh } from "@/components/icons";
import { useIsActief } from "@/lib/kanalen/actieveWeergave";
import { KPI_DOELJAAR, KPI_GROEI, KPI_JAAR, KPI_WEBSITES } from "@/lib/kpi2027/definities";
import { metGroei, type Kpi2027Antwoord } from "@/lib/kpi2027/rekenen";
import { slaGroeiOp } from "@/components/kpi/groeiOpslaan";

/**
 * KPI's 2027: per website en per KPI het target voor 2027 — de verwachting voor heel 2026
 * plus 5%, of het percentage dat iemand per KPI heeft ingetypt — met de realisatie van 2026 in een jaargrafiek en die van 2027 ernaast.
 *
 * Bovenaan één tab per website. Dat is een uitzondering op de regel "geen dubbele
 * navigatie" (CLAUDE.md), op verzoek: het zijn geen aparte pagina's maar dezelfde pagina
 * voor een andere property. Het gekozen tabblad staat in de URL (`?kpisite=pgz`).
 *
 * De standen worden wekelijks op zondag bijgewerkt tot en met zaterdag (`vercel.json`,
 * `lib/kpi2027/bijwerken.ts`). Deze pagina leest ze alleen; het rekenwerk staat in
 * `lib/kpi2027/rekenen.ts` en welk GA4-cijfer bij welke KPI hoort in
 * `lib/kpi2027/definities.ts`.
 */

const URL_PARAMETER = "kpisite";
const STANDAARD = KPI_WEBSITES[0].sleutel;

function datumLang(datum: string): string {
  return new Date(`${datum}T00:00:00Z`).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function momentTekst(iso: string): string {
  return new Date(iso).toLocaleString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
}

export default function Kpi2027Paneel({ ingelogd }: { ingelogd: boolean }) {
  const [eerdereJaren] = useEerdereJaren();
  const actief = useIsActief("kpi-2027");
  const [data, setData] = useState<Kpi2027Antwoord | null>(null);
  const [bezig, setBezig] = useState(true);
  const [bijwerken, setBijwerken] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [gekozen, setGekozen] = useState<string>(STANDAARD);
  // De kanaalverdeling per website (knopje "Kanalen"): pas opgehaald bij de eerste klik,
  // en dan één keer voor alle kaarten van die website.
  const [kanalen, setKanalen] = useState<Record<string, Omit<KanalenStand, "laad">>>({});
  const kanalenGevraagd = useRef(new Set<string>());
  const laadKanalen = useCallback((sleutel: string) => {
    if (kanalenGevraagd.current.has(sleutel)) return;
    kanalenGevraagd.current.add(sleutel);
    setKanalen((oud) => ({ ...oud, [sleutel]: { status: "laden", antwoord: null } }));
    fetch(`/api/kpi-2027/kanalen?website=${encodeURIComponent(sleutel)}`)
      .then(async (res) => {
        const antwoord = (await res.json().catch(() => ({ fout: `HTTP ${res.status}` }))) as KanalenAntwoord;
        if (!res.ok || antwoord.fout) throw new Error(antwoord.fout ?? `HTTP ${res.status}`);
        setKanalen((oud) => ({ ...oud, [sleutel]: { status: "klaar", antwoord } }));
      })
      .catch((err: unknown) => {
        // Bij een fout mag een volgende klik het opnieuw proberen.
        kanalenGevraagd.current.delete(sleutel);
        const tekst = err instanceof Error ? err.message : String(err);
        setKanalen((oud) => ({ ...oud, [sleutel]: { status: "fout", antwoord: { fout: tekst } } }));
      });
  }, []);

  // Uit de URL lezen in een effect, om dezelfde reden als `?tab=` in AppShell: de server
  // rendert altijd het eerste tabblad.
  useEffect(() => {
    const uitUrl = new URLSearchParams(window.location.search).get(URL_PARAMETER);
    if (uitUrl && KPI_WEBSITES.some((w) => w.sleutel === uitUrl)) setGekozen(uitUrl);
  }, []);

  // Alleen schrijven zolang dit tabblad open staat: het paneel blijft gemount als je
  // wegklikt, en dan hoort `?kpisite=` niet mee te verhuizen naar een ander tabblad.
  useEffect(() => {
    if (!actief) return;
    const params = new URLSearchParams(window.location.search);
    if (gekozen === STANDAARD) params.delete(URL_PARAMETER);
    else params.set(URL_PARAMETER, gekozen);
    const zoek = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${zoek ? `?${zoek}` : ""}`);
  }, [actief, gekozen]);

  const verwerk = useCallback(async (res: Response) => {
    const antwoord = (await res.json()) as Kpi2027Antwoord;
    if (!res.ok) throw new Error(antwoord.fout ?? `Ophalen mislukt (${res.status}).`);
    setData(antwoord);
    setFout(antwoord.fout ?? null);
  }, []);

  useEffect(() => {
    if (!ingelogd) return;
    fetch("/api/kpi-2027")
      .then(verwerk)
      .catch((err: unknown) => setFout(err instanceof Error ? err.message : String(err)))
      .finally(() => setBezig(false));
  }, [ingelogd, verwerk]);

  async function werkBij() {
    if (bijwerken) return;
    setBijwerken(true);
    try {
      await verwerk(await fetch("/api/kpi-2027", { method: "POST" }));
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setBijwerken(false);
    }
  }

  /** Bewaart het percentage van één KPI en rekent de kaart meteen opnieuw uit. */
  async function zetGroei(websiteSleutel: string, kpiSleutel: string, groei: number | null) {
    await slaGroeiOp({ tabblad: "kpi-2027", website: websiteSleutel, kpi: kpiSleutel, groei });
    setData((oud) =>
      oud && {
        ...oud,
        websites: oud.websites.map((w) =>
          w.sleutel !== websiteSleutel
            ? w
            : {
                ...w,
                kpis: w.kpis.map((k) =>
                  k.sleutel !== kpiSleutel
                    ? k
                    : {
                        ...k,
                        uitkomst: k.uitkomst && metGroei(k.uitkomst, groei ?? KPI_GROEI),
                        groeiAangepast: groei !== null,
                      },
                ),
              },
        ),
      },
    );
  }

  if (!ingelogd) return <Inlogprompt tekst="Log in om de KPI's en targets te bekijken." />;

  const website = data?.websites.find((w) => w.sleutel === gekozen) ?? null;
  const stand = website?.stand ?? null;
  const groeiTekst = `${Math.round(KPI_GROEI * 100)}%`;

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Website" className="flex flex-wrap gap-x-6 border-b border-line">
        {KPI_WEBSITES.map((w) => {
          const aan = gekozen === w.sleutel;
          return (
            <button
              key={w.sleutel}
              type="button"
              role="tab"
              aria-selected={aan}
              onClick={() => setGekozen(w.sleutel)}
              className={`-mb-px border-b-2 px-1 pb-2.5 text-sm transition-colors duration-[var(--duur-snel)] ease-merk ${
                aan ? "border-primary font-medium text-ink" : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {w.naam}
            </button>
          );
        })}
      </div>

      <div className="kaart-omlijst flex items-center justify-between gap-6 rounded-panel border border-line bg-card px-5 py-3.5 shadow-card">
        <div>
          {website && stand ? (
            <>
              <p className="font-sans-w7 text-sm font-semibold text-ink">
                {website.domein} ·{" "}
                {stand.definitief
                  ? `${KPI_JAAR} is voorbij — dit is de definitieve basis voor ${KPI_DOELJAAR}`
                  : `stand t/m ${datumLang(stand.peildatum)}`}
              </p>
              <p className="mt-0.5 text-meta text-ink-muted">
                Bijgewerkt {momentTekst(website.standDoeljaar?.berekendOp ?? stand.berekendOp)}
                {website.volgendeUpdate ? ` · volgende update ${datumLang(website.volgendeUpdate)}` : ""}
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-muted">
              {bezig
                ? "Laden…"
                : "Er staat voor deze website nog geen stand klaar. De eerste verschijnt zondag; een beheerder kan hem nu al laten berekenen."}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <EerdereJarenSchakelaar />
          {data?.magBijwerken && (
          <button
            type="button"
            onClick={werkBij}
            disabled={bijwerken}
            title="Haalt 2026 voor alle websites opnieuw op bij Google Analytics, t/m de laatste zaterdag — dezelfde stand als de update op zondag."
            className="flex shrink-0 items-center gap-1.5 rounded-control border border-line bg-card px-3 py-1.5 text-sm font-medium text-ink shadow-card transition-colors duration-[var(--duur-snel)] ease-merk hover:bg-surface disabled:cursor-wait disabled:opacity-70"
          >
            <IconRefresh className={`h-3.5 w-3.5 ${bijwerken ? "animate-spin" : ""}`} />
            {bijwerken ? "Bezig… (± 1–2 min)" : "Nu bijwerken"}
          </button>
          )}
        </div>
      </div>

      {fout && <p className="rounded-panel border border-line bg-card px-4 py-3 text-sm text-negative">{fout}</p>}

      {eerdereJaren && website?.vergelijkingTekst && (
        <p className="flex items-start gap-2 rounded-panel border border-line bg-card px-4 py-3 text-sm text-ink">
          <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
          <span>{website.vergelijkingTekst}</span>
        </p>
      )}

      {website?.uitvalTekst && (
        <p className="flex items-start gap-2 rounded-panel border border-line bg-card px-4 py-3 text-sm text-ink">
          <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
          <span>{website.uitvalTekst}</span>
        </p>
      )}

      <p className="flex items-start gap-2 text-meta text-ink-muted">
        <IconInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          <strong className="font-semibold text-ink">{KPI_JAAR} incl. verwachting</strong> = wat Google Analytics op
          de gemeten dagen t/m de peildatum telde, plus het gemiddelde per gemeten dag × alle overige dagen van{" "}
          {KPI_JAAR} (de resterende dagen, en dagen waarop de website 0 sessies had).{" "}
          <strong className="font-semibold text-ink">Target {KPI_DOELJAAR}</strong> = die verwachting plus de groei
          (standaard +{groeiTekst}; klik op het percentage bij Groei om het per KPI aan te passen — dat geldt voor
          iedereen); het maandtarget is het jaartarget ÷ 12. <strong className="font-semibold text-ink">Realisatie {KPI_DOELJAAR}</strong>{" "}
          telt vanaf 1 januari {KPI_DOELJAAR} mee. Alles wordt elke zondag bijgewerkt t/m zaterdag. In de grafiek is de
          doorgetrokken lijn gemeten en de gestippelde lijn verwachting of bijgeschat.
        </span>
      </p>

      {website && website.kpis.length > 0 && (
        <GaOverzichtTabel website={website} opslaanGroei={(kpi, groei) => zetGroei(website.sleutel, kpi, groei)} />
      )}

      {website && website.kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-6 min-[1800px]:grid-cols-3">
          {website.kpis.map((kpi) => (
            <KpiKaart
              key={kpi.sleutel}
              kpi={kpi}
              website={website}
              opslaanGroei={(groei) => zetGroei(website.sleutel, kpi.sleutel, groei)}
              toonEerdereJaren={eerdereJaren}
              kanalen={
                website.kanaalverdeling
                  ? {
                      ...(kanalen[website.sleutel] ?? { status: "leeg", antwoord: null }),
                      laad: () => laadKanalen(website.sleutel),
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
