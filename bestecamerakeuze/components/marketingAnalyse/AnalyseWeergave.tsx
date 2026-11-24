"use client";

import { useEffect, useState } from "react";
import Markdown from "@/components/chat/Markdown";
import SectieBlok from "@/components/marketingAnalyse/SectieBlok";
import VolgersBlok from "@/components/marketingAnalyse/VolgersBlok";
import { getBrandLogo } from "@/components/brandLogos";
import { IconArrowRight, IconPencil } from "@/components/icons";
import { datumKort, doorstroom, formatWaarde, looptijdLabel, versieLabel } from "@/lib/marketingAnalyse/rekenen";
import {
  DOEL_STATUS_NAAM,
  LABEL_NAAM,
  type DoelOordeel,
  type DoelStatus,
  type FunnelStap,
  type InzichtSoort,
  type Label,
  type MaAnalyse,
  type MaCampagne,
  type MaOpzet,
  type MaOverzichtRegel,
  type MaVersie,
  type Prioriteit,
} from "@/lib/marketingAnalyse/types";

type Props = {
  campagne: MaOverzichtRegel;
  /** De analyse opzet van deze campagne (null zolang de opzetten laden). */
  opzet: MaOpzet | null;
  isEigenaar: boolean;
  onTerug: () => void;
  onBewerk: () => void;
  onCampagneBijgewerkt: (c: MaCampagne) => void;
};

const SOORT_LABEL: Record<InzichtSoort, string> = { sterk: "Sterk", zwak: "Zwak", kans: "Kans", risico: "Risico" };

/** Alleen zwak en risico vragen om aandacht; de rest blijft rustig. */
const SOORT_KLEUR: Record<InzichtSoort, string> = {
  sterk: "border-positive/40 text-positive",
  kans: "border-line text-ink-muted",
  zwak: "border-negative/40 text-negative",
  risico: "border-negative/40 text-negative",
};

const PRIORITEIT_KLEUR: Record<Prioriteit, string> = {
  hoog: "border-negative/50 text-negative",
  middel: "border-negative/25 text-negative/80",
  laag: "border-line text-ink-muted",
};

const DOEL_KLEUR: Record<DoelStatus, string> = {
  voor: "text-positive",
  "op-koers": "text-positive",
  achter: "text-negative",
  onbekend: "text-ink-muted",
};

