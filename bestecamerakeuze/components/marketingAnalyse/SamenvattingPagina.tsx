"use client";

import { useEffect, useState } from "react";
import Markdown from "@/components/chat/Markdown";
import { IconChevronDown } from "@/components/icons";
import { OordeelBadge, PrioriteitLabel } from "@/components/marketingAnalyse/onderdelen";
import {
  datumKort,
  formatWaarde,
  sorteerOpPrioriteit,
  voortgangVanAnalyse,
  type AnalyseTab,
  type BudgetTempo,
} from "@/lib/marketingAnalyse/rekenen";
import { DOEL_STATUS_NAAM, type DoelStatus, type MaActieKlaar, type MaAnalyse, type MaResultaat } from "@/lib/marketingAnalyse/types";

const KAART = "rounded-panel border border-line bg-card shadow-subtle";

const DOEL_KLEUR: Record<DoelStatus, string> = {
  voor: "text-positive",
  "op-koers": "text-positive",
  achter: "text-negative",
  onbekend: "text-ink-muted",
};

const TEMPO: Record<BudgetTempo, { naam: string; kleur: string }> = {
  "op-schema": { naam: "Op schema", kleur: "text-positive" },
  "te-snel": { naam: "Gaat sneller dan de looptijd", kleur: "text-negative" },
  "te-langzaam": { naam: "Gaat langzamer dan de looptijd", kleur: "text-ink-muted" },
};

/** Een balk met wat er bereikt is, en een streep voor het verstreken deel van de looptijd. */
function Meter({
  label,
  status,
  statusKleur,
  waarde,
  van,
  pct,
  tijdPct,
  toelichting,
}: {
  label: string;
  status: string | null;
  statusKleur: string;
  waarde: string;
  van: string;
  pct: number | null;
  tijdPct: number | null;
  toelichting: string | null;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-ink-muted">{label}</span>
        {status && <span className={`text-meta font-semibold ${statusKleur}`}>{status}</span>}
      </div>
      <p className="mt-0.5 font-sans-w7 text-xl font-bold tabular-nums text-ink">
        {waarde} <span className="text-sm font-normal text-ink-muted">{van}</span>
      </p>
      <div className="relative mt-2 h-2 rounded-pill bg-surface">
        {pct !== null && <div className="absolute inset-y-0 left-0 rounded-pill bg-primary" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />}
        {tijdPct !== null && (
          <div
            title="Verstreken deel van de looptijd"
            className="absolute -bottom-1 -top-1 w-0.5 bg-ink"
            style={{ left: `calc(${Math.min(100, Math.max(0, tijdPct))}% - 1px)` }}
          />
        )}
      </div>
      {toelichting && <p className="mt-1.5 text-meta text-ink-muted">{toelichting}</p>}
    </div>
  );
}

/** Acties afvinken: gedeeld voor het hele team (migratie 0051). */
function useAfgevinkt(versieId: string) {
  const [afgevinkt, setAfgevinkt] = useState<Map<string, MaActieKlaar>>(new Map());
  const [fout, setFout] = useState<string | null>(null);
  const basis = `/api/marketing-analyse/acties?versie=${encodeURIComponent(versieId)}`;
  const zet = (lijst: MaActieKlaar[] | undefined) => setAfgevinkt(new Map((lijst ?? []).map((a) => [a.actie, a])));

  useEffect(() => {
    let actief = true;
    fetch(basis)
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { afgevinkt?: MaActieKlaar[]; fout?: string };
        if (!res.ok) throw new Error(data.fout ?? "Kon de afgevinkte acties niet laden.");
        if (actief) zet(data.afgevinkt);
      })
      .catch((err) => actief && setFout(err instanceof Error ? err.message : String(err)));
    return () => {
      actief = false;
    };
  }, [basis]);

  async function wissel(actie: string) {
    const klaar = !afgevinkt.has(actie);
    setFout(null);
    setAfgevinkt((huidig) => {
      const nieuw = new Map(huidig);
      if (klaar) nieuw.set(actie, { actie, afgevinktOp: new Date().toISOString(), door: null });
      else nieuw.delete(actie);
      return nieuw;
    });
    const res = await fetch(basis, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actie, klaar }),
    });
    const data = (await res.json().catch(() => ({}))) as { afgevinkt?: MaActieKlaar[]; fout?: string };
    if (!res.ok) {
      setFout(data.fout ?? "Afvinken is niet gelukt.");
      setAfgevinkt((huidig) => {
        const terug = new Map(huidig);
        if (klaar) terug.delete(actie);
        return terug;
      });
      return;
    }
    zet(data.afgevinkt);
  }

  return { afgevinkt, wissel, fout };
}

