"use client";

import { useWizardChatOptional } from "@/components/WizardChatContext";
import type { DatasetQuality } from "@/lib/types";

// Renders an ingestion QualityReport as sentences, not a wall of badges: errors/warnings
// get the rose accent (they need attention), info stays neutral. Mirrors the philosophy
// already used for the fit's quality gate banner in SummaryView.
export function QualityReportView({ quality }: { quality: DatasetQuality | null }) {
  const chat = useWizardChatOptional();
  const issues = quality?.issues ?? [];
  if (issues.length === 0) {
    return <p className="text-sm text-fg-muted">Geen bijzonderheden gevonden.</p>;
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const infos = issues.filter((i) => i.severity === "info");

  return (
    <div className="space-y-3">
      {errors.length > 0 && (
        <div>
          <p className="text-sm font-medium text-danger">
            {errors.length} {errors.length === 1 ? "fout" : "fouten"} — dit blokkeert samenvoegen:
          </p>
          <ul className="mt-1 space-y-1 text-sm text-danger">
            {errors.map((issue, i) => (
              <li key={i}>• {issue.message}</li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div>
          <p className="text-sm font-medium text-fg">
            {warnings.length} {warnings.length === 1 ? "waarschuwing" : "waarschuwingen"} — de moeite van het bekijken waard:
          </p>
          <ul className="mt-1 space-y-1 text-sm text-fg-muted">
            {warnings.map((issue, i) => (
              <li key={i}>• {issue.message}</li>
            ))}
          </ul>
        </div>
      )}
      {infos.length > 0 && (
        <details className="text-sm text-fg-muted">
          <summary className="cursor-pointer select-none">
            {infos.length} info-melding{infos.length === 1 ? "" : "en"}
          </summary>
          <ul className="mt-1 space-y-1 pl-3">
            {infos.map((issue, i) => (
              <li key={i}>• {issue.message}</li>
            ))}
          </ul>
        </details>
      )}
      {chat && (errors.length > 0 || warnings.length > 0) && (
        <button
          onClick={() =>
            chat.sendToChat(
              "Loop het laatste kwaliteitsrapport met me door: wat betekenen de fouten/waarschuwingen concreet, welke moet ik echt oplossen, en stel waar nodig een gecorrigeerd recept voor.",
            )
          }
          className="rounded-lg border border-accent/30 bg-accent-dim px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/20"
        >
          Bespreek dit rapport met de architect
        </button>
      )}
    </div>
  );
}
