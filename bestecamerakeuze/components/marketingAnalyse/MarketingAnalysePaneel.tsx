"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Inlogprompt from "@/components/Inlogprompt";
import AnalyseWeergave, { LabelBadge } from "@/components/marketingAnalyse/AnalyseWeergave";
import ProgressBar from "@/components/ProgressBar";
import CampagneZijbalk from "@/components/marketingAnalyse/CampagneZijbalk";
import AnalysePromptZijbalk from "@/components/marketingAnalyse/AnalysePromptZijbalk";
import SemantiekZijbalk from "@/components/marketingAnalyse/SemantiekZijbalk";
import { getBrandLogo } from "@/components/brandLogos";
import { IconBook, IconBrain, IconChevronDown, IconPencil, IconPlus } from "@/components/icons";
import {
  bedrijvenLabel,
  deelOpInLopendEnAfgelopen,
  formatWaarde,
  looptijdLabel,
  overzichtCijfers,
  vandaagNL,
  versieLabel,
  type LeadBron,
} from "@/lib/marketingAnalyse/rekenen";
import { STANDAARD_SEMANTIEK } from "@/lib/marketingAnalyse/standaardSemantiek";
import type { MaCampagne, MaOpzet, MaOverzichtRegel } from "@/lib/marketingAnalyse/types";

const URL_PARAM = "analyse";

