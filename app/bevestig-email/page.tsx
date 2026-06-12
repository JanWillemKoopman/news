import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Bevestig je e-mailadres — Ons Trouwplan' }

export default function BevestigEmailPage() {
  return (
    <div className="wedding flex min-h-screen items-center justify-center bg-rhino-50 px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-border bg-white p-8 shadow-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <svg
            className="h-8 w-8 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        <h1 className="font-serif text-2xl font-medium text-gray-900">
          Bevestig je e-mailadres
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-500">
          Je hebt je e-mailadres nog niet bevestigd. Klik op de link in de bevestigingsmail
          die we je hebben gestuurd om verder te gaan met je wedding planner.
        </p>
        <p className="mt-2 text-sm text-gray-400">
          Geen mail ontvangen? Controleer je spam-map.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/bruiloft"
            className="flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Toch doorgaan
          </Link>
          <Link
            href="/login"
            className="text-sm text-gray-400 hover:text-gray-600 hover:underline"
          >
            Uitloggen en opnieuw inloggen
          </Link>
        </div>
      </div>
    </div>
  )
}
