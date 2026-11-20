"use client";

import { useCallback, useEffect, useState } from "react";
import Inlogprompt from "@/components/Inlogprompt";
import KpiSocialKaart from "@/components/kpi/KpiSocialKaart";
import SocialOverzichtTabel from "@/components/kpi/SocialOverzichtTabel";
import { Definitie } from "@/components/kpi/KpiKaart";
import { IconInfo, IconRefresh } from "@/components/icons";
import { useIsActief } from "@/lib/kanalen/actieveWeergave";
import { KPI_DOELJAAR, KPI_JAAR } from "@/lib/kpi2027/definities";
import { KANAAL_NAMEN, SOCIAL_MERKEN } from "@/lib/kpi2027social/definities";
import { pasSocialGroeiToe, type Kpi2027SocialAntwoord } from "@/lib/kpi2027social/rekenen";
import { slaGroeiOp } from "@/components/kpi/groeiOpslaan";

/**
 * KPI's 2027 social media: per merk en per kanaal het target voor 2027, op precies dezelfde
 * manier als KPI's 2027 GA en Syntec — dezelfde statusbalk, overzichtstabel, kaarten en
 * grafiek. Het groeipercentage is per KPI het percentage dat het team vastlegde (niet +5%).
 *
 * Bovenaan één tab per merk (`?kpimerk=veloo`), net als de websitetabs op KPI's 2027 GA.
 * De standen worden wekelijks op zondag bijgewerkt (`lib/kpi2027social/bijwerken.ts`); welk
 * account bij welke KPI hoort en waarom staat in `lib/kpi2027social/definities.ts`.
 */

const URL_PARAMETER = "kpimerk";
const STANDAARD = SOCIAL_MERKEN[0].sleutel;

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

