"use client";

import { useEffect, useMemo, useState } from "react";
import { Briefing, BriefingZijbalk } from "@/components/marketingAnalyse/Briefing";
import SamenvattingPagina from "@/components/marketingAnalyse/SamenvattingPagina";
import StapNavigatie, { SAMENVATTING, VERANTWOORDING } from "@/components/marketingAnalyse/StapNavigatie";
import StapPagina, { type Buur } from "@/components/marketingAnalyse/StapPagina";
import Verantwoording, { DataCorrectie } from "@/components/marketingAnalyse/Verantwoording";
import VolgersZijbalk from "@/components/marketingAnalyse/VolgersZijbalk";
import { LabelBadge } from "@/components/marketingAnalyse/onderdelen";
import { getBrandLogo } from "@/components/brandLogos";
import { IconMail, IconPencil } from "@/components/icons";
import { bedrijvenLabel, formatWaarde, looptijdLabel, tabbladenVoor, versieLabel } from "@/lib/marketingAnalyse/rekenen";
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

/** De open stap staat in de URL, zodat een link naar één stap te delen is. */
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
 * De analysepagina van één campagne (opzet A, 25 november 2026): links de funnel als vaste
 * navigatie, rechts de open stap. De pagina opent op de samenvatting met de conclusie, de
 * voortgang en wat nu te doen; elke stap heeft dezelfde opbouw (`StapPagina`).
 */
