"use client";

import {
  DOEL_STATUS_NAAM,
  LABEL_NAAM,
  TAB_OORDEEL_NAAM,
  type DoelOordeel,
  type DoelStatus,
  type Label,
  type Prioriteit,
  type TabOordeel,
} from "@/lib/marketingAnalyse/types";

/** Kleine onderdelen die de samenvatting, de tabbladen en het overzicht delen. */

const DOEL_KLEUR: Record<DoelStatus, string> = {
  voor: "text-positive",
  "op-koers": "text-positive",
  achter: "text-negative",
  onbekend: "text-ink-muted",
};

/** Hoog rood, middel lichtrood, laag grijs: twee keer rood is eerst oppakken. */
const PRIORITEIT_KLEUR: Record<Prioriteit, string> = {
  hoog: "border-negative/50 text-negative",
  middel: "border-negative/25 text-negative/80",
  laag: "border-line text-ink-muted",
};

const OORDEEL_KLEUR: Record<TabOordeel, string> = {
  goed: "bg-positive",
  aandacht: "bg-orange",
  probleem: "bg-negative",
  "geen-data": "bg-ink-faint/50",
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

export function PrioriteitLabel({ prioriteit }: { prioriteit: Prioriteit }) {
  return (
    <span className={`shrink-0 rounded-control border px-1.5 py-0.5 text-meta ${PRIORITEIT_KLEUR[prioriteit] ?? PRIORITEIT_KLEUR.laag}`}>
      {prioriteit}
    </span>
  );
}

/** Het stipje met het oordeel over een tabblad. Zonder oordeel: niets. */
export function OordeelStip({ oordeel, className = "" }: { oordeel: TabOordeel | null | undefined; className?: string }) {
  if (!oordeel) return null;
  return (
    <span
      role="img"
      aria-label={TAB_OORDEEL_NAAM[oordeel]}
      data-tip={TAB_OORDEEL_NAAM[oordeel]}
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${OORDEEL_KLEUR[oordeel]} ${className}`}
    />
  );
}

const OORDEEL_BADGE: Record<TabOordeel, string> = {
  goed: "bg-positive/10 text-positive",
  aandacht: "bg-orange/15 text-ink",
  probleem: "bg-negative/10 text-negative",
  "geen-data": "bg-surface text-ink-muted",
};

/** Het oordeel als label met tekst, voor de kop van een stap en de funnellijst. */
export function OordeelBadge({ oordeel }: { oordeel: TabOordeel | null | undefined }) {
  if (!oordeel) return null;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 py-0.5 text-meta font-semibold ${OORDEEL_BADGE[oordeel]}`}>
      <OordeelStip oordeel={oordeel} />
      {TAB_OORDEEL_NAAM[oordeel]}
    </span>
  );
}
