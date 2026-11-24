"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Inlogprompt from "@/components/Inlogprompt";
import AnalyseWeergave, { DoelRegel, LabelBadge } from "@/components/marketingAnalyse/AnalyseWeergave";
import CampagneZijbalk from "@/components/marketingAnalyse/CampagneZijbalk";
import AnalysePromptZijbalk from "@/components/marketingAnalyse/AnalysePromptZijbalk";
import SemantiekZijbalk from "@/components/marketingAnalyse/SemantiekZijbalk";
import { getBrandLogo } from "@/components/brandLogos";
import { IconBook, IconBrain, IconChevronDown, IconPencil, IconPlus } from "@/components/icons";
import { deelOpInLopendEnAfgelopen, formatWaarde, looptijdLabel, vandaagNL, versieLabel } from "@/lib/marketingAnalyse/rekenen";
import { STANDAARD_SEMANTIEK } from "@/lib/marketingAnalyse/standaardSemantiek";
import {
  BEDRIJF_MET_SYNTEC,
  type MaCampagne,
  type MaKerncijfers,
  type MaOpzet,
  type MaOverzichtRegel,
} from "@/lib/marketingAnalyse/types";

/** De funnelcijfers in het overzicht, in funnelvolgorde. */
const KOLOMMEN: { sleutel: keyof MaKerncijfers; label: string; eenheid: "euro" | "aantal"; titel: string }[] = [
  { sleutel: "kosten", label: "Kosten", eenheid: "euro", titel: "Mediakosten plus de verdeelde extra kanaalkosten" },
  { sleutel: "vertoningen", label: "Vertoningen", eenheid: "aantal", titel: "Vertoningen betaald en organisch" },
  { sleutel: "klikken", label: "Klikken", eenheid: "aantal", titel: "Klikken op advertenties" },
  { sleutel: "sessies", label: "Sessies", eenheid: "aantal", titel: "Sessies die op de campagnepagina('s) begonnen (GA4)" },
  { sleutel: "leadEvents", label: "Lead-events", eenheid: "aantal", titel: "Lead-events in sessies die op de campagnepagina begonnen (GA4)" },
  { sleutel: "leadsSyntec", label: "Leads Syntec", eenheid: "aantal", titel: "Leads in Syntec voor merk en model (alleen Van den Udenhout)" },
];

const URL_PARAM = "analyse";

