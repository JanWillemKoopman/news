"use client";

import { useEffect, useState } from "react";
import Markdown from "@/components/chat/Markdown";
import SectieBlok from "@/components/insight/SectieBlok";
import { getBrandLogo } from "@/components/brandLogos";
import { IconArrowRight, IconPencil } from "@/components/icons";
import { doorstroom, formatWaarde, looptijdLabel, versieLabel } from "@/lib/insight/rekenen";
import type {
  FunnelStap,
  InsightAnalyse,
  InsightOverzichtRegel,
  InsightVersie,
  InzichtSoort,
  Prioriteit,
} from "@/lib/insight/types";

type Props = {
  campagne: InsightOverzichtRegel;
  onTerug: () => void;
  onBewerk: () => void;
};

const SOORT_LABEL: Record<InzichtSoort, string> = {
  sterk: "Sterk",
  zwak: "Zwak",
  kans: "Kans",
  risico: "Risico",
};

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

/**
 * De funnel als rij tegels, van bereik naar lead, met tussen elke twee aantallen het
 * percentage dat doorstroomt. Bewust geen trechtergrafiek: de stappen verschillen een
 * factor duizend (vertoningen tegenover leads), dan is een lengte niet meer te lezen.
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

function Briefing({ campagne, analyse }: { campagne: InsightOverzichtRegel; analyse: InsightAnalyse | null }) {
  // De briefing zoals hij was bij deze analyse; zonder analyse de huidige.
  const b = analyse?.briefing ?? campagne;
  const regels: [string, string][] = [
    ["Looptijd", looptijdLabel(b.startdatum ?? null, b.einddatum ?? null)],
    ["Doel", b.doel || "—"],
    ["Budget", b.budget != null ? formatWaarde(b.budget, "euro") : "—"],
    ["Merk en model", [b.merk, b.model].filter(Boolean).join(" ") || "—"],
  ];
  return (
    <section className="rounded-panel border border-line bg-card px-6 py-5 shadow-subtle">
      <h2 className="label-theme mb-3 text-label text-ink-muted">Briefing{analyse ? ` bij v${analyse.versie}` : ""}</h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4">
        {regels.map(([label, waarde]) => (
          <div key={label}>
            <dt className="text-meta text-ink-faint">{label}</dt>
            <dd className="mt-0.5 text-sm text-ink">{waarde}</dd>
          </div>
        ))}
      </dl>
      {b.omschrijving && <p className="mt-4 max-w-[90ch] whitespace-pre-line text-sm text-ink-muted">{b.omschrijving}</p>}
    </section>
  );
}

/** De analysepagina van één campagne: kies een versie, lees de analyse in funnelvolgorde. */
export default function AnalyseWeergave({ campagne, onTerug, onBewerk }: Props) {
  const [versies, setVersies] = useState<InsightVersie[] | null>(null);
  const [gekozen, setGekozen] = useState<string | null>(campagne.laatsteAnalyse?.id ?? null);
  const [analyse, setAnalyse] = useState<InsightAnalyse | null>(null);
  const [laadt, setLaadt] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const Logo = campagne.merk ? getBrandLogo(campagne.merk) : null;

  useEffect(() => {
    let actief = true;
    fetch(`/api/campagne-insight/analyse?campagne=${encodeURIComponent(campagne.id)}`)
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { versies?: InsightVersie[]; fout?: string };
        if (!res.ok) throw new Error(data.fout ?? "Kon de versies niet laden.");
        if (!actief) return;
        setVersies(data.versies ?? []);
        setGekozen((huidig) => huidig ?? data.versies?.[0]?.id ?? null);
      })
      .catch((err) => actief && setFout(err instanceof Error ? err.message : String(err)));
    return () => {
      actief = false;
    };
  }, [campagne.id]);

  useEffect(() => {
    if (!gekozen) return;
    let actief = true;
    setLaadt(true);
    setFout(null);
    fetch(`/api/campagne-insight/analyse?id=${encodeURIComponent(gekozen)}`)
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { analyse?: InsightAnalyse; fout?: string };
        if (!res.ok || !data.analyse) throw new Error(data.fout ?? "Kon de analyse niet laden.");
        if (actief) setAnalyse(data.analyse);
      })
      .catch((err) => actief && setFout(err instanceof Error ? err.message : String(err)))
      .finally(() => actief && setLaadt(false));
    return () => {
      actief = false;
    };
  }, [gekozen]);

  const r = analyse?.resultaat;

  return (
    <div className="flex flex-col gap-5">
      {/* Kop: terug, naam, versiekeuze */}
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
          <Briefing campagne={campagne} analyse={null} />
          <section className="rounded-panel border border-dashed border-line bg-card px-6 py-8 text-center">
            <p className="font-semibold text-ink">Nog geen analyse</p>
            <p className="mx-auto mt-1 max-w-xl text-sm text-ink-muted">
              {campagne.analyseGevraagdOp
                ? "De analyse is aangevraagd. Zeg in Claude Code: “draai de aangevraagde campaign insight-analyses”."
                : `Zeg in Claude Code: “maak een campaign insight-analyse van ${campagne.naam}”. Claude haalt de briefing en de hoofdprompt op, analyseert de data en zet het resultaat hier neer.`}
            </p>
          </section>
        </>
      )}

      {analyse && r && (
        <div className={`flex flex-col gap-5 transition-opacity ${laadt ? "opacity-60" : ""}`}>
          <p className="text-meta text-ink-faint">
            Geanalyseerd op{" "}
            {new Intl.DateTimeFormat("nl-NL", { dateStyle: "long", timeStyle: "short" }).format(new Date(analyse.geanalyseerdOp))}
            {analyse.periodeVan && ` · periode ${looptijdLabel(analyse.periodeVan, analyse.periodeTot)}`}
            {analyse.promptVersie ? ` · hoofdprompt v${analyse.promptVersie}` : " · standaard hoofdprompt"}
          </p>

          {/* 1. Het oordeel */}
          <section className="kaart-accent kaart-omlijst rounded-panel border border-line bg-card px-6 py-5 shadow-card">
            <h2 className="label-theme text-label text-ink-muted">Samenvatting</h2>
            {r.samenvatting.kop && <p className="mt-2 font-sans-w7 text-lg font-bold text-ink">{r.samenvatting.kop}</p>}
            {r.samenvatting.tekst && (
              <div className="mt-3 text-sm">
                <Markdown tekst={r.samenvatting.tekst} />
              </div>
            )}
          </section>

          <Briefing campagne={campagne} analyse={analyse} />

          {/* 2. De funnel in één oogopslag */}
          <FunnelStrip stappen={r.funnel} />

          {/* 3. Elke stap van de funnel */}
          {r.secties.map((s, i) => (
            <SectieBlok key={`${s.stap}-${i}`} sectie={s} nummer={i + 1} />
          ))}

          {/* 4. Wat het betekent */}
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
                <h2 className="label-theme mb-3 text-label text-ink-muted">Aanbevelingen</h2>
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

          {/* 5. Verantwoording: wat is aan de campagne toegerekend, en wat ontbreekt */}
          <section className="rounded-panel border border-line bg-card shadow-subtle">
            <header className="border-b border-line-soft px-6 py-4">
              <h2 className="label-theme text-label text-ink-muted">Verantwoording</h2>
              <p className="mt-1 text-meta text-ink-faint">Wat de analyse aan deze campagne heeft toegerekend, en waarom.</p>
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
        </div>
      )}

      {!analyse && laadt && <p className="text-sm text-ink-muted">Analyse laden…</p>}
    </div>
  );
}