/**
 * De eerste pagina van een analyse: de conclusie met de voortgang tegen doel en budget, wat
 * aandacht vraagt, wat nu te doen (af te vinken door het team) en de hele funnel in één lijst.
 */
export default function SamenvattingPagina({
  analyse,
  resultaat: r,
  tabs,
  onKies,
}: {
  analyse: MaAnalyse;
  resultaat: MaResultaat;
  tabs: AnalyseTab[];
  onKies: (sleutel: string) => void;
}) {
  const [toelichtingOpen, setToelichtingOpen] = useState(false);
  const { afgevinkt, wissel, fout } = useAfgevinkt(analyse.id);
  const rapportage = analyse.briefing.formulier === "rapportage";
  const v = voortgangVanAnalyse(analyse);
  const tabPerSleutel = new Map(tabs.map((t) => [t.sleutel, t]));
  const nummer = new Map(tabs.map((t, i) => [t.sleutel, i + 1]));
  const problemen = tabs.filter((t) => t.oordeel === "probleem");

  // De acties houden hun plek in de opgeslagen lijst als sleutel; getoond op prioriteit.
  const acties = sorteerOpPrioriteit(
    (r.aanbevelingen ?? []).map((a, i) => ({ ...a, sleutel: `geheel-${i}` })),
    (a) => a.prioriteit,
  );
  const aantalKlaar = acties.filter((a) => afgevinkt.has(a.sleutel)).length;
  const stappenMetActies = tabs
    .map((t) => ({ tab: t, aantal: t.secties.reduce((n, s) => n + (s.acties?.length ?? 0), 0) }))
    .filter((x) => x.aantal > 0);

  const metMeters = !rapportage && (v.doelLeads !== null || v.budget !== null);

  return (
    <div className="flex flex-col gap-5">
      <section className={`${KAART} flex gap-8 px-8 py-7`}>
        <div className="min-w-0 flex-[3]">
          <h2 className="label-theme text-label text-ink-muted">Conclusie</h2>
          {r.samenvatting.kop && <p className="mt-2 max-w-[60ch] font-sans-w7 text-xl font-bold leading-snug text-ink">{r.samenvatting.kop}</p>}
          {r.samenvatting.regels.length > 0 && (
            <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm text-ink">
              {r.samenvatting.regels.map((regel, i) => (
                <li key={i}>{regel}</li>
              ))}
            </ul>
          )}
          {r.formaat === 1 && (r.inzichten?.length ?? 0) > 0 && (
            <ul className="mt-4 flex flex-col gap-2 border-t border-line-soft pt-4">
              {r.inzichten?.map((z, i) => (
                <li key={i} className="text-sm">
                  <span className="font-semibold text-ink">{z.titel}</span>
                  <span className="text-ink-muted"> {z.toelichting}</span>
                </li>
              ))}
            </ul>
          )}
          {r.samenvatting.tekst && (
            <div className="mt-4 border-t border-line-soft pt-3">
              <button
                type="button"
                onClick={() => setToelichtingOpen((x) => !x)}
                aria-expanded={toelichtingOpen}
                className="flex items-center gap-1.5 text-meta text-ink-muted transition-colors hover:text-ink"
              >
                <IconChevronDown className={`h-3.5 w-3.5 transition-transform duration-[var(--duur-snel)] ease-merk ${toelichtingOpen ? "rotate-180" : ""}`} />
                {toelichtingOpen ? "Toelichting inklappen" : "Lees toelichting"}
              </button>
              {toelichtingOpen && (
                <div className="mt-2 text-sm">
                  <Markdown tekst={r.samenvatting.tekst} />
                </div>
              )}
            </div>
          )}
        </div>

        {(metMeters || r.doel) && (
          <div className="flex min-w-[260px] flex-[2] flex-col gap-6 border-l border-line-soft pl-8">
            {v.dag !== null && v.dagen !== null && (
              <p className="text-meta text-ink-muted">
                Dag {v.dag} van {v.dagen} · stand t/m {analyse.periodeTot ? datumKort(analyse.periodeTot) : "—"}
              </p>
            )}
            {!rapportage && v.doelLeads !== null && (
              <Meter
                label="Doel"
                status={r.doel ? (DOEL_STATUS_NAAM[r.doel.status] ?? null) : null}
                statusKleur={r.doel ? (DOEL_KLEUR[r.doel.status] ?? "text-ink-muted") : "text-ink-muted"}
                waarde={formatWaarde(v.leads)}
                van={`van ${formatWaarde(v.doelLeads)}${v.leadSoort ? ` ${v.leadSoort}` : ""}`}
                pct={v.gehaaldPct}
                tijdPct={v.tijdPct}
                toelichting={v.tijdPct !== null ? `De streep is het verstreken deel van de looptijd (${formatWaarde(v.tijdPct, "procent")}).` : null}
              />
            )}
            {!rapportage && v.budget !== null && (
              <Meter
                label="Budget"
                status={v.tempo ? TEMPO[v.tempo].naam : null}
                statusKleur={v.tempo ? TEMPO[v.tempo].kleur : "text-ink-muted"}
                waarde={formatWaarde(v.kosten, "euro")}
                van={`van ${formatWaarde(v.budget, "euro")}`}
                pct={v.besteedPct}
                tijdPct={v.tijdPct}
                toelichting={v.besteedPct !== null ? `${formatWaarde(v.besteedPct, "procent")} besteed, alleen mediakosten.` : null}
              />
            )}
            {r.doel && (
              <p className="text-sm text-ink-muted">
                {!metMeters && <span className={`font-semibold ${DOEL_KLEUR[r.doel.status] ?? ""}`}>{DOEL_STATUS_NAAM[r.doel.status]}. </span>}
                {r.doel.toelichting}
              </p>
            )}
          </div>
        )}
      </section>

      {problemen.map((t) => (
        <div key={t.sleutel} role="note" className="flex items-start gap-4 rounded-card border border-negative/25 bg-negative/5 px-5 py-4">
          <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-negative text-meta font-bold text-on-primary">
            !
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Probleem bij {t.naam}</p>
            <p className="mt-0.5 text-sm text-ink-muted">{t.secties.find((s) => s.kop)?.kop ?? "Bekijk deze stap."}</p>
          </div>
          <button
            type="button"
            onClick={() => onKies(t.sleutel)}
            className="shrink-0 rounded-button border border-line bg-card px-3.5 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-surface"
          >
            Bekijk {t.naam}
          </button>
        </div>
      ))}

      <section className={KAART}>
        <div className="flex flex-wrap items-baseline justify-between gap-3 px-7 pb-1 pt-5">
          <h2 className="font-sans-w7 text-base font-bold text-ink">{analyse.label === "eind" ? "Lessen en aanbevelingen" : "Wat nu te doen"}</h2>
          {acties.length > 0 && (
            <span className="text-meta text-ink-muted">
              {aantalKlaar} van {acties.length} afgevinkt
            </span>
          )}
        </div>
        {fout && <p className="px-7 text-meta text-negative">{fout}</p>}
        {acties.length === 0 ? (
          <p className="px-7 pb-6 pt-2 text-sm text-ink-muted">Geen overkoepelende acties in deze versie.</p>
        ) : (
          <ol className="flex flex-col px-3 pb-3 pt-1">
            {acties.map((a) => {
              const klaar = afgevinkt.get(a.sleutel);
              const id = `actie-${analyse.id}-${a.sleutel}`;
              return (
                <li key={a.sleutel} className="flex items-start gap-3.5 rounded-card px-4 py-3.5">
                  <input
                    id={id}
                    type="checkbox"
                    checked={!!klaar}
                    onChange={() => wissel(a.sleutel)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <label htmlFor={id} className={`cursor-pointer text-sm font-semibold ${klaar ? "text-ink-faint line-through" : "text-ink"}`}>
                        {a.titel}
                      </label>
                      <PrioriteitLabel prioriteit={a.prioriteit} />
                    </div>
                    {a.toelichting && <p className={`mt-1 text-sm ${klaar ? "text-ink-faint" : "text-ink-muted"}`}>{a.toelichting}</p>}
                    {klaar && (
                      <p className="mt-1 text-meta text-ink-faint">
                        Afgevinkt{klaar.door ? ` door ${klaar.door}` : ""} op {datumKort(klaar.afgevinktOp)}
                      </p>
                    )}
                    {a.tabs && a.tabs.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {a.tabs.map((s) => {
                          const tab = tabPerSleutel.get(s);
                          return tab ? (
                            <button
                              key={s}
                              type="button"
                              onClick={() => onKies(s)}
                              className="whitespace-nowrap rounded-pill border border-line bg-surface-tint px-2.5 py-0.5 text-meta text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
                            >
                              {tab.naam} →
                            </button>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {stappenMetActies.length > 0 && r.formaat !== 1 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line-soft px-7 py-4">
            <span className="text-meta text-ink-muted">Acties per stap:</span>
            {stappenMetActies.map(({ tab, aantal }) => (
              <button
                key={tab.sleutel}
                type="button"
                onClick={() => onKies(tab.sleutel)}
                className="whitespace-nowrap rounded-pill border border-line bg-surface-tint px-2.5 py-0.5 text-meta text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
              >
                {tab.naam} ({aantal})
              </button>
            ))}
          </div>
        )}
      </section>

      {tabs.length > 0 && (
        <section className={`${KAART} overflow-hidden`}>
          <div className="px-7 pb-3 pt-5">
            <h2 className="font-sans-w7 text-base font-bold text-ink">De funnel in één oogopslag</h2>
            <p className="mt-0.5 text-meta text-ink-muted">Elke stap met zijn hoofdgetal en het oordeel. Klik voor de verdieping.</p>
          </div>
          {tabs.map((t) => (
            <button
              key={t.sleutel}
              type="button"
              onClick={() => onKies(t.sleutel)}
              className={`grid w-full grid-cols-[28px_190px_150px_minmax(0,1fr)_16px] items-center gap-4 border-t border-line-soft px-7 py-3.5 text-left transition-colors hover:bg-surface-tint ${
                t.leeg ? "opacity-60" : ""
              }`}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-control bg-surface text-meta font-semibold tabular-nums text-ink-muted">
                {nummer.get(t.sleutel)}
              </span>
              <span className="truncate text-sm font-semibold text-ink">{t.naam}</span>
              <span className="truncate text-sm font-semibold tabular-nums text-ink">
                {t.hoofdcijfer ? formatWaarde(t.hoofdcijfer.waarde, t.hoofdcijfer.eenheid) : "—"}
              </span>
              <span className="flex min-w-0 items-center gap-3">
                <OordeelBadge oordeel={t.oordeel} />
                <span className="truncate text-sm text-ink-muted">{t.secties.find((s) => s.kop)?.kop ?? t.reden ?? ""}</span>
              </span>
              <span aria-hidden="true" className="text-ink-faint">
                ›
              </span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
