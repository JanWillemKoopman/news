'use client'

// Titel & omschrijving van de trouwwebsite (website v3). De site bestaat
// altijd uit precies één pagina — geen paginabeheer meer (toevoegen,
// herordenen, verwijderen); alleen de titel/omschrijving die gasten zien
// wanneer ze de link openen of delen blijft instelbaar.

import { ChevronDown, Type } from 'lucide-react'
import * as React from 'react'

import { Input } from '@/components/bruiloft/ui'
import { cn } from '@/lib/utils'
import type { WebsitePage } from '@/lib/bruiloft/websiteBlocks'

// Kleine debounce voor de velden: voorkomt een database-schrijf per
// toetsaanslag.
function useGedebouncedVeld(waarde: string, onWijzig: (v: string) => void, vertraging = 500) {
  const [lokaal, setLokaal] = React.useState(waarde)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  React.useEffect(() => setLokaal(waarde), [waarde])
  function onChange(v: string) {
    setLokaal(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onWijzig(v), vertraging)
  }
  return [lokaal, onChange] as const
}

interface Props {
  pagina: WebsitePage
  onWijzig: (patch: { seoTitel?: string; seoOmschrijving?: string }) => void
}

export function PaginaInstellingen({ pagina, onWijzig }: Props) {
  const [open, setOpen] = React.useState(false)
  const [seoTitel, onSeoTitelChange] = useGedebouncedVeld(pagina.seoTitel, (v) => onWijzig({ seoTitel: v }))
  const [seoOmschrijving, onSeoOmschrijvingChange] = useGedebouncedVeld(pagina.seoOmschrijving, (v) =>
    onWijzig({ seoOmschrijving: v })
  )

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/30 sm:px-5"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Type className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Titel voor delen</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {pagina.seoTitel || 'Standaard: jullie namen'}
          </p>
        </div>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border px-4 py-5 sm:px-5 sm:py-6">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Titel</p>
            <p className="mb-2.5 text-xs text-muted-foreground">
              Deze titel zien gasten wanneer ze de link openen of delen (bijv. in WhatsApp of Google). Leeg =
              jullie namen.
            </p>
            <Input
              value={seoTitel}
              onChange={(e) => onSeoTitelChange(e.target.value)}
              placeholder="Bijv. Jan & Anna trouwen — 12 juni 2027"
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Omschrijving</p>
            <p className="mb-2.5 text-xs text-muted-foreground">
              Optioneel: korte tekst onder de titel in zoekresultaten en gedeelde links.
            </p>
            <Input
              value={seoOmschrijving}
              onChange={(e) => onSeoOmschrijvingChange(e.target.value)}
              placeholder="Korte omschrijving voor zoekresultaten en gedeelde links…"
            />
          </div>
        </div>
      )}
    </div>
  )
}
