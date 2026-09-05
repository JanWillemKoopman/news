"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Haalt de campagnedata opnieuw op vanuit de Google Sheet. De pagina is al
 * force-dynamic (zie app/page.tsx), dus router.refresh() laat de server
 * component gewoon opnieuw draaien en de sheet opnieuw uitlezen.
 */
export default function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-card px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-primary disabled:cursor-wait disabled:opacity-60"
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`}
        aria-hidden="true"
      >
        <path
          d="M16.5 10a6.5 6.5 0 1 1-1.9-4.6M16.5 3v4h-4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {isPending ? "Verversen…" : "Ververs data"}
    </button>
  );
}
