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
