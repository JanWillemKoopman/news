"use client";

import { useEffect, useMemo, useState } from "react";
import { AnalyseTabbalk, TabbladInhoud, VERANTWOORDING } from "@/components/marketingAnalyse/AnalyseTabbladen";
import SamenvattingBlok, { Briefing } from "@/components/marketingAnalyse/SamenvattingBlok";
import Verantwoording, { DataCorrectie } from "@/components/marketingAnalyse/Verantwoording";
import { LabelBadge } from "@/components/marketingAnalyse/onderdelen";
import { getBrandLogo } from "@/components/brandLogos";
import { IconPencil } from "@/components/icons";
import { actiesUitTabbladen, bedrijvenLabel, looptijdLabel, tabbladenVoor, versieLabel } from "@/lib/marketingAnalyse/rekenen";
import { LABEL_NAAM, type MaAnalyse, type MaCampagne, type MaOpzet, type MaOverzichtRegel, type MaVersie } from "@/lib/marketingAnalyse/types";

export { DoelRegel, LabelBadge } from "@/components/marketingAnalyse/onderdelen";

type Props = {
  campagne: MaOverzichtRegel;
  /** De analyse opzet van deze campagne (null zolang de opzetten laden). */
  opzet: MaOpzet | null;
  isEigenaar: boolean;
  onTerug: () => void;
  onBewerk: () => void;
  onCampagneBijgewerkt: (c: MaCampagne) => void;
};

/** Het open tabblad staat in de URL, zodat een link naar één tabblad te delen is. */
const TAB_PARAM = "mtab";

function tabUitUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(TAB_PARAM);
}

