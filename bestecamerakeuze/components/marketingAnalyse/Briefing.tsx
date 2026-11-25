"use client";

import Drawer from "@/components/Drawer";
import { bedrijvenLabel, formatWaarde, looptijdLabel } from "@/lib/marketingAnalyse/rekenen";
import type { MaAnalyse, MaCampagne } from "@/lib/marketingAnalyse/types";

type BriefingVelden = Partial<MaCampagne> & { bedrijf?: string };

/** Bedrijven uit een briefing; versies van vóór migratie 0045 hebben één `bedrijf`. */
function bedrijvenUitBriefing(b: BriefingVelden): string {
  if (b.bedrijven && b.bedrijven.length > 0) return bedrijvenLabel(b.bedrijven);
  return b.bedrijf || "—";
}

/** De velden van een briefing, in vaste volgorde. Lege velden vallen weg, behalve de vaste. */
function briefingRegels(b: BriefingVelden, opzet: string | undefined, rapportage: boolean): [string, string][] {
  if (rapportage) {
    return [
      ["Analyse opzet", opzet || "—"],
      ["Bedrijf", bedrijvenUitBriefing(b)],
      ["Periode", b.periodeTekst || "—"],
    ];
  }
  return [
    ...(opzet ? ([["Analyse opzet", opzet]] as [string, string][]) : []),
    ["Bedrijf", bedrijvenUitBriefing(b)],
    ["Looptijd", looptijdLabel(b.startdatum ?? null, b.einddatum ?? null)],
    ["Totaalbudget", b.budget != null ? formatWaarde(b.budget, "euro") : "—"],
    ["Merk en model", [b.merk, (b.modellen ?? []).join(", ")].filter(Boolean).join(" · ") || "—"],
  ];
}

/** De briefing als los blok (alleen zolang er nog geen analyse is). */
export function Briefing({ b, titel, opzet, rapportage }: { b: BriefingVelden; titel: string; opzet?: string; rapportage: boolean }) {
  return (
    <section className="rounded-panel border border-line bg-card px-6 py-5 shadow-subtle">
      <h2 className="label-theme mb-3 text-label text-ink-muted">{titel}</h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4">
        {briefingRegels(b, opzet, rapportage).map(([label, waarde]) => (
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

/**
 * De briefing zoals hij bij deze versie werd vastgelegd, in een zijbalk die opent vanaf de knop
 * Briefing in de kop van de analysepagina.
 */
export function BriefingZijbalk({ analyse, onSluit, onBewerk }: { analyse: MaAnalyse; onSluit: () => void; onBewerk: () => void }) {
  const b = analyse.briefing;
  const rapportage = b.formulier === "rapportage";
  const tekstVelden: [string, string | null | undefined][] = [
    ["Doel", b.doel],
    ["Omschrijving", b.omschrijving],
    ["Data correctie bij deze versie", b.dataCorrectie],
  ];
  return (
    <Drawer title={`Briefing bij versie ${analyse.versie}`} onClose={onSluit}>
      <dl className="flex flex-col gap-4">
        {briefingRegels(b, b.opzet, rapportage).map(([label, waarde]) => (
          <div key={label}>
            <dt className="text-meta text-ink-faint">{label}</dt>
            <dd className="mt-0.5 text-sm text-ink">{waarde}</dd>
          </div>
        ))}
        {tekstVelden
          .filter(([, waarde]) => waarde && waarde.trim())
          .map(([label, waarde]) => (
            <div key={label}>
              <dt className="text-meta text-ink-faint">{label}</dt>
              <dd className="mt-0.5 whitespace-pre-line text-sm text-ink">{waarde}</dd>
            </div>
          ))}
      </dl>
      <p className="mt-6 border-t border-line-soft pt-4 text-meta text-ink-muted">
        Dit is de briefing van het moment van de analyse. Een wijziging geldt vanaf de volgende versie.{" "}
        <button type="button" onClick={onBewerk} className="text-primary underline-offset-2 hover:underline">
          Briefing bewerken
        </button>
      </p>
    </Drawer>
  );
}