export default function Kpi2027SocialPaneel({ ingelogd }: { ingelogd: boolean }) {
  const actief = useIsActief("kpi-2027-social");
  const [data, setData] = useState<Kpi2027SocialAntwoord | null>(null);
  const [bezig, setBezig] = useState(true);
  const [bijwerken, setBijwerken] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [gekozen, setGekozen] = useState<string>(STANDAARD);

  useEffect(() => {
    const uitUrl = new URLSearchParams(window.location.search).get(URL_PARAMETER);
    if (uitUrl && SOCIAL_MERKEN.some((m) => m.sleutel === uitUrl)) setGekozen(uitUrl);
  }, []);

  useEffect(() => {
    if (!actief) return;
    const params = new URLSearchParams(window.location.search);
    if (gekozen === STANDAARD) params.delete(URL_PARAMETER);
    else params.set(URL_PARAMETER, gekozen);
    const zoek = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${zoek ? `?${zoek}` : ""}`);
  }, [actief, gekozen]);

  const verwerk = useCallback(async (res: Response) => {
    const antwoord = (await res.json()) as Kpi2027SocialAntwoord;
    if (!res.ok) throw new Error(antwoord.fout ?? `Ophalen mislukt (${res.status}).`);
    setData(antwoord);
    setFout(antwoord.fout ?? null);
  }, []);

  useEffect(() => {
    if (!ingelogd) return;
    fetch("/api/kpi-2027-social")
      .then(verwerk)
      .catch((err: unknown) => setFout(err instanceof Error ? err.message : String(err)))
      .finally(() => setBezig(false));
  }, [ingelogd, verwerk]);

  async function werkBij() {
    if (bijwerken) return;
    setBijwerken(true);
    try {
      await verwerk(await fetch("/api/kpi-2027-social", { method: "POST" }));
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setBijwerken(false);
    }
  }

  async function zetGroei(merkSleutel: string, kpiSleutel: string, groei: number | null) {
    await slaGroeiOp({ tabblad: "kpi-2027-social", website: merkSleutel, kpi: kpiSleutel, groei });
    setData((oud) => oud && { ...oud, merken: pasSocialGroeiToe(oud.merken, merkSleutel, kpiSleutel, groei) });
  }

  if (!ingelogd) return <Inlogprompt tekst="Log in om de KPI's en targets te bekijken." />;

  const merk = data?.merken.find((m) => m.sleutel === gekozen) ?? null;
  const nietGekoppeld = merk
    ? [...new Set(merk.kanalen.filter((g) => g.kpis.every((k) => k.nietGekoppeld)).map((g) => KANAAL_NAMEN[g.kanaal]))]
    : [];

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Merk" className="flex flex-wrap gap-x-6 border-b border-line">
        {SOCIAL_MERKEN.map((m) => {
          const aan = gekozen === m.sleutel;
          return (
            <button
              key={m.sleutel}
              type="button"
              role="tab"
              aria-selected={aan}
              onClick={() => setGekozen(m.sleutel)}
              className={`-mb-px border-b-2 px-1 pb-2.5 text-sm transition-colors duration-[var(--duur-snel)] ease-merk ${
                aan ? "border-primary font-medium text-ink" : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {m.naam}
            </button>
          );
        })}
      </div>

      <div className="kaart-omlijst flex items-center justify-between gap-6 rounded-panel border border-line bg-card px-5 py-3.5 shadow-card">
        <div>
          {merk?.peildatum ? (
            <>
              <p className="font-sans-w7 text-sm font-semibold text-ink">
                {merk.naam} ·{" "}
                {merk.peildatum >= `${KPI_JAAR}-12-31`
                  ? `${KPI_JAAR} is voorbij — dit is de definitieve basis voor ${KPI_DOELJAAR}`
                  : `stand t/m ${datumLang(merk.peildatum)}`}
              </p>
              <p className="mt-0.5 text-meta text-ink-muted">
                {merk.berekendOp ? `Bijgewerkt ${momentTekst(merk.berekendOp)}` : ""}
                {merk.volgendeUpdate ? ` · volgende update ${datumLang(merk.volgendeUpdate)}` : ""}
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-muted">
              {bezig
                ? "Laden…"
                : "Er staat voor dit merk nog geen stand klaar. De eerste verschijnt zondag; een beheerder kan hem nu al laten berekenen."}
            </p>
          )}
        </div>
        {data?.magBijwerken && (
          <button
            type="button"
            onClick={werkBij}
            disabled={bijwerken}
            title="Haalt 2026 voor alle social-accounts opnieuw op bij Windsor, t/m de laatste zaterdag — dezelfde stand als de update op zondag."
            className="flex shrink-0 items-center gap-1.5 rounded-control border border-line bg-card px-3 py-1.5 text-sm font-medium text-ink shadow-card transition-colors duration-[var(--duur-snel)] ease-merk hover:bg-surface disabled:cursor-wait disabled:opacity-70"
          >
            <IconRefresh className={`h-3.5 w-3.5 ${bijwerken ? "animate-spin" : ""}`} />
            {bijwerken ? "Bezig… (± 1–2 min)" : "Nu bijwerken"}
          </button>
        )}
      </div>

      {fout && <p className="rounded-panel border border-line bg-card px-4 py-3 text-sm text-negative">{fout}</p>}

      {data?.laatsteFout && (
        <p className="rounded-panel border border-line bg-card px-4 py-3 text-sm text-negative">
          Niet alles kon bij de laatste update worden opgehaald; die accounts houden hun vorige stand. {data.laatsteFout}
        </p>
      )}

      {nietGekoppeld.length > 0 && (
        <p className="flex items-start gap-2 rounded-panel border border-line bg-card px-4 py-3 text-sm text-ink">
          <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
          <span>
            <strong className="font-semibold">{nietGekoppeld.join(", ")}: nog geen cijfers.</strong>{" "}
            {nietGekoppeld.includes("Facebook")
              ? "De Facebook-koppeling in Windsor staat sinds 8 oktober 2026 uit; zodra de pagina's daar opnieuw zijn geselecteerd, haalt de volgende update heel 2026 op. "
              : ""}
            {nietGekoppeld.some((k) => k === "TikTok" || k === "YouTube")
              ? "TikTok en YouTube zijn niet gekoppeld in Windsor. "
              : ""}
            De targets staan er wel, met het percentage van het team.
          </span>
        </p>
      )}

      <Definitie zonderLijn>
        <span>
          <strong className="font-semibold text-ink">Impressies</strong> rekenen precies als op KPI&apos;s Google
          Analytics: wat het platform t/m de peildatum telde, plus het gemiddelde per dag × de resterende dagen van{" "}
          {KPI_JAAR} = de verwachting; het target {KPI_DOELJAAR} is die verwachting plus de groei, het maandtarget het
          jaartarget ÷ 12. <strong className="font-semibold text-ink">Nieuwe volgers</strong> (Instagram en Facebook)
          rekenen net zo, alleen over de gemeten dagen: Instagram bewaart dat cijfer maar dertig dagen, het dashboard
          sinds 16 augustus 2026; de dagen daarvóór zijn met het gemiddelde per gemeten dag bijgeschat.{" "}
          <strong className="font-semibold text-ink">Volgers</strong> (LinkedIn, TikTok, YouTube) zijn een stand:
          de basis is het aantal volgers eind {KPI_JAAR} (de laatste stand plus de trend per dag tot 31 december), het
          target het aantal dat er eind {KPI_DOELJAAR} moet zijn. De groei per KPI is het percentage dat het team voor{" "}
          {KPI_DOELJAAR} vastlegde; klik erop om het aan te passen — dat geldt voor iedereen.{" "}
          <strong className="font-semibold text-ink">Realisatie {KPI_DOELJAAR}</strong> telt vanaf 1 januari{" "}
          {KPI_DOELJAAR}. Alles wordt elke zondag bijgewerkt t/m zaterdag.
        </span>
      </Definitie>

      {merk && (
        <SocialOverzichtTabel merk={merk} opslaanGroei={(kpi, groei) => zetGroei(merk.sleutel, kpi, groei)} />
      )}

      {merk?.kanalen.map((groep) => (
        <section key={groep.kanaal} className="flex flex-col gap-3">
          <h2 className="label-theme text-label text-ink-faint">{KANAAL_NAMEN[groep.kanaal]}</h2>
          <div className="grid grid-cols-2 gap-6 min-[1800px]:grid-cols-3">
            {groep.kpis.map((kpi) => (
              <KpiSocialKaart
                key={kpi.sleutel}
                kpi={kpi}
                opslaanGroei={(groei) => zetGroei(merk.sleutel, kpi.sleutel, groei)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
