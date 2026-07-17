import Link from "next/link";
import type { JobStatus, ProjectStatus } from "@/lib/types";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-neutral-200 bg-white p-5 ${className}`}>{children}</div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const STATUS_LABEL: Record<JobStatus | ProjectStatus, string> = {
  draft: "Concept",
  published: "Gepubliceerd",
  archived: "Gearchiveerd",
  queued: "In wachtrij",
  running: "Bezig",
  succeeded: "Klaar",
  failed: "Mislukt",
  cancelled: "Geannuleerd",
};

// Neutral by default; rose only when something needs attention (running/failed/draft).
const STATUS_TONE: Record<JobStatus | ProjectStatus, string> = {
  draft: "bg-rose-50 text-rose-700",
  published: "bg-neutral-100 text-neutral-600",
  archived: "bg-neutral-100 text-neutral-500",
  queued: "bg-neutral-100 text-neutral-600",
  running: "bg-rose-50 text-rose-700",
  succeeded: "bg-neutral-100 text-neutral-700",
  failed: "bg-rose-100 text-rose-700",
  cancelled: "bg-neutral-100 text-neutral-500",
};

export function StatusBadge({ status }: { status: JobStatus | ProjectStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

// Short Dutch explanations for the MMM jargon that shows up in result tables — aimed at
// "enige technische kennis", not a statistician: enough to know what to trust, not a
// textbook definition.
export const MMM_GLOSSARY: Record<string, string> = {
  roas: "Return on ad spend: hoeveel KPI (bv. omzet) elke geïnvesteerde euro in dit kanaal naar schatting opleverde.",
  adstock: "Adstock (carry-over): het effect van marketing houdt na de uitgave nog een tijd aan — de half-life is hoe lang het duurt voor de helft van dat effect is weggeëbd.",
  saturation: "Verzadigingspunt: vanaf hier levert extra spend in dit kanaal steeds minder op (afnemend rendement).",
  r2: "R² (verklaarde variantie): hoe goed het model de KPI over tijd volgt. Dichter bij 1 is beter.",
  mape: "MAPE (gemiddelde procentuele afwijking): hoe ver de modelvoorspelling gemiddeld naast de werkelijke KPI zit.",
  coverage: "Dekking: hoe vaak de werkelijke KPI binnen de opgegeven onzekerheidsmarge viel. Zou dicht bij het opgegeven percentage moeten liggen.",
  rhat: "R-hat: een controlegetal of de statistische schatting stabiel is. Boven de 1,05 is een teken dat de uitkomst nog niet betrouwbaar is.",
  divergences: "Divergenties: het aantal keer dat de schattingsmethode vastliep. Een hoog aantal is een teken dat de uitkomst voorzichtig gelezen moet worden.",
};

// A term with a hover tooltip explaining it — used instead of a link to an external
// glossary, so the explanation stays exactly where the jargon appears.
export function Term({ children, definition }: { children: React.ReactNode; definition: string }) {
  return (
    <span className="group relative inline-flex cursor-help items-center border-b border-dotted border-neutral-400">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 w-56 -translate-x-1/2 rounded-lg bg-neutral-900 px-2.5 py-1.5 text-xs font-normal normal-case leading-snug tracking-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {definition}
      </span>
    </span>
  );
}

export function TopBar({ email }: { email: string | null }) {
  return (
    <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
      <Link href="/projects" className="text-sm font-semibold tracking-tight">
        MMM Wizard
      </Link>
      <div className="flex items-center gap-3 text-sm text-neutral-500">
        {email}
        <form action="/auth/signout" method="post">
          <button className="rounded-lg border border-neutral-300 px-3 py-1 text-neutral-700 transition hover:bg-neutral-50">
            Uitloggen
          </button>
        </form>
      </div>
    </header>
  );
}