function zetUrl(id: string | null) {
  const params = new URLSearchParams(window.location.search);
  if (id) params.set(URL_PARAM, id);
  else params.delete(URL_PARAM);
  const zoek = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${zoek ? `?${zoek}` : ""}`);
}

/**
 * De schakelaar Analyse ronde: aan = "voer de analyseronde uit" neemt deze regel mee. Klein en
 * zonder tekst ernaast, zodat hij vooraan in de regel niet de aandacht trekt.
 */
function RondeSchakelaar({ aan, bezig, onWissel, naam }: { aan: boolean; bezig: boolean; onWissel: () => void; naam: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={aan}
      aria-label={`Analyse ronde voor ${naam}`}
      title={aan ? "In de analyseronde" : "Niet in de analyseronde"}
      disabled={bezig}
      onClick={(e) => {
        e.stopPropagation();
        onWissel();
      }}
      className="inline-flex items-center disabled:opacity-60"
    >
      <span className={`relative h-4 w-7 shrink-0 rounded-pill transition-colors duration-[var(--duur-snel)] ${aan ? "bg-primary/60" : "bg-progress-track"}`}>
        <span
          className={`absolute left-0 top-0.5 h-3 w-3 rounded-full bg-card shadow-subtle transition-transform duration-[var(--duur-snel)] ease-merk ${aan ? "translate-x-3.5" : "translate-x-0.5"}`}
        />
      </span>
    </button>
  );
}

function AnalysePromptsMenu({
  opzetten,
  isEigenaar,
  onKies,
  onNieuw,
}: {
  opzetten: MaOpzet[];
  isEigenaar: boolean;
  onKies: (opzet: MaOpzet) => void;
  onNieuw: () => void;
}) {
  const [plek, setPlek] = useState<{ top: number; right: number } | null>(null);
  const open = plek !== null;
  const knopRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function wissel() {
    const r = knopRef.current?.getBoundingClientRect();
    setPlek((huidig) => (huidig || !r ? null : { top: r.bottom + 8, right: window.innerWidth - r.right }));
  }

  useEffect(() => {
    if (!open) return;
    const sluit = () => setPlek(null);
    function buiten(e: MouseEvent) {
      const doel = e.target as Node;
      if (!knopRef.current?.contains(doel) && !menuRef.current?.contains(doel)) sluit();
    }
    function toets(e: KeyboardEvent) {
      if (e.key === "Escape") sluit();
    }
    document.addEventListener("mousedown", buiten);
    document.addEventListener("keydown", toets);
    // Vaste positie: bij scrollen of een ander venstermaat klopt hij niet meer, dus dicht.
    window.addEventListener("scroll", sluit, true);
    window.addEventListener("resize", sluit);
    return () => {
      document.removeEventListener("mousedown", buiten);
      document.removeEventListener("keydown", toets);
      window.removeEventListener("scroll", sluit, true);
      window.removeEventListener("resize", sluit);
    };
  }, [open]);

  const zichtbaar = opzetten.filter((o) => o.actief || isEigenaar);

  return (
    <>
      <button
        ref={knopRef}
        type="button"
        onClick={wissel}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-button border border-line bg-card px-4 py-2 text-sm font-medium text-ink transition-colors duration-[var(--duur-snel)] hover:bg-surface"
      >
        <IconBrain className="h-4 w-4 text-ink-muted" />
        Analyse prompts
        <IconChevronDown className={`h-4 w-4 text-ink-faint transition-transform duration-[var(--duur-snel)] ${open ? "rotate-180" : ""}`} />
      </button>
      {plek &&
        createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ top: plek.top, right: plek.right }}
          className="fixed z-50 max-h-[70vh] w-80 overflow-y-auto rounded-card border border-line bg-card py-1 shadow-dropdown"
        >
          {zichtbaar.length === 0 && <p className="px-4 py-2 text-sm text-ink-muted">Laden…</p>}
          {zichtbaar.map((o) => (
            <button
              key={o.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setPlek(null);
                onKies(o);
              }}
              className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition-colors hover:bg-surface"
            >
              <span className={o.actief ? "text-ink" : "text-ink-faint"}>{o.naam}</span>
              <span className="whitespace-nowrap text-meta text-ink-faint">
                {!o.actief ? "uitgezet" : !o.heeftPrompt ? "nog geen prompt" : o.standaard ? "standaard" : ""}
              </span>
            </button>
          ))}
          {isEigenaar && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setPlek(null);
                onNieuw();
              }}
              className="flex w-full items-center gap-2 border-t border-line-soft px-4 py-2.5 text-left text-sm font-medium text-ink transition-colors hover:bg-surface"
            >
              <IconPlus className="h-4 w-4 text-ink-muted" />
              Nieuwe opzet
            </button>
          )}
        </div>,
          document.body,
        )}
    </>
  );
}

type TabelProps = {
  campagnes: MaOverzichtRegel[];
  opzetten: Map<string, MaOpzet>;
  rondeBezig: Set<string>;
  onOpen: (id: string) => void;
  onBewerk: (c: MaOverzichtRegel) => void;
  onRonde: (c: MaOverzichtRegel) => void;
};

const KOP = "label-theme whitespace-nowrap px-3 py-2.5 font-normal";
const RIJ =
  "cursor-pointer align-top transition-colors duration-[var(--duur-snel)] hover:bg-surface [&>td]:border-t [&>td]:border-line-soft";

/** De laatste analyse als korte regel onder de naam. */
function LaatsteAnalyse({ c, opzet }: { c: MaOverzichtRegel; opzet: MaOpzet | undefined }) {
  if (c.laatsteAnalyse) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <span>{versieLabel(c.laatsteAnalyse.versie, c.laatsteAnalyse.geanalyseerdOp)}</span>
        <LabelBadge label={c.laatsteAnalyse.label} />
      </span>
    );
  }
  if (opzet && !opzet.heeftPrompt) {
    return (
      <span className="text-negative" title={`Er is nog geen prompt voor ${opzet.naam}; Claude weigert de analyse`}>
        Nog geen prompt
      </span>
    );
  }
  return <span>Nog niet geanalyseerd</span>;
}

function BewerkKnop({ c, onBewerk }: { c: MaOverzichtRegel; onBewerk: (c: MaOverzichtRegel) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onBewerk(c);
      }}
      title="Briefing bewerken"
      aria-label={`Briefing van ${c.naam} bewerken`}
      className="inline-flex h-7 w-7 items-center justify-center rounded-control text-ink-faint transition-colors hover:bg-card hover:text-ink"
    >
      <IconPencil className="h-4 w-4" />
    </button>
  );
}

/** Een cel met een bedrag of aantal, een balkje en een regel eronder. */
function BalkCel({
  waarde,
  pct,
  onder,
  toon = "neutraal",
}: {
  waarde: string;
  pct: number | null;
  onder: string;
  /** Kleur van de regel eronder: rood bij boven budget, groen bij een gehaald doel. */
  toon?: "neutraal" | "positief" | "negatief";
}) {
  return (
    <div className="flex min-w-[150px] flex-col gap-1.5">
      <span className="tabular-nums text-ink">{waarde}</span>
      {pct !== null ? <ProgressBar percent={pct} className="h-1 max-w-40" /> : null}
      <span className={`text-meta ${toon === "negatief" ? "text-negative" : toon === "positief" ? "text-positive" : "text-ink-faint"}`}>
        {onder}
      </span>
    </div>
  );
}

const BRON_NAAM: Record<LeadBron, string> = { syntec: "Syntec", ga4: "Google Analytics" };
const BRON_UITLEG: Record<LeadBron, string> = {
  syntec: "Leads in Syntec (Data leads) voor het merk en de modellen uit de briefing",
  ga4: "Lead-events in GA4 in sessies die op de campagnepagina('s) begonnen",
};

/**
 * Campagne-analyses: Analyse ronde, campagne, uitgaven tegen budget, leads (met bron) en het
 * leaddoel met hoeveel er gehaald is. De cijfers komen uit de laatste analyse.
 */
function CampagneAnalyseTabel({ campagnes, opzetten, rondeBezig, onOpen, onBewerk, onRonde }: TabelProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-label text-ink-faint">
            <th className="w-12 py-2.5 pl-6 pr-1" title="Aan: “voer de analyseronde uit” neemt deze campagne mee">
              <span className="label-theme font-normal">Ronde</span>
            </th>
            <th className={`${KOP} pl-3`}>Campagne</th>
            <th className={KOP} title="Mediakosten plus de verdeelde extra kanaalkosten, tegen het totaalbudget">
              Uitgaven
            </th>
            <th className={KOP} title="Syntec bij Van den Udenhout met opgegeven modellen, anders lead-events in Google Analytics">
              Leads
            </th>
            <th className={KOP} title="Het aantal leads uit het doel van de briefing, en hoeveel daarvan gehaald is">
              Doel leads
            </th>
            <th className="w-12 px-4 py-2.5">
              <span className="sr-only">Briefing bewerken</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {campagnes.map((c) => {
            const Logo = c.merk ? getBrandLogo(c.merk) : null;
            const opzet = opzetten.get(c.opzetId);
            const o = overzichtCijfers(c, c.laatsteAnalyse?.kerncijfers);
            const geanalyseerd = Boolean(c.laatsteAnalyse);
            return (
              <tr key={c.id} onClick={() => onOpen(c.id)} className={RIJ}>
                <td className="py-3 pl-6 pr-1 pt-3.5">
                  <RondeSchakelaar aan={c.analyseRonde} bezig={rondeBezig.has(c.id)} onWissel={() => onRonde(c)} naam={c.naam} />
                </td>
                <td className="max-w-[340px] px-3 py-3">
                  <div className="flex items-center gap-2">
                    {Logo && <Logo role="img" aria-label={c.merk ?? undefined} className="h-4 w-4 shrink-0 text-ink-muted" />}
                    <p className="truncate font-semibold text-ink" title={c.naam}>
                      {c.naam}
                    </p>
                  </div>
                  <p className="mt-0.5 text-meta text-ink-faint">
                    {opzet && !opzet.standaard && `${opzet.naam} · `}
                    {bedrijvenLabel(c.bedrijven)} · {looptijdLabel(c.startdatum, c.einddatum)}
                  </p>
                  <p className="mt-1 text-meta text-ink-faint">
                    <LaatsteAnalyse c={c} opzet={opzet} />
                  </p>
                </td>
                <td className="px-3 py-3">
                  <BalkCel
                    waarde={geanalyseerd ? formatWaarde(o.kosten, "euro") : "—"}
                    pct={o.besteedPct}
                    toon={o.besteedPct !== null && o.besteedPct > 100 ? "negatief" : "neutraal"}
                    onder={
                      o.budget === null
                        ? "Geen budget opgegeven"
                        : o.besteedPct === null
                          ? `Budget ${formatWaarde(o.budget, "euro")}`
                          : `${formatWaarde(o.besteedPct, "procent")} van ${formatWaarde(o.budget, "euro")}`
                    }
                  />
                </td>
                <td className="px-3 py-3" title={BRON_UITLEG[o.bron]}>
                  <div className="flex min-w-[120px] flex-col gap-1.5">
                    <span className="tabular-nums text-ink">{geanalyseerd ? formatWaarde(o.leads) : "—"}</span>
                    <span className="text-meta text-ink-faint">{BRON_NAAM[o.bron]}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <BalkCel
                    waarde={o.doelLeads !== null ? formatWaarde(o.doelLeads) : "—"}
                    pct={o.gehaaldPct}
                    toon={o.gehaaldPct !== null && o.gehaaldPct >= 100 ? "positief" : "neutraal"}
                    onder={
                      o.doelLeads === null
                        ? "Geen aantal in het doel"
                        : o.gehaaldPct === null
                          ? "Nog niet gemeten"
                          : `${formatWaarde(o.gehaaldPct, "procent")} gehaald`
                    }
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <BewerkKnop c={c} onBewerk={onBewerk} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Rapportages en andere opzetten zonder funnel: alleen naam, Analyse ronde en laatste analyse. */
function RapportageTabel({ campagnes, opzetten, rondeBezig, onOpen, onBewerk, onRonde }: TabelProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-label text-ink-faint">
            <th className="w-12 py-2.5 pl-6 pr-1" title="Aan: “voer de analyseronde uit” neemt deze rapportage mee">
              <span className="label-theme font-normal">Ronde</span>
            </th>
            <th className={`${KOP} pl-3`}>Rapportage</th>
            <th className={KOP}>Laatste analyse</th>
            <th className="w-12 px-4 py-2.5">
              <span className="sr-only">Briefing bewerken</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {campagnes.map((c) => {
            const opzet = opzetten.get(c.opzetId);
            return (
              <tr key={c.id} onClick={() => onOpen(c.id)} className={RIJ}>
                <td className="py-3 pl-6 pr-1 pt-3.5">
                  <RondeSchakelaar aan={c.analyseRonde} bezig={rondeBezig.has(c.id)} onWissel={() => onRonde(c)} naam={c.naam} />
                </td>
                <td className="max-w-[420px] px-3 py-3">
                  <p className="truncate font-semibold text-ink" title={c.naam}>
                    {c.naam}
                  </p>
                  <p className="mt-0.5 text-meta text-ink-faint">
                    {opzet ? `${opzet.naam} · ` : ""}
                    {bedrijvenLabel(c.bedrijven)} · {c.periodeTekst || "Geen periode"}
                  </p>
                </td>
                <td className="px-3 py-3 text-ink">
                  <LaatsteAnalyse c={c} opzet={opzet} />
                </td>
                <td className="px-4 py-3 text-right">
                  <BewerkKnop c={c} onBewerk={onBewerk} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Campagne-analyses en rapportages onder elkaar, elk met hun eigen kolommen. */
function OverzichtTabellen(props: TabelProps) {
  const isRapportage = (c: MaOverzichtRegel) => props.opzetten.get(c.opzetId)?.formulier === "rapportage";
  const campagnes = props.campagnes.filter((c) => !isRapportage(c));
  const rapportages = props.campagnes.filter(isRapportage);
  return (
    <>
      {campagnes.length > 0 && <CampagneAnalyseTabel {...props} campagnes={campagnes} />}
      {rapportages.length > 0 && (
        <div className={campagnes.length > 0 ? "border-t border-line-soft pt-2" : ""}>
          <RapportageTabel {...props} campagnes={rapportages} />
        </div>
      )}
    </>
  );
}

export default function MarketingAnalysePaneel({ ingelogd }: { ingelogd: boolean }) {
  const [campagnes, setCampagnes] = useState<MaOverzichtRegel[] | null>(null);
  const [opzetten, setOpzetten] = useState<MaOpzet[]>([]);
  const [bedrijven, setBedrijven] = useState<string[]>(STANDAARD_SEMANTIEK.bedrijven);
  const [isEigenaar, setIsEigenaar] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [zijbalk, setZijbalk] = useState<{ campagne: MaCampagne | null } | null>(null);
  const [paneel, setPaneel] = useState<{ soort: "prompt"; opzetId: string | null } | { soort: "semantiek" } | null>(null);
  const [afgelopenOpen, setAfgelopenOpen] = useState(false);
  const [rondeBezig, setRondeBezig] = useState<Set<string>>(new Set());

  const laad = useCallback(() => {
    fetch("/api/marketing-analyse")
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          campagnes?: MaOverzichtRegel[];
          opzetten?: MaOpzet[];
          isEigenaar?: boolean;
          fout?: string;
        };
        if (!res.ok) throw new Error(data.fout ?? "Kon de campagnes niet laden.");
        setCampagnes(data.campagnes ?? []);
        setOpzetten(data.opzetten ?? []);
        setIsEigenaar(Boolean(data.isEigenaar));
        setFout(null);
      })
      .catch((err) => setFout(err instanceof Error ? err.message : String(err)));
    // De keuzelijst Bedrijf komt uit de semantic layer; lukt dat niet, dan de startlijst.
    fetch("/api/marketing-analyse/semantiek")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { semantiek?: { inhoud?: { bedrijven?: string[] } } } | null) => {
        const lijst = data?.semantiek?.inhoud?.bedrijven;
        if (lijst && lijst.length > 0) setBedrijven(lijst);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!ingelogd) return;
    laad();
    const gevraagd = new URLSearchParams(window.location.search).get(URL_PARAM);
    if (gevraagd) setOpenId(gevraagd);
  }, [ingelogd, laad]);

  function open(id: string | null) {
    setOpenId(id);
    zetUrl(id);
    window.scrollTo({ top: 0 });
  }

  function bijgewerkt(c: MaCampagne) {
    setCampagnes((lijst) => {
      if (!lijst) return lijst;
      if (lijst.some((x) => x.id === c.id)) return lijst.map((x) => (x.id === c.id ? { ...x, ...c } : x));
      return [{ ...c, laatsteAnalyse: null, aantalAnalyses: 0 }, ...lijst];
    });
  }

  async function wisselRonde(c: MaOverzichtRegel) {
    const aan = !c.analyseRonde;
    setRondeBezig((s) => new Set(s).add(c.id));
    bijgewerkt({ ...c, analyseRonde: aan });
    try {
      const res = await fetch(`/api/marketing-analyse?id=${encodeURIComponent(c.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analyseRonde: aan }),
      });
      const data = (await res.json().catch(() => ({}))) as { campagne?: MaCampagne; fout?: string };
      if (!res.ok || !data.campagne) throw new Error(data.fout ?? "Kon de Analyse ronde niet aanpassen.");
      bijgewerkt(data.campagne);
    } catch (err) {
      bijgewerkt({ ...c, analyseRonde: !aan });
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setRondeBezig((s) => {
        const n = new Set(s);
        n.delete(c.id);
        return n;
      });
    }
  }

  if (!ingelogd) return <Inlogprompt tekst="Log in om de marketing analyses te bekijken." />;

  const geopend = campagnes?.find((c) => c.id === openId) ?? null;
  const opzetPerId = new Map(opzetten.map((o) => [o.id, o]));
  const promptOpzet = paneel?.soort === "prompt" && paneel.opzetId ? (opzetPerId.get(paneel.opzetId) ?? null) : null;
  const { lopend, afgelopen } = deelOpInLopendEnAfgelopen(campagnes ?? [], vandaagNL());
  const inRonde = (campagnes ?? []).filter((c) => c.analyseRonde).length;

  const knoppen = (
    <div className="flex items-center gap-2">
      <AnalysePromptsMenu
        opzetten={opzetten}
        isEigenaar={isEigenaar}
        onKies={(o) => setPaneel({ soort: "prompt", opzetId: o.id })}
        onNieuw={() => setPaneel({ soort: "prompt", opzetId: null })}
      />
      <button
        type="button"
        onClick={() => setPaneel({ soort: "semantiek" })}
        className="flex items-center gap-2 rounded-button border border-line bg-card px-4 py-2 text-sm font-medium text-ink transition-colors duration-[var(--duur-snel)] hover:bg-surface"
      >
        <IconBook className="h-4 w-4 text-ink-muted" />
        Semantic layer
      </button>
      {!geopend && (
        <button
          type="button"
          onClick={() => setZijbalk({ campagne: null })}
          className="flex items-center gap-2 rounded-button bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors duration-[var(--duur-snel)] hover:bg-primary-dark"
        >
          <IconPlus className="h-4 w-4" />
          Nieuwe analyse
        </button>
      )}
    </div>
  );

  const tabelProps = {
    opzetten: opzetPerId,
    rondeBezig,
    onOpen: (id: string) => open(id),
    onBewerk: (c: MaOverzichtRegel) => setZijbalk({ campagne: c }),
    onRonde: wisselRonde,
  };

  return (
    <div className="flex flex-col gap-5">
      {geopend ? (
        <>
          <div className="flex justify-end">{knoppen}</div>
          <AnalyseWeergave
            key={geopend.id}
            campagne={geopend}
            opzet={opzetPerId.get(geopend.opzetId) ?? null}
            isEigenaar={isEigenaar}
            onTerug={() => {
              open(null);
              laad();
            }}
            onBewerk={() => setZijbalk({ campagne: geopend })}
            onCampagneBijgewerkt={bijgewerkt}
          />
        </>
      ) : (
        <>
          <section className="kaart-accent overflow-hidden rounded-panel border border-line bg-card shadow-card">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-6 py-4">
              <div>
                <h2 className="label-theme text-label text-ink-muted">Lopende analyses</h2>
                <p className="mt-0.5 text-meta text-ink-faint">
                  Cijfers uit de laatste analyse. Klik op een regel voor de volledige analyse.
                  {inRonde > 0 && ` ${inRonde} ${inRonde === 1 ? "staat" : "staan"} in de analyseronde.`}
                </p>
              </div>
              {knoppen}
            </header>
            {fout && <p className="px-6 py-3 text-sm text-negative">{fout}</p>}
            {!campagnes ? (
              !fout && <p className="px-6 py-5 text-sm text-ink-muted">Laden…</p>
            ) : lopend.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="font-semibold text-ink">Geen lopende analyses</p>
                <p className="mx-auto mt-1 max-w-lg text-sm text-ink-muted">
                  Maak met Nieuwe analyse een campagne-analyse of een rapportage aan. Zeg daarna in Claude Code dat hij de analyse moet
                  maken; het resultaat verschijnt hier.
                </p>
              </div>
            ) : (
              <OverzichtTabellen campagnes={lopend} {...tabelProps} />
            )}
          </section>

          {afgelopen.length > 0 && (
            <section className="overflow-hidden rounded-panel border border-line bg-card shadow-subtle">
              <button
                type="button"
                onClick={() => setAfgelopenOpen((o) => !o)}
                aria-expanded={afgelopenOpen}
                className="flex w-full items-center justify-between px-6 py-4 text-left"
              >
                <span className="label-theme text-label text-ink-muted">Afgelopen ({afgelopen.length})</span>
                <IconChevronDown
                  className={`h-4 w-4 text-ink-faint transition-transform duration-[var(--duur-snel)] ${afgelopenOpen ? "rotate-180" : ""}`}
                />
              </button>
              {afgelopenOpen && (
                <div className="border-t border-line-soft">
                  <OverzichtTabellen campagnes={afgelopen} {...tabelProps} />
                </div>
              )}
            </section>
          )}
        </>
      )}

      {zijbalk && (
        <CampagneZijbalk
          campagne={zijbalk.campagne}
          opzetten={opzetten}
          bedrijven={bedrijven}
          isEigenaar={isEigenaar}
          onClose={() => setZijbalk(null)}
          onOpgeslagen={bijgewerkt}
          onVerwijderd={(id) => {
            setCampagnes((lijst) => lijst?.filter((x) => x.id !== id) ?? lijst);
            if (openId === id) open(null);
          }}
        />
      )}
      {paneel?.soort === "prompt" && (paneel.opzetId === null || promptOpzet) && (
        <AnalysePromptZijbalk
          key={paneel.opzetId ?? "nieuw"}
          opzet={promptOpzet}
          bedrijven={bedrijven}
          isEigenaar={isEigenaar}
          onOpzetOpgeslagen={(o) => {
            setOpzetten((lijst) => (lijst.some((x) => x.id === o.id) ? lijst.map((x) => (x.id === o.id ? o : x)) : [...lijst, o]));
            setPaneel({ soort: "prompt", opzetId: o.id });
          }}
          onOpzetVerwijderd={(id) => {
            setOpzetten((lijst) => lijst.filter((x) => x.id !== id));
            setPaneel(null);
          }}
          onClose={() => setPaneel(null)}
        />
      )}
      {paneel?.soort === "semantiek" && (
        <SemantiekZijbalk onClose={() => setPaneel(null)} onOpgeslagen={(inhoud) => setBedrijven(inhoud.bedrijven)} />
      )}
    </div>
  );
}
