"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Briefing, BriefingZijbalk } from "@/components/marketingAnalyse/Briefing";
import SamenvattingPagina from "@/components/marketingAnalyse/SamenvattingPagina";
import StapNavigatie, { SAMENVATTING, StapChips, VERANTWOORDING } from "@/components/marketingAnalyse/StapNavigatie";
import StapPagina, { type Buur } from "@/components/marketingAnalyse/StapPagina";
import MaandrapportWeergave from "@/components/marketingAnalyse/MaandrapportWeergave";
import Verantwoording, { DataCorrectie } from "@/components/marketingAnalyse/Verantwoording";
import VolgersZijbalk from "@/components/marketingAnalyse/VolgersZijbalk";
import { LabelBadge } from "@/components/marketingAnalyse/onderdelen";
import Knoppenbalk from "@/components/marketingAnalyse/werkruimte/Knoppenbalk";
import { MenuKop, MenuRegel, MenuScheiding, PopoverKnop, Segmenten } from "@/components/marketingAnalyse/werkruimte/Bediening";
import { AnalyseKpis, TrendDuo, VergelijkingNoot, type Vergelijking, type VorigeVersie } from "@/components/marketingAnalyse/werkruimte/AnalyseKern";
import { STAPPEN_PLEK_ID } from "@/components/marketingAnalyse/werkruimte/WerkruimteContext";
import { getBrandLogo } from "@/components/brandLogos";
import { IconCalendar, IconChevronDown, IconChevronLeft, IconMail, IconNotes, IconPencil } from "@/components/icons";
import { bedrijvenLabel, datumKort, formatWaarde, looptijdLabel, tabbladenVoor } from "@/lib/marketingAnalyse/rekenen";
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
  /** Het menu Meer (e-mail, prompts, semantic layer), rechts in de knoppenbalk. */
  acties?: ReactNode;
};

/** De open stap staat in de URL, zodat een link naar één stap te delen is. */
const TAB_PARAM = "mtab";
/** De vergelijking ook: "vorige" = tegen de vorige versie, leeg = tegen de looptijd. */
const VGL_PARAM = "vgl";

function uitUrl(param: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(param);
}

