import Link from "next/link";
import { LogOut } from "lucide-react";
import { GuideModal } from "@/components/GuideModal";
import type { JobStatus, ProjectStatus } from "@/lib/types";

// Modal-stijl paneel: donkere surface, 1px border met lage opacity, zachte shadow.
export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[10px] border border-border bg-surface shadow-panel ${className}`}>{children}</div>
  );
}

// Behouden als alias: bestaande imports van `Card` blijven werken, met dezelfde
// padding-conventie als voorheen (p-5).
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <Panel className={`p-5 ${className}`}>{children}</Panel>;
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  // Felgroen accent met glow-hover — Modal's signature CTA.
  primary:
    "bg-accent text-bg font-medium hover:bg-accent-hover hover:shadow-glow-sm disabled:bg-surface-3 disabled:text-fg-faint disabled:shadow-none",
  secondary:
    "border border-border bg-surface-2 text-fg hover:border-border-strong hover:bg-surface-3 disabled:text-fg-faint",
  ghost: "text-fg-muted hover:bg-surface-2 hover:text-fg",
  danger: "border border-danger/40 bg-danger-dim text-danger hover:bg-danger/20",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm transition-all focus:outline-none focus-visible:shadow-glow-sm disabled:cursor-not-allowed ${BUTTON_VARIANT[variant]} ${className}`}
      {...props}
    />
  );
}

// Button-styled <Link> — for navigation that should look like a Button but can't be a
// <button> (e.g. opening another route from inside a card that's itself a Link).
export function LinkButton({
  variant = "primary",
  className = "",
  ...props
}: React.ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return (
    <Link
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm transition-all focus:outline-none focus-visible:shadow-glow-sm ${BUTTON_VARIANT[variant]} ${className}`}
      {...props}
    />
  );
}

const FIELD_BASE =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-fg-faint transition focus:border-accent/50 focus:outline-none focus:shadow-glow-sm";

export function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${FIELD_BASE} ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${FIELD_BASE} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${FIELD_BASE} ${className}`} {...props} />;
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
        <h1 className="text-xl font-semibold tracking-tight text-fg">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
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

// Groen = goed/klaar, rood = mislukt/aandacht, amber = bezig, neutraal = rest.
const STATUS_TONE: Record<JobStatus | ProjectStatus, string> = {
  draft: "border border-border bg-surface-2 text-fg-muted",
  published: "border border-accent/30 bg-accent-dim text-accent",
  archived: "border border-border bg-surface-2 text-fg-faint",
  queued: "border border-border bg-surface-2 text-fg-muted",
  running: "border border-warn/30 bg-warn-dim text-warn",
  succeeded: "border border-accent/30 bg-accent-dim text-accent",
  failed: "border border-danger/30 bg-danger-dim text-danger",
  cancelled: "border border-border bg-surface-2 text-fg-faint",
};

export function StatusBadge({ status }: { status: JobStatus | ProjectStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[status]}`}
    >
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
  channel_type:
    "Kanaaltype: 'intent' vangt bestaande koopintentie (merkzoekwoorden, marktplaatsen), 'brand' bouwt nieuwe aandacht op (social, display). Bepaalt de verwachting die het model meekrijgt.",
  likelihood:
    "Ruismodel: hoe de wekelijkse schommelingen rond het model worden behandeld. 'Normaal' voor gewone omzet; 'Student-t' als er duidelijke uitschieters zijn; Poisson/negative binomial alleen voor lage tellingen (bv. 5–50 leads per week).",
  trend: "Trend: langzame structurele op- of afbouw van de basislijn, los van marketing. 'Piecewise' mag op enkele punten buigen — alleen bij een duidelijke knik in de historie.",
  seasonality:
    "Seizoen: een terugkerend jaarpatroon in de KPI (bv. kerstdrukte). 52 = jaarlijks patroon op weekdata. Leeg laten = geen seizoenscomponent.",
  saturation_form:
    "Verzadigingsvorm: hoe afnemend rendement wordt gemodelleerd. 'Hill' is flexibel (standaard); 'logistic' is robuuster bij weinig of ruisige data.",
};

// A term with a hover tooltip explaining it — used instead of a link to an external
// glossary, so the explanation stays exactly where the jargon appears.
export function Term({ children, definition }: { children: React.ReactNode; definition: string }) {
  return (
    <span className="group relative inline-flex cursor-help items-center border-b border-dotted border-fg-faint">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 w-56 -translate-x-1/2 rounded-lg border border-border-strong bg-surface-3 px-2.5 py-1.5 text-xs font-normal normal-case leading-snug tracking-normal text-fg opacity-0 shadow-panel transition-opacity group-hover:opacity-100">
        {definition}
      </span>
    </span>
  );
}

export function TopBar({ email, guideMarkdown }: { email: string | null; guideMarkdown?: string }) {
  return (
    // Niet-sticky op mobiel (scrolt gewoon mee — de stappen-nav hieronder blijft daar
    // wél sticky, zie PipelineShell.tsx); vanaf sm weer sticky zoals voorheen.
    <header className="top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-bg/80 px-4 py-3 backdrop-blur sm:sticky sm:px-6">
      <Link href="/projects" className="group flex flex-none items-center gap-2 text-sm font-semibold tracking-tight text-fg">
        <span className="h-4 w-4 rounded-[4px] bg-accent shadow-glow-sm transition group-hover:bg-accent-hover" />
        MMM Wizard
      </Link>
      <div className="flex min-w-0 items-center gap-2 text-sm text-fg-muted sm:gap-3">
        {/* E-mail alleen op ruimere schermen — op mobiel zou het merk + knoppen
            verdringen; truncate vangt lange adressen op tablet af. */}
        <span className="hidden max-w-[16rem] truncate font-mono text-xs text-fg-faint sm:inline">{email}</span>
        {guideMarkdown && <GuideModal markdown={guideMarkdown} />}
        <form action="/auth/signout" method="post">
          {/* Op mobiel alleen het icoon (kleinere knop, geen verdringing); tekst
              vanaf sm weer zichtbaar. */}
          <button
            aria-label="Uitloggen"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-fg-muted transition hover:border-border-strong hover:text-fg sm:px-3"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Uitloggen</span>
          </button>
        </form>
      </div>
    </header>
  );
}