function zetUrl(id: string | null) {
  const params = new URLSearchParams(window.location.search);
  if (id) params.set(URL_PARAM, id);
  else params.delete(URL_PARAM);
  const zoek = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${zoek ? `?${zoek}` : ""}`);
}

function RondeSchakelaar({ aan, bezig, onWissel, naam }: { aan: boolean; bezig: boolean; onWissel: () => void; naam: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={aan}
      aria-label={`Analyse ronde voor ${naam}`}
      disabled={bezig}
      onClick={(e) => {
        e.stopPropagation();
        onWissel();
      }}
      className="inline-flex items-center gap-2 disabled:opacity-60"
    >
      <span className={`relative h-5 w-9 shrink-0 rounded-pill transition-colors duration-[var(--duur-snel)] ${aan ? "bg-primary" : "bg-progress-track"}`}>
        <span
          className={`absolute left-0 top-0.5 h-4 w-4 rounded-full bg-card shadow-subtle transition-transform duration-[var(--duur-snel)] ease-merk ${aan ? "translate-x-4" : "translate-x-0.5"}`}
        />
      </span>
      <span className={`text-sm ${aan ? "text-ink" : "text-ink-faint"}`}>{aan ? "Aan" : "Uit"}</span>
    </button>
  );
}

/**
 * Het menu Analyse prompts: per opzet de prompt openen, en voor de eigenaar "Nieuwe opzet".
 * Een opzet zonder prompt zegt dat erbij; uitgezette opzetten ziet alleen de eigenaar.
 *
 * Het menu rendert via een portal naar <body> met een vaste positie onder de knop: de knop
 * staat in de kop van een paneel met `overflow-hidden`, en daarbinnen viel alles onder de
 * rand van een kort paneel weg (de PGZ-opzetten en "Nieuwe opzet").
 */
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

function CampagneTabel({
  campagnes,
  opzetten,
  rondeBezig,
  onOpen,
  onBewerk,
  onRonde,
}: {
  campagnes: MaOverzichtRegel[];
  opzetten: Map<string, MaOpzet>;
  rondeBezig: Set<string>;
  onOpen: (id: string) => void;
  onBewerk: (c: MaOverzichtRegel) => void;
  onRonde: (c: MaOverzichtRegel) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-label text-ink-faint">
            <th className="label-theme px-6 py-2.5 font-normal">Campagne</th>
            <th className="label-theme px-3 py-2.5 font-normal">Doel</th>
            <th className="label-theme whitespace-nowrap px-3 py-2.5 font-normal" title="Aan: “voer de analyseronde uit” neemt deze campagne mee">
              Analyse ronde
            </th>
            <th className="label-theme px-3 py-2.5 font-normal">Laatste analyse</th>
            {KOLOMMEN.map((k) => (
              <th key={k.sleutel} title={k.titel} className="label-theme whitespace-nowrap px-3 py-2.5 text-right font-normal">
                {k.label}
              </th>
            ))}
            <th className="label-theme whitespace-nowrap px-3 py-2.5 font-normal">Op schema</th>
            <th className="w-12 px-4 py-2.5">
              <span className="sr-only">Briefing bewerken</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {campagnes.map((c) => {
            const Logo = c.merk ? getBrandLogo(c.merk) : null;
            const k = c.laatsteAnalyse?.kerncijfers;
            const zonderSyntec = c.bedrijf !== BEDRIJF_MET_SYNTEC;
            const opzet = opzetten.get(c.opzetId);
            // Alleen een campagne-analyse heeft funnelcijfers, doel en kosten op schema.
            const rapportage = opzet?.formulier === "rapportage";
            return (
              <tr
                key={c.id}
                onClick={() => onOpen(c.id)}
                className="cursor-pointer align-top transition-colors duration-[var(--duur-snel)] hover:bg-surface [&>td]:border-t [&>td]:border-line-soft"
              >
                <td className="max-w-[280px] px-6 py-3">
                  <div className="flex items-center gap-2">
                    {Logo && <Logo role="img" aria-label={c.merk ?? undefined} className="h-4 w-4 shrink-0 text-ink-muted" />}
                    <p className="truncate font-semibold text-ink" title={c.naam}>
                      {c.naam}
                    </p>
                  </div>
                  <p className="mt-0.5 text-meta text-ink-faint">
                    {opzet && !opzet.standaard && `${opzet.naam} · `}
                    {c.bedrijf} ·{" "}
                    {rapportage ? c.periodeTekst || "Geen periode" : looptijdLabel(c.startdatum, c.einddatum)}
                    {!rapportage && c.budget != null && ` · ${formatWaarde(c.budget, "euro")}`}
                  </p>
                </td>
                <td className="max-w-[220px] px-3 py-3 text-ink-muted">
                  {!rapportage && <p className="line-clamp-2">{c.doel || "—"}</p>}
                </td>
                <td className="px-3 py-3">
                  <RondeSchakelaar aan={c.analyseRonde} bezig={rondeBezig.has(c.id)} onWissel={() => onRonde(c)} naam={c.naam} />
                </td>
                <td className="px-3 py-3">
                  {c.laatsteAnalyse ? (
                    <div className="flex flex-col items-start gap-1">
                      <span className="whitespace-nowrap text-ink">{versieLabel(c.laatsteAnalyse.versie, c.laatsteAnalyse.geanalyseerdOp)}</span>
                      <LabelBadge label={c.laatsteAnalyse.label} />
                    </div>
                  ) : opzet && !opzet.heeftPrompt ? (
                    <span className="text-negative" title={`Er is nog geen prompt voor ${opzet.naam}; Claude weigert de analyse`}>
                      Nog geen prompt
                    </span>
                  ) : (
                    <span className="text-ink-faint">Nog niet geanalyseerd</span>
                  )}
                </td>
                {rapportage ? (
                  <td colSpan={KOLOMMEN.length + 1} aria-hidden="true" />
                ) : (
                  <>
                {KOLOMMEN.map((kol) => (
                  <td key={kol.sleutel} className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-ink">
                    {kol.sleutel === "leadsSyntec" && zonderSyntec ? (
                      <span className="text-ink-faint" title="Syntec-leads zijn alleen van toepassing op Van den Udenhout">
                        n.v.t.
                      </span>
                    ) : (
                      formatWaarde((k?.[kol.sleutel] as number | null | undefined) ?? null, kol.eenheid)
                    )}
                    {kol.sleutel === "leadsSyntec" && !zonderSyntec && k?.leadsSyntecInternet != null && (
                      <p className="text-meta text-ink-faint">{formatWaarde(k.leadsSyntecInternet)} via internet</p>
                    )}
                  </td>
                ))}
                <td className="whitespace-nowrap px-3 py-3" title={k?.doel?.toelichting}>
                  <DoelRegel doel={k?.doel} />
                </td>
                  </>
                )}
                <td className="px-4 py-3 text-right">
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Campagnes → Marketing analyse.
 *
 * Het overzicht: lopende campagnes bovenaan op startdatum, afgelopen campagnes eronder in een
 * inklapbaar blok, elk met de funnelcijfers uit zijn laatste analyse en de schakelaar Analyse
 * ronde. Een klik op een regel opent de analysepagina (met alle versies). Rechtsboven de
 * hoofdprompt, de semantic layer en "Nieuwe campagne"; het potlood opent de briefing.
 *
 * De analyses maakt Claude Code (skill `marketing-analyse`), niet deze pagina.
 */
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
              <CampagneTabel campagnes={lopend} {...tabelProps} />
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
                  <CampagneTabel campagnes={afgelopen} {...tabelProps} />
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