function zetInUrl(param: string, waarde: string | null) {
  const params = new URLSearchParams(window.location.search);
  if (waarde) params.set(param, waarde);
  else params.delete(param);
  const zoek = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${zoek ? `?${zoek}` : ""}`);
}

const tijd = (op: string) => new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(op));

/**
 * De analysepagina van één campagne (redesign november 2026). De knoppenbalk zegt welke campagne
 * en welke periode (versie) je ziet en waarmee vergeleken wordt; de stappen van de funnel staan als
 * geneste lijst in de zijbalk (één navigatiekolom), op een smal scherm als schuifbare rij. De
 * samenvatting begint met de kerncijfers en de ontwikkeling per week.
 *
 * Snel wisselen van versie: de knop toont meteen de nieuwe keuze met "laden", de cijfers eronder
 * blijven gedimd staan met de vermelding van welke versie ze zijn, tot de nieuwe binnen is. Een
 * antwoord van een eerdere keuze wordt weggegooid: de laatste keuze bepaalt wat je ziet.
 */
export default function AnalyseWeergave({ campagne, opzet, isEigenaar, onTerug, onBewerk, onCampagneBijgewerkt, acties }: Props) {
  const [versies, setVersies] = useState<MaVersie[] | null>(null);
  const [gekozen, setGekozen] = useState<string | null>(campagne.laatsteAnalyse?.id ?? null);
  const [analyse, setAnalyse] = useState<MaAnalyse | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [bevestigWeg, setBevestigWeg] = useState(false);
  const [actieveTab, setActieveTab] = useState<string | null>(() => uitUrl(TAB_PARAM));
  const [vergelijking, setVergelijking] = useState<Vergelijking>(() => (uitUrl(VGL_PARAM) === "vorige" ? "vorige" : "looptijd"));
  const [vorigeCache, setVorigeCache] = useState<Map<string, VorigeVersie>>(new Map());
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [volgersOpen, setVolgersOpen] = useState(false);
  const [aantalVolgers, setAantalVolgers] = useState(campagne.aantalVolgers);
  const [stappenPlek, setStappenPlek] = useState<HTMLElement | null>(null);
  const Logo = campagne.merk ? getBrandLogo(campagne.merk) : null;

  useEffect(() => {
    setStappenPlek(document.getElementById(STAPPEN_PLEK_ID));
  }, []);

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
    setFout(null);
    setBevestigWeg(false);
    fetch(`/api/marketing-analyse/analyse?id=${encodeURIComponent(gekozen)}`)
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { analyse?: MaAnalyse; fout?: string };
        if (!res.ok || !data.analyse) throw new Error(data.fout ?? "Kon de analyse niet laden.");
        if (actief) setAnalyse(data.analyse);
      })
      .catch((err) => actief && setFout(err instanceof Error ? err.message : String(err)));
    return () => {
      actief = false;
    };
  }, [gekozen]);

  // De versie vóór de gekozen: alleen ophalen als er tegen de vorige versie vergeleken wordt.
  const gekozenIndex = versies?.findIndex((v) => v.id === gekozen) ?? -1;
  const vorigeMeta = versies && gekozenIndex >= 0 ? (versies[gekozenIndex + 1] ?? null) : null;
  useEffect(() => {
    if (vergelijking !== "vorige" || !vorigeMeta || vorigeCache.has(vorigeMeta.id)) return;
    let actief = true;
    fetch(`/api/marketing-analyse/analyse?id=${encodeURIComponent(vorigeMeta.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { analyse?: MaAnalyse } | null) => {
        const a = data?.analyse;
        if (!actief || !a) return;
        setVorigeCache((m) =>
          new Map(m).set(a.id, {
            versie: a.versie,
            periodeTot: a.periodeTot,
            geanalyseerdOp: a.geanalyseerdOp,
            semantiekVersie: a.semantiekVersie,
            promptVersie: a.promptVersie,
            kerncijfers: a.kerncijfers,
          }),
        );
      })
      .catch(() => {});
    return () => {
      actief = false;
    };
  }, [vergelijking, vorigeMeta, vorigeCache]);

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
    zetInUrl(TAB_PARAM, sleutel === SAMENVATTING ? null : sleutel);
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  function kiesVergelijking(v: Vergelijking) {
    setVergelijking(v);
    zetInUrl(VGL_PARAM, v === "vorige" ? "vorige" : null);
  }

  const vorige: Buur = tabIndex > 0 ? tabs[tabIndex - 1] : { sleutel: SAMENVATTING, naam: "Samenvatting" };
  const volgende: Buur = tabIndex >= 0 && tabIndex < tabs.length - 1 ? tabs[tabIndex + 1] : { sleutel: VERANTWOORDING, naam: "Verantwoording" };
  const rapportage = (analyse?.briefing.formulier ?? opzet?.formulier) === "rapportage";
  // Laadt er een andere versie dan je ziet? Dan horen de cijfers nog bij de vorige keuze.
  const laadt = Boolean(gekozen) && analyse?.id !== gekozen;
  const gekozenMeta = versies?.find((v) => v.id === gekozen) ?? null;
  const getoondMeta = versies?.find((v) => v.id === analyse?.id) ?? null;
  const vorigeVersie = vorigeMeta ? (vorigeCache.get(vorigeMeta.id) ?? null) : null;
  const periodeLabel = (v: MaVersie | null) =>
    v ? `${v.periodeTot ? `t/m ${datumKort(v.periodeTot).replace(/ \d{4}$/, "")}` : datumKort(v.geanalyseerdOp)} · v${v.versie}` : "Versie";

  const feiten = [
    campagne.merk,
    bedrijvenLabel(campagne.bedrijven),
    rapportage ? campagne.periodeTekst : looptijdLabel(campagne.startdatum, campagne.einddatum),
    !rapportage && campagne.doel ? `Doel: ${campagne.doel.length > 60 ? `${campagne.doel.slice(0, 58)}…` : campagne.doel}` : null,
    !rapportage && campagne.budget != null ? `Budget ${formatWaarde(campagne.budget, "euro")}` : null,
  ].filter(Boolean);

  const periodeKiezer = versies && versies.length > 0 && (
    <PopoverKnop
      label="Periode en vergelijking"
      titel="Kies een versie (periode) en waarmee je vergelijkt"
      breedte={380}
      className="ma-groep"
      inhoud={
        <>
          <IconCalendar />
          <span className="ma-getal">{periodeLabel(gekozenMeta)}</span>
          {laadt && <span className="text-[11.5px] font-normal text-ink-faint">laden…</span>}
          <span className="hidden text-ink-faint min-[1440px]:inline">·</span>
          <span className="hidden font-normal text-ink-muted min-[1440px]:inline">{vergelijking === "vorige" ? "tegen vorige versie" : "tegen looptijd"}</span>
          <IconChevronDown className="!h-3.5 !w-3.5 text-ink-faint" />
        </>
      }
    >
      {(sluit) => (
        <div className="p-1">
          <MenuKop>Versie en periode</MenuKop>
          <div role="menu" aria-label="Versies">
            {versies.map((v, i) => (
              <MenuRegel
                key={v.id}
                rol="menuitemradio"
                gekozen={v.id === gekozen}
                onClick={() => {
                  setGekozen(v.id);
                  sluit();
                }}
                rechts={i === 0 ? "nieuwste" : undefined}
              >
                <span className="flex flex-col">
                  <span>
                    v{v.versie} · {v.periodeVan ? looptijdLabel(v.periodeVan, v.periodeTot) : datumKort(v.geanalyseerdOp)}
                  </span>
                  <span className="text-[11.5px] font-normal text-ink-faint">
                    gemaakt {tijd(v.geanalyseerdOp)}
                    {v.label ? ` · ${LABEL_NAAM[v.label]}` : ""}
                  </span>
                </span>
              </MenuRegel>
            ))}
          </div>
          {!rapportage && (
            <>
              <MenuScheiding />
              <MenuKop>Vergelijk met</MenuKop>
              <div className="px-1.5 pb-1.5">
                <Segmenten<Vergelijking>
                  label="Vergelijk met"
                  waarde={vergelijking}
                  onKies={kiesVergelijking}
                  opties={[
                    { id: "looptijd", naam: "Tempo van de looptijd" },
                    { id: "vorige", naam: vorigeMeta ? `Vorige versie (v${vorigeMeta.versie})` : "Vorige versie", uit: !vorigeMeta },
                  ]}
                />
                <p className="mt-2 px-1 text-[11.5px] leading-snug text-ink-faint">
                  {vergelijking === "vorige"
                    ? vorigeMeta
                      ? `v${vorigeMeta.versie}: ${vorigeMeta.periodeVan ? looptijdLabel(vorigeMeta.periodeVan, vorigeMeta.periodeTot) : datumKort(vorigeMeta.geanalyseerdOp)}, gemaakt ${tijd(vorigeMeta.geanalyseerdOp)}. Het verschil is wat er tussen de twee standen bij kwam.`
                      : "Dit is de eerste versie: er is niets om tegen te vergelijken."
                    : "Budget en leaddoel × het verstreken deel van de looptijd op de laatste dag van de periode (de streep in elke balk)."}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </PopoverKnop>
  );

  const stappenNav = analyse && r && r.formaat !== 4 && stappenPlek && createPortal(<StapNavigatie tabs={tabs} actief={actief} onKies={kiesTab} naam={campagne.naam} />, stappenPlek);

  return (
    <>
      <Knoppenbalk
        voor={
          <button type="button" onClick={() => (zetInUrl(TAB_PARAM, null), zetInUrl(VGL_PARAM, null), onTerug())} className="ma-knop -ml-0.5 px-1.5 text-ink-muted hover:text-ink" title="Terug naar alle analyses" aria-label="Terug naar alle analyses">
            <IconChevronLeft />
            <span className="hidden text-[13px] sm:inline">Analyses</span>
          </button>
        }
        titel={
          <span className="flex min-w-0 items-center gap-2">
            {Logo && <Logo role="img" aria-label={campagne.merk ?? undefined} className="hidden h-4 w-4 shrink-0 text-ink-muted sm:block" />}
            <span className="truncate">{campagne.naam}</span>
            {analyse && <span className="hidden shrink-0 md:inline"><LabelBadge label={analyse.label} /></span>}
          </span>
        }
        ondertitel={feiten.join(" · ")}
        selectie={periodeKiezer}
        acties={
          <>
            {analyse && (
              <button type="button" onClick={() => setBriefingOpen(true)} className="ma-knop max-sm:hidden" title="Briefing van deze versie">
                <IconNotes />
                <span className="hidden min-[1440px]:inline">Briefing</span>
              </button>
            )}
            <button type="button" onClick={() => setVolgersOpen(true)} className="ma-knop" title="Wie een mail krijgt bij een nieuwe versie">
              <IconMail />
              <span className="hidden min-[1440px]:inline">Volgers</span>
              <span className="ma-getal text-ink-faint">{aantalVolgers}</span>
            </button>
            <button type="button" onClick={onBewerk} title="Briefing bewerken" aria-label="Briefing bewerken" className="ma-knop px-2 max-sm:hidden">
              <IconPencil />
            </button>
            {acties}
          </>
        }
      />
      {stappenNav}

      <div className="mx-auto flex max-w-[1360px] flex-col gap-5 px-3 pb-16 pt-4 sm:px-4 lg:px-6 lg:pt-5">
        {fout && <p className="rounded-[10px] border border-negative/25 bg-negative/5 px-4 py-2.5 text-[13px] text-negative">{fout}</p>}

        {/* Op een telefoon: de feiten van de campagne en de briefing, die in de balk geen plek hebben. */}
        <div className="flex flex-col gap-2 sm:hidden">
          <p className="text-[12px] leading-snug text-ink-muted">{feiten.join(" · ")}</p>
          <div className="flex gap-1.5">
            {analyse && (
              <button type="button" onClick={() => setBriefingOpen(true)} className="ma-knop ma-groep">
                <IconNotes />
                Briefing
              </button>
            )}
            <button type="button" onClick={onBewerk} className="ma-knop ma-groep">
              <IconPencil />
              Bewerken
            </button>
          </div>
        </div>

        {analyse && r && r.formaat !== 4 && (
          <div className="lg:hidden">
            <StapChips tabs={tabs} actief={actief} onKies={kiesTab} />
          </div>
        )}

        {laadt && analyse && (
          <p role="status" className="flex items-center gap-2 rounded-[10px] bg-surface-tint px-3.5 py-2 text-[12.5px] text-ink-muted">
            <span aria-hidden="true" className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-ink-faint border-t-transparent motion-reduce:animate-none" />
            Je ziet nog v{analyse.versie}
            {getoondMeta?.periodeTot ? ` (t/m ${datumKort(getoondMeta.periodeTot)})` : ""}; v{gekozenMeta?.versie} wordt geladen.
          </p>
        )}
        {!analyse && gekozen && !fout && <p className="px-1 py-6 text-[13px] text-ink-muted">Analyse laden…</p>}

        {versies && versies.length === 0 && (
          <>
            <Briefing b={campagne} titel="Briefing" opzet={opzet?.naam} rapportage={opzet?.formulier === "rapportage"} />
            <section className="rounded-[14px] border border-dashed border-line bg-[var(--ma-ondergrond)] px-6 py-8 text-center">
              <p className="ma-kop text-ink">Nog geen analyse</p>
              {opzet && !opzet.heeftPrompt ? (
                <p className="mx-auto mt-1 max-w-xl text-[13px] text-ink-muted">
                  Er is nog geen prompt voor <span className="font-medium text-ink">{opzet.naam}</span>. Zolang die leeg is, weigert Claude
                  de analyse. {isEigenaar ? "Schrijf hem via Meer → Analyse prompts." : "De eigenaar schrijft hem via Analyse prompts."}
                </p>
              ) : (
                <p className="mx-auto mt-1 max-w-xl text-[13px] text-ink-muted">
                  Zeg in Claude Code: “maak een marketing analyse van {campagne.naam}”, of zet de planning in het overzicht op Wekelijks,
                  Maandelijks of Per kwartaal en zeg op vrijdag “voer de analyseronde uit”. Claude haalt de briefing, de prompt van {opzet?.naam ?? "de opzet"} en de semantic layer op en zet het
                  resultaat hier neer.
                </p>
              )}
            </section>
            <DataCorrectie campagne={campagne} bijVersie={campagne.dataCorrectie} onOpgeslagen={onCampagneBijgewerkt} />
          </>
        )}

        {analyse && r && r.formaat === 4 && (
          <div className={`flex flex-col gap-4 ${laadt ? "ma-oud" : ""}`}>
            {r.maandrapport ? (
              <MaandrapportWeergave key={analyse.id} rapport={r.maandrapport} bronnen={r.bronnen ?? []} datakwaliteit={r.datakwaliteit ?? []} />
            ) : (
              <p className="rounded-[14px] border border-dashed border-line bg-[var(--ma-ondergrond)] px-6 py-8 text-center text-[13px] text-ink-muted">
                Deze versie bevat geen maandrapport.
              </p>
            )}
          </div>
        )}

        {analyse && r && r.formaat !== 4 && (
          <div className={`flex min-w-0 flex-col gap-5 ${laadt ? "pointer-events-none" : ""}`}>
            {actief === SAMENVATTING && (
              <div key={`${analyse.id}-samenvatting`} className="ma-in flex flex-col gap-5">
                {!rapportage && (
                  <div className="flex flex-col gap-2">
                    <AnalyseKpis analyse={analyse} vergelijking={vergelijking} vorige={vorigeVersie} oud={laadt} />
                    {vergelijking === "vorige" && vorigeVersie && <VergelijkingNoot analyse={analyse} vorige={vorigeVersie} />}
                    {vergelijking === "vorige" && vorigeMeta && !vorigeVersie && (
                      <p className="px-0.5 text-[12px] text-ink-faint">v{vorigeMeta.versie} wordt geladen voor de vergelijking…</p>
                    )}
                  </div>
                )}
                <div className={laadt ? "ma-oud" : ""}>
                  <SamenvattingPagina analyse={analyse} resultaat={r} tabs={tabs} onKies={kiesTab} trend={!rapportage ? <TrendDuo analyse={analyse} resultaat={r} /> : undefined} />
                </div>
              </div>
            )}
            {tab && (
              <div className={laadt ? "ma-oud" : ""}>
                <StapPagina
                  key={`${analyse.id}-${tab.sleutel}`}
                  tab={tab}
                  nr={tabIndex + 1}
                  aantal={tabs.length}
                  formaat={r.formaat}
                  vorige={vorige}
                  volgende={volgende}
                  onKies={kiesTab}
                  periodeVan={analyse.periodeVan}
                  periodeTot={analyse.periodeTot}
                />
              </div>
            )}
            {actief === VERANTWOORDING && (
              <div className={`ma-in ${laadt ? "ma-oud" : ""}`}>
                <Verantwoording
                  resultaat={r}
                  campagne={campagne}
                  dataCorrectieBijVersie={analyse.briefing.dataCorrectie}
                  isEigenaar={isEigenaar}
                  onCampagneBijgewerkt={onCampagneBijgewerkt}
                  versieId={analyse.id}
                />
              </div>
            )}
          </div>
        )}

        {analyse && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-3">
            <p className="text-[11.5px] text-ink-faint">
              v{analyse.versie} · geanalyseerd op{" "}
              {new Intl.DateTimeFormat("nl-NL", { dateStyle: "long", timeStyle: "short" }).format(new Date(analyse.geanalyseerdOp))}
              {analyse.briefing.periodeTekst
                ? ` · periode “${analyse.briefing.periodeTekst}”${analyse.periodeVan ? ` → ${looptijdLabel(analyse.periodeVan, analyse.periodeTot)}` : ""}`
                : analyse.periodeVan && ` · periode ${looptijdLabel(analyse.periodeVan, analyse.periodeTot)}`}
              {` · prompt ${analyse.promptVersie ? `v${analyse.promptVersie}` : "standaard"}`}
              {` · semantic layer ${analyse.semantiekVersie ? `v${analyse.semantiekVersie}` : "standaard"}`}
            </p>
            {isEigenaar && (
              <button type="button" onClick={verwijderVersie} className="text-[11.5px] text-negative underline-offset-2 hover:underline">
                {bevestigWeg ? `Versie ${analyse.versie} echt verwijderen?` : "Versie verwijderen"}
              </button>
            )}
          </div>
        )}
      </div>

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
    </>
  );
}
