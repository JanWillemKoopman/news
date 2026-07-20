// A deterministic, zero-cost "is this dataset ready to model?" score computed from the
// merge result already on hand (dataset.preview + dataset.quality) — no AI call, and no
// claim beyond what that data can actually support. Collinearity between channels isn't
// scored here: the preview only carries per-column summaries, not raw values, so that
// check genuinely needs the EDA step's correlation matrix — this points there rather
// than fabricating a number from insufficient data.
import type { Dataset } from "@/lib/types";

export interface DataHealth {
  score: number; // 0-100
  band: "goed" | "redelijk" | "zwak";
  reasons: string[];
}

export function computeDataHealth(dataset: Dataset): DataHealth | null {
  if (!dataset.preview) return null;
  let score = 100;
  const reasons: string[] = [];

  const nWeeks = dataset.n_weeks ?? dataset.preview.n_weeks;
  if (nWeeks != null) {
    if (nWeeks < 26) {
      score -= 30;
      reasons.push(`Maar ${nWeeks} weken data — de onzekerheidsmarges worden breed.`);
    } else if (nWeeks < 52) {
      score -= 10;
      reasons.push(`${nWeeks} weken data — nog geen vol jaar: het jaarseizoen is niet betrouwbaar te schatten.`);
    }
  }

  // Klaar-voor-model: parameters vs weken. Elk spend-kanaal kost meerdere parameters
  // (effect + adstock + saturatie); als vuistregel wil je >= 8 weken per kanaal, en
  // onder de 4 is een fit statistisch zinloos — dat verdict hoort hier, vóór de
  // gebruiker een berekening van minuten start.
  const roles = dataset.column_roles ?? {};
  const nChannels = Object.values(roles).filter((r) => r === "spend").length;
  if (nWeeks != null && nChannels > 0) {
    const weeksPerChannel = nWeeks / nChannels;
    if (weeksPerChannel < 4) {
      score -= 40;
      reasons.push(
        `${nChannels} kanalen op ${nWeeks} weken (${weeksPerChannel.toFixed(1)} wk/kanaal) — te weinig data om de kanalen uit elkaar te houden. Voeg weken toe of laat kanalen samenvoegen.`,
      );
    } else if (weeksPerChannel < 8) {
      score -= 15;
      reasons.push(
        `${nChannels} kanalen op ${nWeeks} weken (${weeksPerChannel.toFixed(1)} wk/kanaal) — krap; verwacht brede onzekerheidsmarges per kanaal.`,
      );
    }
  }

  const usedColumns = Object.values(dataset.preview.summary).filter((s) => s.role != null);
  if (usedColumns.length > 0 && nWeeks) {
    const avgMissingFraction =
      usedColumns.reduce((sum, s) => sum + s.n_missing / nWeeks, 0) / usedColumns.length;
    if (avgMissingFraction > 0.2) {
      score -= 25;
      reasons.push("Gemiddeld meer dan 20% ontbrekende waarden in de gebruikte kolommen.");
    } else if (avgMissingFraction > 0.05) {
      score -= 10;
      reasons.push("Sommige kolommen hebben ontbrekende weken — controleer de 'gaten vullen'-instelling.");
    }
  }

  const issues = dataset.quality?.issues ?? [];
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  if (errors > 0) {
    score -= Math.min(40, errors * 15);
    reasons.push(`${errors} fout${errors === 1 ? "" : "en"} in het kwaliteitsrapport.`);
  }
  if (warnings > 0) {
    score -= Math.min(20, warnings * 5);
    reasons.push(`${warnings} waarschuwing${warnings === 1 ? "" : "en"} in het kwaliteitsrapport.`);
  }

  score = Math.max(0, Math.min(100, score));
  const band: DataHealth["band"] = score >= 80 ? "goed" : score >= 50 ? "redelijk" : "zwak";
  return { score, band, reasons };
}