/** Het label van een versie; een rapportage heeft er geen (dan niets). */
export function LabelBadge({ label }: { label: Label | null }) {
  if (!label) return null;
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-control border px-1.5 py-0.5 text-meta ${
        label === "eind" ? "border-ink/30 text-ink" : "border-primary/40 text-primary"
      }`}
    >
      {LABEL_NAAM[label]}
    </span>
  );
}

export function DoelRegel({ doel }: { doel: DoelOordeel | null | undefined }) {
  if (!doel) return <span className="text-ink-faint">—</span>;
  return <span className={DOEL_KLEUR[doel.status] ?? "text-ink-muted"}>{DOEL_STATUS_NAAM[doel.status] ?? doel.status}</span>;
}

/**
 * De funnel als rij tegels, met tussen twee aantallen het percentage dat doorstroomt.
 * Bewust geen trechtergrafiek: de stappen verschillen een factor duizend.
 */
function FunnelStrip({ stappen }: { stappen: FunnelStap[] }) {
  if (stappen.length === 0) return null;
  const pct = doorstroom(stappen);
  return (
    <section className="kaart-accent rounded-panel border border-line bg-card px-6 py-5 shadow-card">
      <h2 className="label-theme mb-4 text-label text-ink-muted">De funnel</h2>
      <ol className="flex items-stretch gap-2 overflow-x-auto">
        {stappen.map((stap, i) => (
          <li key={`${stap.label}-${i}`} className="flex min-w-0 flex-1 items-stretch gap-2">
            {i > 0 && (
              <div className="flex shrink-0 flex-col items-center justify-center text-ink-faint" title="Doorstroom van de vorige stap">
                <IconArrowRight className="h-4 w-4" />
                <span className="text-meta tabular-nums">{pct[i] === null ? "" : formatWaarde(pct[i], "procent")}</span>
              </div>
            )}
            <div className="min-w-[120px] flex-1 rounded-card border border-line-soft bg-surface-tint px-4 py-3" title={stap.toelichting}>
              <p className="label-theme truncate text-label text-ink-faint">{stap.label}</p>
              <p className="mt-1 font-sans-w7 text-xl font-bold tabular-nums text-ink">{formatWaarde(stap.waarde, stap.eenheid)}</p>
              {stap.toelichting && <p className="mt-0.5 line-clamp-2 text-meta text-ink-muted">{stap.toelichting}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Briefing({ b, titel, opzet, rapportage }: { b: Partial<MaCampagne>; titel: string; opzet?: string; rapportage: boolean }) {
  const regels: [string, string][] = rapportage
    ? [
        ["Analyse opzet", opzet || "—"],
        ["Bedrijf", b.bedrijf || "—"],
        ["Periode", b.periodeTekst || "—"],
      ]
    : [
        ...(opzet ? ([["Analyse opzet", opzet]] as [string, string][]) : []),
        ["Bedrijf", b.bedrijf || "—"],
        ["Looptijd", looptijdLabel(b.startdatum ?? null, b.einddatum ?? null)],
        ["Totaalbudget", b.budget != null ? formatWaarde(b.budget, "euro") : "—"],
        ["Merk en model", [b.merk, (b.modellen ?? []).join(", ")].filter(Boolean).join(" · ") || "—"],
      ];
  return (
    <section className="rounded-panel border border-line bg-card px-6 py-5 shadow-subtle">
      <h2 className="label-theme mb-3 text-label text-ink-muted">{titel}</h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4">
        {regels.map(([label, waarde]) => (
          <div key={label}>
            <dt className="text-meta text-ink-faint">{label}</dt>
            <dd className="mt-0.5 text-sm text-ink">{waarde}</dd>
          </div>
        ))}
      </dl>
      {b.doel && (
        <div className="mt-4">
          <p className="text-meta text-ink-faint">Doel</p>
          <p className="mt-0.5 max-w-[90ch] whitespace-pre-line text-sm text-ink">{b.doel}</p>
        </div>
      )}
      {b.omschrijving && <p className="mt-4 max-w-[90ch] whitespace-pre-line text-sm text-ink-muted">{b.omschrijving}</p>}
    </section>
  );
}

/** Het veld Data correctie: altijd de huidige tekst van de campagne, voor de volgende analyse. */
function DataCorrectie({
  campagne,
  bijVersie,
  onOpgeslagen,
}: {
  campagne: MaOverzichtRegel;
  bijVersie: string | null | undefined;
  onOpgeslagen: (c: MaCampagne) => void;
}) {
  const [tekst, setTekst] = useState(campagne.dataCorrectie ?? "");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [melding, setMelding] = useState<string | null>(null);
  const gewijzigd = tekst.trim() !== (campagne.dataCorrectie ?? "").trim();

  async function opslaan() {
    setBezig(true);
    setFout(null);
    setMelding(null);
    try {
      const res = await fetch(`/api/marketing-analyse?id=${encodeURIComponent(campagne.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataCorrectie: tekst }),
      });
      const data = (await res.json().catch(() => ({}))) as { campagne?: MaCampagne; fout?: string };
      if (!res.ok || !data.campagne) throw new Error(data.fout ?? "Kon de Data correctie niet opslaan.");
      onOpgeslagen(data.campagne);
      setMelding("Opgeslagen. De volgende analyse neemt dit mee.");
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setBezig(false);
    }
  }

  return (
    <section className="rounded-panel border border-line bg-card px-6 py-5 shadow-subtle">
      <h2 className="label-theme text-label text-ink-muted">Data correctie</h2>
      <p className="mt-1 max-w-[90ch] text-meta text-ink-faint">
        Klopt de verantwoording hierboven niet? Schrijf op wat er mist of te veel is meegenomen, bijvoorbeeld een post die er niet
        bij hoort of een pagina of mailing die ontbreekt. De volgende analyse past het toe en meldt wat hij ermee deed.
      </p>
      <textarea
        value={tekst}
        onChange={(e) => {
          setTekst(e.target.value);
          setMelding(null);
        }}
        aria-label="Data correctie"
        rows={4}
        className="mt-3 w-full resize-y rounded-card border border-line bg-surface-tint px-4 py-3 text-sm text-ink outline-none focus:border-primary"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-meta text-ink-faint">
          {(bijVersie ?? "") !== (campagne.dataCorrectie ?? "")
            ? bijVersie
              ? "Deze versie is gemaakt met een eerdere tekst."
              : "Deze versie is gemaakt zonder Data correctie."
            : campagne.dataCorrectieBijgewerktOp
              ? `Laatst aangepast ${datumKort(campagne.dataCorrectieBijgewerktOp)}.`
              : ""}
        </p>
        <div className="flex items-center gap-3">
          {fout && <span className="text-sm text-negative">{fout}</span>}
          {melding && <span className="text-sm text-positive">{melding}</span>}
          <button
            type="button"
            onClick={opslaan}
            disabled={bezig || !gewijzigd}
            className="rounded-button bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {bezig ? "Opslaan…" : "Opslaan"}
          </button>
        </div>
      </div>
    </section>
  );
}

