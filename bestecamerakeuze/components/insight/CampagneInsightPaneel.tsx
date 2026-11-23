"use client";

import { useCallback, useEffect, useState } from "react";
import Inlogprompt from "@/components/Inlogprompt";
import ProgressBar from "@/components/ProgressBar";
import AnalyseWeergave from "@/components/insight/AnalyseWeergave";
import CampagneZijbalk from "@/components/insight/CampagneZijbalk";
import HoofdpromptZijbalk from "@/components/insight/HoofdpromptZijbalk";
import { getBrandLogo } from "@/components/brandLogos";
import { IconBrain, IconPencil, IconPlus } from "@/components/icons";
import { doelVoortgang, formatWaarde, looptijdLabel, versieLabel } from "@/lib/insight/rekenen";
import type { InsightCampagne, InsightKerncijfers, InsightOverzichtRegel } from "@/lib/insight/types";

/** De funnelcijfers in het overzicht, in funnelvolgorde. */
const KOLOMMEN: { sleutel: keyof InsightKerncijfers; label: string; eenheid: "euro" | "aantal"; titel: string }[] = [
  { sleutel: "kosten", label: "Kosten", eenheid: "euro", titel: "Advertentie-uitgaven over alle platforms" },
  { sleutel: "vertoningen", label: "Vertoningen", eenheid: "aantal", titel: "Vertoningen betaald en organisch" },
  { sleutel: "klikken", label: "Klikken", eenheid: "aantal", titel: "Klikken op advertenties" },
  { sleutel: "sessies", label: "Sessies", eenheid: "aantal", titel: "Sessies die op de campagnepagina('s) begonnen (GA4)" },
  { sleutel: "leadsOnline", label: "Leads web", eenheid: "aantal", titel: "Lead-events op de website die bij de campagne horen (GA4)" },
  { sleutel: "leadsSyntec", label: "Leads Syntec", eenheid: "aantal", titel: "Leads in Syntec voor het merk en model in de periode" },
];

const URL_PARAM = "insight";