export default function AnalyseWeergave({ campagne, opzet, isEigenaar, onTerug, onBewerk, onCampagneBijgewerkt }: Props) {
  const [versies, setVersies] = useState<MaVersie[] | null>(null);
  const [gekozen, setGekozen] = useState<string | null>(campagne.laatsteAnalyse?.id ?? null);
  const [analyse, setAnalyse] = useState<MaAnalyse | null>(null);
  const [laadt, setLaadt] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [bevestigWeg, setBevestigWeg] = useState(false);
  const [actieveTab, setActieveTab] = useState<string | null>(() => tabUitUrl());
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [volgersOpen, setVolgersOpen] = useState(false);
  const [aantalVolgers, setAantalVolgers] = useState(campagne.aantalVolgers);
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
  // Een stap die in deze versie niet bestaat (andere versie, oude link): de samenvatting.
  const tabIndex = tabs.findIndex((t) => t.sleutel === actieveTab);
  const tab = tabIndex >= 0 ? tabs[tabIndex] : null;
  const actief = actieveTab === VERANTWOORDING ? VERANTWOORDING : tab ? tab.sleutel : SAMENVATTING;

  function kiesTab(sleutel: string) {
    setActieveTab(sleutel);
    zetTabInUrl(sleutel === SAMENVATTING ? null : sleutel);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const vorige: Buur = tabIndex > 0 ? tabs[tabIndex - 1] : { sleutel: SAMENVATTING, naam: "Samenvatting" };
  const volgende: Buur = tabIndex >= 0 && tabIndex < tabs.length - 1 ? tabs[tabIndex + 1] : { sleutel: VERANTWOORDING, naam: "Verantwoording" };
  const b = analyse?.briefing;
  const rapportage = (b?.formulier ?? opzet?.formulier) === "rapportage";
  const regelOnderTitel = [
    campagne.merk,
    bedrijvenLabel(campagne.bedrijven),
    rapportage ? campagne.periodeTekst : looptijdLabel(campagne.startdatum, campagne.einddatum),
    !rapportage && campagne.doel ? `doel ${campagne.doel}` : null,
    !rapportage && campagne.budget != null ? `budget ${formatWaarde(campagne.budget, "euro")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <button
            type="button"
            onClick={() => {
              zetTabInUrl(null);
              onTerug();
            }}
            className="self-start text-sm text-ink-muted transition-colors hover:text-ink"
          >
            ← Alle analyses
          </button>
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            {Logo && <Logo role="img" aria-label={campagne.merk ?? undefined} className="h-6 w-6 shrink-0 text-ink-muted" />}
            <h2 className="truncate font-sans-w7 text-title font-bold text-ink">{campagne.naam}</h2>
            {analyse && <LabelBadge label={analyse.label} />}
            {opzet && !opzet.standaard && <span className="text-sm text-ink-muted">{opzet.naam}</span>}
          </div>
          <p className="text-sm text-ink-muted">{regelOnderTitel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          {analyse && (
            <button
              type="button"
              onClick={() => setBriefingOpen(true)}
              className="rounded-button border border-line bg-card px-3.5 py-1.5 text-sm text-ink transition-colors hover:bg-surface"
            >
              Briefing
            </button>
          )}
          <button
            type="button"
            onClick={() => setVolgersOpen(true)}
            className="flex items-center gap-1.5 rounded-button border border-line bg-card px-3.5 py-1.5 text-sm text-ink transition-colors hover:bg-surface"
          >
            <IconMail className="h-4 w-4 text-ink-muted" />
            Volgers ({aantalVolgers})
          </button>
          <button
            type="button"
            onClick={onBewerk}
            title="Briefing bewerken"
            aria-label="Briefing bewerken"
            className="flex h-8 w-8 items-center justify-center rounded-control text-ink-faint transition-colors hover:bg-surface hover:text-ink"
          >
            <IconPencil className="h-4 w-4" />
          </button>
        </div>
      </header>

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
                Zeg in Claude Code: “maak een marketing analyse van {campagne.naam}”, of zet de planning in het overzicht op Wekelijks,
                Maandelijks of Per kwartaal en zeg op vrijdag “voer de analyseronde uit”. Claude haalt de briefing, de prompt van {opzet?.naam ?? "de opzet"} en de semantic layer op en zet het
                resultaat hier neer.
              </p>
            )}
          </section>
          <DataCorrectie campagne={campagne} bijVersie={campagne.dataCorrectie} onOpgeslagen={onCampagneBijgewerkt} />
        </>
      )}

      {analyse && r && (
        <div className={`grid grid-cols-[272px_minmax(0,1fr)] items-start gap-6 transition-opacity ${laadt ? "opacity-60" : ""}`}>
          <StapNavigatie tabs={tabs} actief={actief} onKies={kiesTab} />
          <div className="flex min-w-0 flex-col gap-5">
            {actief === SAMENVATTING && <SamenvattingPagina key={analyse.id} analyse={analyse} resultaat={r} tabs={tabs} onKies={kiesTab} />}
            {tab && (
              <StapPagina
                key={`${analyse.id}-${tab.sleutel}`}
                tab={tab}
                nr={tabIndex + 1}
                aantal={tabs.length}
                formaat={r.formaat}
                vorige={vorige}
                volgende={volgende}
                onKies={kiesTab}
              />
            )}
            {actief === VERANTWOORDING && (
              <Verantwoording
                resultaat={r}
                campagne={campagne}
                dataCorrectieBijVersie={analyse.briefing.dataCorrectie}
                isEigenaar={isEigenaar}
                onCampagneBijgewerkt={onCampagneBijgewerkt}
                versieId={analyse.id}
              />
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-meta text-ink-faint">
                Geanalyseerd op{" "}
                {new Intl.DateTimeFormat("nl-NL", { dateStyle: "long", timeStyle: "short" }).format(new Date(analyse.geanalyseerdOp))}
                {analyse.briefing.periodeTekst
                  ? ` · periode “${analyse.briefing.periodeTekst}”${analyse.periodeVan ? ` → ${looptijdLabel(analyse.periodeVan, analyse.periodeTot)}` : ""}`
                  : analyse.periodeVan && ` · periode ${looptijdLabel(analyse.periodeVan, analyse.periodeTot)}`}
                {` · prompt ${analyse.promptVersie ? `v${analyse.promptVersie}` : "standaard"}`}
                {` · semantic layer ${analyse.semantiekVersie ? `v${analyse.semantiekVersie}` : "standaard"}`}
              </p>
              {isEigenaar && (
                <button type="button" onClick={verwijderVersie} className="text-meta text-negative underline-offset-2 hover:underline">
                  {bevestigWeg ? `Versie ${analyse.versie} echt verwijderen?` : "Versie verwijderen"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!analyse && laadt && <p className="text-sm text-ink-muted">Analyse laden…</p>}

      {briefingOpen && analyse && (
        <BriefingZijbalk
          analyse={analyse}
          onSluit={() => setBriefingOpen(false)}
          onBewerk={() => {
            setBriefingOpen(false);
            onBewerk();
          }}
        />
      )}
      {volgersOpen && (
        <VolgersZijbalk campagneId={campagne.id} naam={campagne.naam} onAantal={setAantalVolgers} onClose={() => setVolgersOpen(false)} />
      )}
    </div>
  );
}