/** De analysepagina van één campagne: kies een versie, lees de analyse in funnelvolgorde. */
export default function AnalyseWeergave({ campagne, opzet, isEigenaar, onTerug, onBewerk, onCampagneBijgewerkt }: Props) {
  const [versies, setVersies] = useState<MaVersie[] | null>(null);
  const [gekozen, setGekozen] = useState<string | null>(campagne.laatsteAnalyse?.id ?? null);
  const [analyse, setAnalyse] = useState<MaAnalyse | null>(null);
  const [laadt, setLaadt] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [bevestigWeg, setBevestigWeg] = useState(false);
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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onTerug}
            className="rounded-button border border-line bg-card px-3 py-1.5 text-sm text-ink-muted transition-colors duration-[var(--duur-snel)] hover:bg-surface hover:text-ink"
          >
            ← Alle campagnes
          </button>
          {Logo && <Logo role="img" aria-label={campagne.merk ?? undefined} className="h-5 w-5 shrink-0 text-ink-muted" />}
          <h2 className="truncate font-sans-w7 text-lg font-bold text-ink">{campagne.naam}</h2>
          <span className="whitespace-nowrap text-sm text-ink-muted">
            {opzet && !opzet.standaard ? `${opzet.naam} · ` : ""}
            {campagne.bedrijf}
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
          <VolgersBlok campagneId={campagne.id} />
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

          <section className="kaart-accent kaart-omlijst rounded-panel border border-line bg-card px-6 py-5 shadow-card">
            <h2 className="label-theme text-label text-ink-muted">Samenvatting</h2>
            {r.samenvatting.kop && <p className="mt-2 font-sans-w7 text-lg font-bold text-ink">{r.samenvatting.kop}</p>}
            {r.samenvatting.regels.length > 0 && (
              <ul className="mt-3 flex max-w-[90ch] list-disc flex-col gap-1 pl-5 text-sm text-ink">
                {r.samenvatting.regels.map((regel, i) => (
                  <li key={i}>{regel}</li>
                ))}
              </ul>
            )}
            {r.doel && (
              <p className="mt-4 text-sm">
                <span className="text-ink-faint">Doel: </span>
                <span className="font-semibold">
                  <DoelRegel doel={r.doel} />
                </span>
                <span className="text-ink-muted"> — {r.doel.toelichting}</span>
              </p>
            )}
            {r.samenvatting.tekst && (
              <div className="mt-4 border-t border-line-soft pt-4 text-sm">
                <Markdown tekst={r.samenvatting.tekst} />
              </div>
            )}
          </section>

          <Briefing
            b={analyse.briefing}
            titel={`Briefing bij v${analyse.versie}`}
            opzet={analyse.briefing.opzet}
            rapportage={analyse.briefing.formulier === "rapportage"}
          />
          <FunnelStrip stappen={r.funnel} />
          {r.secties.map((s, i) => (
            <SectieBlok key={`${s.stap}-${i}`} sectie={s} nummer={i + 1} />
          ))}

          {((r.inzichten?.length ?? 0) > 0 || (r.aanbevelingen?.length ?? 0) > 0) && (
            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-panel border border-line bg-card px-6 py-5 shadow-subtle">
                <h2 className="label-theme mb-3 text-label text-ink-muted">Inzichten</h2>
                <ul className="flex flex-col gap-3">
                  {r.inzichten?.map((z, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className={`mt-0.5 shrink-0 rounded-control border px-1.5 py-0.5 text-meta ${SOORT_KLEUR[z.soort] ?? SOORT_KLEUR.kans}`}>
                        {SOORT_LABEL[z.soort] ?? z.soort}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{z.titel}</p>
                        <p className="mt-0.5 text-sm text-ink-muted">{z.toelichting}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="rounded-panel border border-line bg-card px-6 py-5 shadow-subtle">
                <h2 className="label-theme mb-3 text-label text-ink-muted">
                  {analyse.label === "eind" ? "Lessen en aanbevelingen" : "Nu bijsturen"}
                </h2>
                <ol className="flex flex-col gap-3">
                  {r.aanbevelingen?.map((a, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 w-5 shrink-0 text-right text-sm font-semibold tabular-nums text-ink-faint">{i + 1}.</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-ink">{a.titel}</p>
                          <span className={`shrink-0 rounded-control border px-1.5 py-0.5 text-meta ${PRIORITEIT_KLEUR[a.prioriteit] ?? PRIORITEIT_KLEUR.laag}`}>
                            {a.prioriteit}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-ink-muted">{a.toelichting}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          )}

          <section className="rounded-panel border border-line bg-card shadow-subtle">
            <header className="border-b border-line-soft px-6 py-4">
              <h2 className="label-theme text-label text-ink-muted">Verantwoording</h2>
              <p className="mt-1 text-meta text-ink-faint">Wat de analyse aan deze campagne heeft toegerekend, en waarom. Klopt iets niet? Vul de Data correctie hieronder in.</p>
              {r.bronnen && r.bronnen.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.bronnen.map((b) => (
                    <span key={b} className="rounded-control border border-line-soft bg-surface-tint px-2 py-0.5 text-meta text-ink-muted">
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </header>
            {r.herkenning.length === 0 ? (
              <p className="px-6 py-4 text-sm text-ink-muted">Geen toewijzingen vastgelegd.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-label text-ink-faint">
                    <th className="label-theme px-6 py-2 font-normal">Bron</th>
                    <th className="label-theme px-3 py-2 font-normal">Soort</th>
                    <th className="label-theme px-3 py-2 font-normal">Naam</th>
                    <th className="label-theme px-3 py-2 font-normal">Waarom</th>
                    <th className="label-theme px-6 py-2 text-right font-normal">Zekerheid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft border-t border-line-soft">
                  {r.herkenning.map((h, i) => (
                    <tr key={i} className="align-top">
                      <td className="whitespace-nowrap px-6 py-2.5 text-ink">{h.bron}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-ink-muted">{h.soort}</td>
                      <td className="max-w-[28ch] break-words px-3 py-2.5 font-medium text-ink">{h.naam}</td>
                      <td className="px-3 py-2.5 text-ink-muted">{h.reden}</td>
                      <td className={`whitespace-nowrap px-6 py-2.5 text-right ${h.zekerheid === "twijfel" ? "text-negative" : "text-ink-muted"}`}>
                        {h.zekerheid ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {r.correcties && r.correcties.length > 0 && (
              <div className="border-t border-line-soft px-6 py-4">
                <p className="mb-2 text-sm font-semibold text-ink">Wat er met de Data correctie is gedaan</p>
                <ul className="flex flex-col gap-2 text-sm">
                  {r.correcties.map((c, i) => (
                    <li key={i}>
                      <span className="text-ink">{c.correctie}</span>
                      <span className="text-ink-muted"> → {c.verwerking}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {r.datakwaliteit && r.datakwaliteit.length > 0 && (
              <div className="border-t border-line-soft px-6 py-4">
                <p className="mb-2 text-sm font-semibold text-ink">Kanttekeningen bij de data</p>
                <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-ink-muted">
                  {r.datakwaliteit.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <DataCorrectie
            key={analyse.id}
            campagne={campagne}
            bijVersie={analyse.briefing.dataCorrectie}
            onOpgeslagen={onCampagneBijgewerkt}
          />

          <VolgersBlok campagneId={campagne.id} />

          {r.semantiekVoorstellen && r.semantiekVoorstellen.length > 0 && (
            <section className="rounded-panel border border-line bg-card px-6 py-5 shadow-subtle">
              <h2 className="label-theme text-label text-ink-muted">Voorstellen voor de semantic layer</h2>
              <p className="mt-1 text-meta text-ink-faint">
                Bevindingen die voor alle campagnes lijken te gelden. De analyse past de semantic layer nooit zelf aan
                {isEigenaar ? "; neem over wat klopt via de knop Semantic layer." : "; de eigenaar beslist."}
              </p>
              <ul className="mt-3 flex flex-col gap-3">
                {r.semantiekVoorstellen.map((v, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 rounded-control border border-line px-1.5 py-0.5 text-meta text-ink-muted">{v.blok}</span>
                    <div className="min-w-0">
                      <p className="text-sm text-ink">{v.voorstel}</p>
                      <p className="mt-0.5 text-meta text-ink-muted">{v.reden}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {!analyse && laadt && <p className="text-sm text-ink-muted">Analyse laden…</p>}
    </div>
  );
}
