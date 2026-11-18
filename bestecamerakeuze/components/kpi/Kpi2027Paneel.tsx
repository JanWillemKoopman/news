"use client";

import { useCallback, useEffect, useState } from "react";
import Inlogprompt from "@/components/Inlogprompt";
import KpiKaart from "@/components/kpi/KpiKaart";
import { IconInfo, IconRefresh } from "@/components/icons";
import { KPI_DOELJAAR, KPI_GROEI, KPI_JAAR } from "@/lib/kpi2027/definities";
import type { Kpi2027Antwoord } from "@/lib/kpi2027/rekenen";

/**
 * KPI's 2027: per KPI van udenhout.nl het target voor 2027 — de verwachting voor heel 2026
 * plus 5% — met de realisatie van 2026 in een jaargrafiek ernaast.
 *
 * De stand wordt wekelijks op zondag bijgewerkt tot en met zaterdag (`vercel.json`,
 * `lib/kpi2027/bijwerken.ts`), tot 2026 voorbij is. Deze pagina leest alleen die stand;
 * het rekenwerk staat in `lib/kpi2027/rekenen.ts` en welk GA4-cijfer bij welke KPI hoort
 * in `lib/kpi2027/definities.ts`.
 */

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
  const [data, setData] = useState<Kpi2027Antwoord | null>(null);
  const [bezig, setBezig] = useState(true);
  const [bijwerken, setBijwerken] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const verwerk = useCallback(async (res: Response) => {
    const antwoord = (await res.json()) as Kpi2027Antwoord;
    if (!res.ok) throw new Error(antwoord.fout ?? `Ophalen mislukt (${res.status}).`);
    setData(antwoord);
    setFout(null);
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

  if (!ingelogd) return <Inlogprompt tekst="Log in om de KPI's en targets te bekijken." />;

  const stand = data?.stand ?? null;
  const groeiTekst = `${Math.round(KPI_GROEI * 100)}%`;

  return (
    <div className="flex flex-col gap-6">
      <div className="kaart-omlijst flex items-center justify-between gap-6 rounded-panel border border-line bg-card px-5 py-3.5 shadow-card">
        <div>
          {stand ? (
            <>
              <p className="font-sans-w7 text-sm font-semibold text-ink">
                {stand.definitief
                  ? `${KPI_JAAR} is volledig gemeten — dit is de definitieve basis voor ${KPI_DOELJAAR}`
                  : `Stand t/m ${datumLang(stand.peildatum)}`}
              </p>
              <p className="mt-0.5 text-meta text-ink-muted">
                Bijgewerkt {momentTekst(stand.berekendOp)}
                {data?.volgendeUpdate ? ` · volgende update ${datumLang(data.volgendeUpdate)}` : ""}
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-muted">
              {bezig
                ? "Laden…"
                : "Er staat nog geen stand klaar. De eerste verschijnt zondag; een beheerder kan hem nu al laten berekenen."}
            </p>
          )}
        </div>
        {data?.magBijwerken && (
          <button
            type="button"
            onClick={werkBij}
            disabled={bijwerken}
            title="Haalt 2026 opnieuw op bij Google Analytics, t/m de laatste zaterdag — dezelfde stand als de update op zondag."
            className="flex shrink-0 items-center gap-1.5 rounded-control border border-line bg-card px-3 py-1.5 text-sm font-medium text-ink shadow-card transition-colors duration-[var(--duur-snel)] ease-merk hover:bg-surface disabled:cursor-wait disabled:opacity-70"
          >
            <IconRefresh className={`h-3.5 w-3.5 ${bijwerken ? "animate-spin" : ""}`} />
            {bijwerken ? "Bezig… (± 30 s)" : "Nu bijwerken"}
          </button>
        )}
      </div>

      {fout && <p className="rounded-panel border border-line bg-card px-4 py-3 text-sm text-negative">{fout}</p>}

      <p className="flex items-start gap-2 text-meta text-ink-muted">
        <IconInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          <strong className="font-semibold text-ink">{KPI_JAAR} incl. verwachting</strong> = wat Google Analytics
          t/m de peildatum telde, plus het gemiddelde per dag × de resterende dagen van {KPI_JAAR}.{" "}
          <strong className="font-semibold text-ink">Target {KPI_DOELJAAR}</strong> = die verwachting +{groeiTekst};
          het maandtarget is het jaartarget ÷ 12. De stand wordt elke zondag bijgewerkt t/m zaterdag, tot {KPI_JAAR}{" "}
          voorbij is. In de grafiek is de doorgetrokken lijn gemeten en de gestippelde lijn verwachting.
        </span>
      </p>

      {data && data.kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-6 min-[1800px]:grid-cols-3">
          {data.kpis.map((kpi) => (
            <KpiKaart key={kpi.sleutel} kpi={kpi} />
          ))}
        </div>
      )}
    </div>
  );
}