function zetUrl(id: string | null) {
  const params = new URLSearchParams(window.location.search);
  if (id) params.set(URL_PARAM, id);
  else params.delete(URL_PARAM);
  const zoek = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${zoek ? `?${zoek}` : ""}`);
}

function Status({ c }: { c: InsightOverzichtRegel }) {
  if (c.laatsteAnalyse) {
    return (
      <div>
        <p className="whitespace-nowrap text-ink">{versieLabel(c.laatsteAnalyse.versie, c.laatsteAnalyse.geanalyseerdOp)}</p>
        <p className="text-meta text-ink-faint">
          {c.analyseGevraagdOp ? "Nieuwe analyse aangevraagd" : c.aantalAnalyses === 1 ? "1 analyse" : `${c.aantalAnalyses} analyses`}
        </p>
      </div>
    );
  }
  return <p className="text-ink-muted">{c.analyseGevraagdOp ? "Aangevraagd" : "Nog niet geanalyseerd"}</p>;
}

/**
 * Campagnes → Campaign insight.
 *
 * Bovenaan het overzicht: elke campagne één regel, met de funnelcijfers uit zijn laatste
 * analyse. Een klik op een regel opent de analysepagina (met alle versies). Rechtsboven de
 * hoofdprompt en "Nieuwe campagne"; het potlood per regel opent de briefing in de zijbalk.
 *
 * De analyses maakt Claude Code (skill `campagne-insight`), niet deze pagina: hier vul je
 * de briefing in en lees je het resultaat.
 */
export default function CampagneInsightPaneel({ ingelogd }: { ingelogd: boolean }) {
  const [campagnes, setCampagnes] = useState<InsightOverzichtRegel[] | null>(null);
  const [magVerwijderen, setMagVerwijderen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [zijbalk, setZijbalk] = useState<{ campagne: InsightCampagne | null } | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);

  const laad = useCallback(() => {
    fetch("/api/campagne-insight")
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          campagnes?: InsightOverzichtRegel[];
          magVerwijderen?: boolean;
          fout?: string;
        };
        if (!res.ok) throw new Error(data.fout ?? "Kon de campagnes niet laden.");
        setCampagnes(data.campagnes ?? []);
        setMagVerwijderen(Boolean(data.magVerwijderen));
        setFout(null);
      })
      .catch((err) => setFout(err instanceof Error ? err.message : String(err)));
  }, []);

  useEffect(() => {
    if (!ingelogd) return;
    laad();
    // Een link met ?insight=<id> opent meteen die analyse.
    const gevraagd = new URLSearchParams(window.location.search).get(URL_PARAM);
    if (gevraagd) setOpenId(gevraagd);
  }, [ingelogd, laad]);

  function open(id: string | null) {
    setOpenId(id);
    zetUrl(id);
    window.scrollTo({ top: 0 });
  }

  function opgeslagen(c: InsightCampagne) {
    setCampagnes((lijst) => {
      if (!lijst) return lijst;
      const bestaand = lijst.find((x) => x.id === c.id);
      if (bestaand) return lijst.map((x) => (x.id === c.id ? { ...x, ...c } : x));
      return [{ ...c, laatsteAnalyse: null, aantalAnalyses: 0 }, ...lijst];
    });
  }

  function verwijderd(id: string) {
    setCampagnes((lijst) => lijst?.filter((x) => x.id !== id) ?? lijst);
    if (openId === id) open(null);
  }

  if (!ingelogd) return <Inlogprompt tekst="Log in om de campagne-analyses te bekijken." />;

  const geopend = campagnes?.find((c) => c.id === openId) ?? null;

  const knoppen = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setPromptOpen(true)}
        className="flex items-center gap-2 rounded-button border border-line bg-card px-4 py-2 text-sm font-medium text-ink transition-colors duration-[var(--duur-snel)] hover:bg-surface"
      >
        <IconBrain className="h-4 w-4 text-ink-muted" />
        Hoofdprompt
      </button>
      {!geopend && (
        <button
          type="button"
          onClick={() => setZijbalk({ campagne: null })}
          className="flex items-center gap-2 rounded-button bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors duration-[var(--duur-snel)] hover:bg-primary-dark"
        >
          <IconPlus className="h-4 w-4" />
          Nieuwe campagne
        </button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {geopend ? (
        <>
          <div className="flex justify-end">{knoppen}</div>
          <AnalyseWeergave
            key={geopend.id}
            campagne={geopend}
            onTerug={() => {
              open(null);
              laad();
            }}
            onBewerk={() => setZijbalk({ campagne: geopend })}
          />
        </>
      ) : (
        <section className="kaart-accent overflow-hidden rounded-panel border border-line bg-card shadow-card">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-6 py-4">
            <div>
              <h2 className="label-theme text-label text-ink-muted">Geanalyseerde campagnes</h2>
              <p className="mt-0.5 text-meta text-ink-faint">Cijfers uit de laatste analyse van elke campagne. Klik op een campagne voor de volledige analyse.</p>
            </div>
            {knoppen}
          </header>

          {fout ? (
            <p className="px-6 py-5 text-sm text-negative">{fout}</p>
          ) : !campagnes ? (
            <p className="px-6 py-5 text-sm text-ink-muted">Laden…</p>
          ) : campagnes.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="font-semibold text-ink">Nog geen campagnes</p>
              <p className="mx-auto mt-1 max-w-lg text-sm text-ink-muted">
                Maak een campagne aan met naam, looptijd, doel en budget. Zeg daarna in Claude Code dat hij de analyse moet maken; het
                resultaat verschijnt hier.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="text-left text-label text-ink-faint">
                    <th className="label-theme px-6 py-2.5 font-normal">Campagne</th>
                    <th className="label-theme px-3 py-2.5 font-normal">Doel</th>
                    <th className="label-theme px-3 py-2.5 font-normal">Analyse</th>
                    {KOLOMMEN.map((k) => (
                      <th key={k.sleutel} title={k.titel} className="label-theme whitespace-nowrap px-3 py-2.5 text-right font-normal">
                        {k.label}
                      </th>
                    ))}
                    <th className="label-theme px-3 py-2.5 font-normal">Voortgang doel</th>
                    <th className="w-12 px-4 py-2.5">
                      <span className="sr-only">Briefing bewerken</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {campagnes.map((c) => {
                    const Logo = c.merk ? getBrandLogo(c.merk) : null;
                    const k = c.laatsteAnalyse?.kerncijfers;
                    const voortgang = doelVoortgang(k);
                    return (
                      <tr
                        key={c.id}
                        onClick={() => open(c.id)}
                        className="cursor-pointer align-top transition-colors duration-[var(--duur-snel)] hover:bg-surface [&>td]:border-t [&>td]:border-line-soft"
                      >
                        <td className="max-w-[260px] px-6 py-3">
                          <div className="flex items-center gap-2">
                            {Logo && <Logo role="img" aria-label={c.merk ?? undefined} className="h-4 w-4 shrink-0 text-ink-muted" />}
                            <p className="truncate font-semibold text-ink" title={c.naam}>
                              {c.naam}
                            </p>
                          </div>
                          <p className="mt-0.5 text-meta text-ink-faint">
                            {looptijdLabel(c.startdatum, c.einddatum)}
                            {c.budget != null && ` · budget ${formatWaarde(c.budget, "euro")}`}
                          </p>
                        </td>
                        <td className="max-w-[200px] px-3 py-3 text-ink-muted">
                          <p className="line-clamp-2">{c.doel || "—"}</p>
                        </td>
                        <td className="px-3 py-3">
                          <Status c={c} />
                        </td>
                        {KOLOMMEN.map((kol) => (
                          <td key={kol.sleutel} className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-ink">
                            {formatWaarde((k?.[kol.sleutel] as number | null | undefined) ?? null, kol.eenheid)}
                          </td>
                        ))}
                        <td className="min-w-[140px] px-3 py-3">
                          {voortgang === null ? (
                            <span className="text-ink-faint">—</span>
                          ) : (
                            <div>
                              <p className="tabular-nums text-ink">
                                {formatWaarde(k?.doelRealisatie ?? null)} / {formatWaarde(k?.doelWaarde ?? null)}
                                {k?.doelEenheid ? <span className="text-ink-muted"> {k.doelEenheid}</span> : null}
                              </p>
                              <ProgressBar percent={voortgang} className="mt-1.5 h-1 max-w-32" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setZijbalk({ campagne: c });
                            }}
                            title="Briefing bewerken"
                            aria-label={`Briefing van ${c.naam} bewerken`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-control text-ink-faint transition-colors hover:bg-card hover:text-ink"
                          >
                            <IconPencil className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {zijbalk && (
        <CampagneZijbalk
          campagne={zijbalk.campagne}
          magVerwijderen={magVerwijderen}
          onClose={() => setZijbalk(null)}
          onOpgeslagen={opgeslagen}
          onVerwijderd={verwijderd}
        />
      )}
      {promptOpen && <HoofdpromptZijbalk onClose={() => setPromptOpen(false)} />}
    </div>
  );
}
