'use client'

import { CalendarDays, Heart, MapPin } from 'lucide-react'
import * as React from 'react'

import { useBruiloftStore } from '@/store/bruiloftStore'

function formatDatum(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function WeddingPicker() {
  const weddings = useBruiloftStore((s) => s.weddings)
  const selectWedding = useBruiloftStore((s) => s.selectWedding)
  const [loading, setLoading] = React.useState<string | null>(null)

  async function pick(id: string) {
    setLoading(id)
    await selectWedding(id)
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <Heart className="h-6 w-6" />
          </span>
          <h1 className="mt-4 font-serif text-2xl font-medium text-rhino-900">
            Welk trouwplan wil je openen?
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Je hebt toegang tot meerdere trouwplannen. Kies er één om mee verder te gaan.
          </p>
        </div>

        <ul className="space-y-3">
          {weddings.map((w) => {
            const busy = loading === w.id
            return (
              <li key={w.id}>
                <button
                  type="button"
                  disabled={loading !== null}
                  onClick={() => pick(w.id)}
                  className="group flex w-full items-start gap-4 rounded-xl border border-border bg-white px-5 py-4 text-left shadow-sm transition-all hover:border-rose-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 transition-colors group-hover:bg-rose-100">
                    {busy ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-300 border-t-rose-600" />
                    ) : (
                      <Heart className="h-4 w-4" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-rhino-900">
                      {w.partner1Naam} &amp; {w.partner2Naam}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                      {w.trouwdatum ? (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <CalendarDays className="h-3 w-3 shrink-0" />
                          {formatDatum(w.trouwdatum)}
                        </span>
                      ) : null}
                      {w.locatie ? (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{w.locatie}</span>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <span className="mt-1 text-xs font-medium text-rose-600 opacity-0 transition-opacity group-hover:opacity-100">
                    Openen →
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
