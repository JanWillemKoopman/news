"use client";

import { AlertTriangle, Info, MessageCircle, Search } from "lucide-react";
import { useWizardChat } from "@/components/WizardChatContext";
import type { DataInspection, InspectionFinding } from "@/lib/types";

// De bevindingen van de diepe data-inspectie, eindelijk zichtbaar voor de gebruiker.
// Claude verkent de echte CSV's met pandas en produceert gestructureerde bevindingen
// (soort, kolom, detail, suggestie, ernst) — die gingen tot nu toe alleen naar de
// AI-context, terwijl juist de analist ze nodig heeft om te beslissen. Transparantie:
// wat heeft Claude gevonden, hoe erg is het, en wat stelt hij voor.

const KIND_LABEL: Record<InspectionFinding["kind"], string> = {
  outlier: "Uitschieter",
  level_shift: "Niveausprong",
  seasonality: "Seizoen",
  collinearity: "Samenhang",
  gap: "Gat",
  trend: "Trend",
  distribution: "Verdeling",
  other: "Overig",
};

const SEVERITY_ORDER: InspectionFinding["severity"][] = ["belangrijk", "let_op", "info"];
const SEVERITY_LABEL: Record<InspectionFinding["severity"], string> = {
  belangrijk: "Belangrijk",
  let_op: "Let op",
  info: "Ter info",
};

function SeverityIcon({ severity }: { severity: InspectionFinding["severity"] }) {
  if (severity === "belangrijk") return <AlertTriangle className="h-3.5 w-3.5 flex-none text-danger" />;
  if (severity === "let_op") return <AlertTriangle className="h-3.5 w-3.5 flex-none text-warn" />;
  return <Info className="h-3.5 w-3.5 flex-none text-fg-faint" />;
}

function FindingCard({ finding }: { finding: InspectionFinding }) {
  const { sendToChat } = useWizardChat();
  return (
    <div
      className={`rounded-lg border p-2.5 text-xs ${
        finding.severity === "belangrijk" ? "border-danger/40" : finding.severity === "let_op" ? "border-warn/40" : "border-border"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <SeverityIcon severity={finding.severity} />
        <span className="font-medium text-fg">{KIND_LABEL[finding.kind]}</span>
        {finding.column && (
          <span className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-fg-muted">
            {finding.column}
          </span>
        )}
      </div>
      <p className="mt-1 text-fg-muted">{finding.detail}</p>
      {finding.suggestion && (
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 rounded bg-accent-dim/60 px-2 py-1.5">
          <p className="text-accent">Voorstel: {finding.suggestion}</p>
          <button
            onClick={() =>
              sendToChat(
                `Uit de diepe data-inspectie kwam deze bevinding${finding.column ? ` over kolom "${finding.column}"` : ""}: "${finding.detail}" met als suggestie: "${finding.suggestion}". Werk dit uit tot een concreet voorstel dat ik kan overnemen.`,
              )
            }
            className="inline-flex flex-none items-center gap-1 rounded border border-accent/40 px-2 py-0.5 text-[11px] font-medium text-accent hover:bg-accent/20"
          >
            <MessageCircle className="h-3 w-3" />
            Werk uit in de chat
          </button>
        </div>
      )}
    </div>
  );
}

export function InspectionFindings({ inspection }: { inspection: DataInspection | null }) {
  if (!inspection || (!inspection.findings?.length && !inspection.narrative)) return null;
  const findings = inspection.findings ?? [];
  const date = new Date(inspection.created_at).toLocaleString("nl-NL", { dateStyle: "medium", timeStyle: "short" });

  return (
    <details className="rounded-lg border border-border p-3" open={findings.some((f) => f.severity !== "info")}>
      <summary className="cursor-pointer select-none text-sm font-medium text-fg">
        <Search className="mr-1.5 inline h-3.5 w-3.5 text-fg-muted" />
        Bevindingen van de diepe inspectie{findings.length > 0 ? ` — ${findings.length}` : ""}
        <span className="ml-2 font-normal text-fg-muted">
          {date} · {inspection.scope === "master" ? "definitieve dataset" : "ruwe bronnen"}
        </span>
      </summary>
      <div className="mt-3 space-y-3">
        {inspection.narrative && (
          <p className="rounded-lg bg-surface-2 p-2.5 text-xs leading-relaxed text-fg-muted">{inspection.narrative}</p>
        )}
        {SEVERITY_ORDER.map((sev) => {
          const group = findings.filter((f) => f.severity === sev);
          if (group.length === 0) return null;
          return (
            <div key={sev} className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-fg-faint">{SEVERITY_LABEL[sev]}</p>
              {group.map((f, i) => (
                <FindingCard key={i} finding={f} />
              ))}
            </div>
          );
        })}
      </div>
    </details>
  );
}