function zetTabInUrl(sleutel: string | null) {
  const params = new URLSearchParams(window.location.search);
  if (sleutel) params.set(TAB_PARAM, sleutel);
  else params.delete(TAB_PARAM);
  const zoek = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${zoek ? `?${zoek}` : ""}`);
}

/**
 * De analysepagina van één campagne: kies een versie, lees bovenaan de samenvatting met de
 * acties, en daaronder de analyse in tabbladen in funnelvolgorde.
 */
export default function AnalyseWeergave({ campagne, opzet, isEigenaar, onTerug, onBewerk, onCampagneBijgewerkt }: Props) {
  const [versies, setVersies] = useState<MaVersie[] | null>(null);
  const [gekozen, setGekozen] = useState<string | null>(campagne.laatsteAnalyse?.id ?? null);
  const [analyse, setAnalyse] = useState<MaAnalyse | null>(null);
  const [laadt, setLaadt] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [bevestigWeg, setBevestigWeg] = useState(false);
  const [actieveTab, setActieveTab] = useState<string | null>(() => tabUitUrl());
  const Logo = campagne.merk ? getBrandLogo(campagne.merk) : null;

  useEffect(() => {
    let actief = true;
    fetch(`/api/marketing-analyse/analyse?campagne=${encodeURIComponent(campagne.id)}`)
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { versies?: MaVersie[]; fout?: string };
        if (!res.ok) throw new Error(data.fout ?? "Kon de versies niet laden.");
        if (!actief) return;
        setVersies(data.versies ?? []);
        setGekozen((huidig) => (huidig && data.versies?.some((v) => v.id === huidig) ? huidig : (data.versies?.[0]?.id ?? null)));
      })
      .catch((err) => actief && setFout(err instanceof Error ? err.message : String(err)));
    return () => {
      actief = false;
    };
  }, [campagne.id]);

  useEffect(() => {
    if (!gekozen) {
      setAnalyse(null);
      return;
    }
    let actief = true;
    setLaadt(true);
    setFout(null);
    setBevestigWeg(false);
    fetch(`/api/marketing-analyse/analyse?id=${encodeURIComponent(gekozen)}`)
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { analyse?: MaAnalyse; fout?: string };
        if (!res.ok || !data.analyse) throw new Error(data.fout ?? "Kon de analyse niet laden.");
        if (actief) setAnalyse(data.analyse);
      })
      .catch((err) => actief && setFout(err instanceof Error ? err.message : String(err)))
      .finally(() => actief && setLaadt(false));
    return () => {
      actief = false;
    };
  }, [gekozen]);

  async function verwijderVersie() {
    if (!analyse) return;
    if (!bevestigWeg) return setBevestigWeg(true);
    const res = await fetch(`/api/marketing-analyse/analyse?id=${encodeURIComponent(analyse.id)}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { fout?: string };
    if (!res.ok) return setFout(data.fout ?? "Kon de versie niet verwijderen.");
    const rest = (versies ?? []).filter((v) => v.id !== analyse.id);
    setVersies(rest);
    setGekozen(rest[0]?.id ?? null);
  }

  const r = analyse?.resultaat;
  const tabs = useMemo(
    () =>
      r && analyse
        ? tabbladenVoor(r, {
            rapportage: analyse.briefing.formulier === "rapportage",
            bedrijven: analyse.briefing.bedrijven ?? (analyse.briefing.bedrijf ? [analyse.briefing.bedrijf] : []),
          })
        : [],
    [r, analyse],
  );
  const tabActies = useMemo(() => actiesUitTabbladen(tabs), [tabs]);
  // Een tabblad dat in deze versie niet bestaat (andere versie, oude link): het eerste met inhoud.
  const tab =
    actieveTab === VERANTWOORDING
      ? null
      : (tabs.find((t) => t.sleutel === actieveTab) ?? tabs.find((t) => !t.leeg) ?? tabs[0] ?? null);
  const toontVerantwoording = actieveTab === VERANTWOORDING || (!!analyse && tabs.length === 0);

  function kiesTab(sleutel: string) {
    setActieveTab(sleutel);
    zetTabInUrl(sleutel);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => {
              zetTabInUrl(null);
              onTerug();
            }}
            className="rounded-button border border-line bg-card px-3 py-1.5 text-sm text-ink-muted transition-colors duration-[var(--duur-snel)] hover:bg-surface hover:text-ink"
          >
            ← Alle campagnes
          </button>
          {Logo && <Logo role="img" aria-label={campagne.merk ?? undefined} className="h-5 w-5 shrink-0 text-ink-muted" />}
          <h2 className="truncate font-sans-w7 text-lg font-bold text-ink">{campagne.naam}</h2>
          <span className="whitespace-nowrap text-sm text-ink-muted">
            {opzet && !opzet.standaard ? `${opzet.naam} · ` : ""}
            {bedrijvenLabel(campagne.bedrijven)}
          </span>
          <button
            type="button"
            onClick={onBewerk}
            title="Briefing bewerken"
            aria-label="Briefing bewerken"
            className="flex h-7 w-7 items-center justify-center rounded-control text-ink-faint transition-colors hover:bg-surface hover:text-ink"
          >
            <IconPencil className="h-4 w-4" />
          </button>
        </div>
        {versies && versies.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            Versie
            <select
              value={gekozen ?? ""}
              onChange={(e) => setGekozen(e.target.value)}
              className="rounded-button border border-line bg-card px-3 py-1.5 text-sm text-ink focus:border-primary focus:outline-none"
            >
              {versies.map((v, i) => (
                <option key={v.id} value={v.id}>
                  {versieLabel(v.versie, v.geanalyseerdOp)}
                  {v.label ? ` · ${LABEL_NAAM[v.label]}` : ""}
                  {i === 0 ? " (nieuwste)" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {fout && <p className="text-sm text-negative">{fout}</p>}

      {versies && versies.length === 0 && (
        <>
          <Briefing b={campagne} titel="Briefing" opzet={opzet?.naam} rapportage={opzet?.formulier === "rapportage"} />
          <section className="rounded-panel border border-dashed border-line bg-card px-6 py-8 text-center">
            <p className="font-semibold text-ink">Nog geen analyse</p>
            {opzet && !opzet.heeftPrompt ? (
              <p className="mx-auto mt-1 max-w-xl text-sm text-ink-muted">
                Er is nog geen prompt voor <span className="font-medium text-ink">{opzet.naam}</span>. Zolang die leeg is, weigert Claude
                de analyse. {isEigenaar ? "Schrijf hem via de knop Analyse prompts rechtsboven." : "De eigenaar schrijft hem via Analyse prompts."}
              </p>
            ) : (
              <p className="mx-auto mt-1 max-w-xl text-sm text-ink-muted">
                Zeg in Claude Code: “maak een marketing analyse van {campagne.naam}”, of zet de Analyse ronde aan en zeg “voer de
                analyseronde uit”. Claude haalt de briefing, de prompt van {opzet?.naam ?? "de opzet"} en de semantic layer op en zet het
                resultaat hier neer.
              </p>
            )}
          </section>
          <DataCorrectie campagne={campagne} bijVersie={campagne.dataCorrectie} onOpgeslagen={onCampagneBijgewerkt} />
        </>
      )}

      {analyse && r && (
        <div className={`flex flex-col gap-5 transition-opacity ${laadt ? "opacity-60" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex flex-wrap items-center gap-2 text-meta text-ink-faint">
              <LabelBadge label={analyse.label} />
              <span>
                Geanalyseerd op{" "}
                {new Intl.DateTimeFormat("nl-NL", { dateStyle: "long", timeStyle: "short" }).format(new Date(analyse.geanalyseerdOp))}
                {analyse.briefing.periodeTekst
                  ? ` · periode “${analyse.briefing.periodeTekst}”${analyse.periodeVan ? ` → ${looptijdLabel(analyse.periodeVan, analyse.periodeTot)}` : ""}`
                  : analyse.periodeVan && ` · periode ${looptijdLabel(analyse.periodeVan, analyse.periodeTot)}`}
                {` · prompt ${analyse.promptVersie ? `v${analyse.promptVersie}` : "standaard"}`}
                {` · semantic layer ${analyse.semantiekVersie ? `v${analyse.semantiekVersie}` : "standaard"}`}
              </span>
            </p>
            {isEigenaar && (
              <button type="button" onClick={verwijderVersie} className="text-meta text-negative underline-offset-2 hover:underline">
                {bevestigWeg ? `Versie ${analyse.versie} echt verwijderen?` : "Versie verwijderen"}
              </button>
            )}
          </div>

          <SamenvattingBlok analyse={analyse} resultaat={r} tabs={tabs} tabActies={tabActies} onKiesTab={kiesTab} />

          <div className="flex flex-col gap-5">
            <AnalyseTabbalk tabs={tabs} actief={toontVerantwoording ? VERANTWOORDING : (tab?.sleutel ?? "")} onKies={kiesTab} />
            {toontVerantwoording ? (
              <Verantwoording
                resultaat={r}
                campagne={campagne}
                dataCorrectieBijVersie={analyse.briefing.dataCorrectie}
                isEigenaar={isEigenaar}
                onCampagneBijgewerkt={onCampagneBijgewerkt}
                versieId={analyse.id}
              />
            ) : (
              tab && <TabbladInhoud key={tab.sleutel} tab={tab} formaat={r.formaat} />
            )}
          </div>
        </div>
      )}

      {!analyse && laadt && <p className="text-sm text-ink-muted">Analyse laden…</p>}
    </div>
  );
}
