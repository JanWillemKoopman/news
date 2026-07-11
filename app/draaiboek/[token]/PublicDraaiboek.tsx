'use client'

import * as React from 'react'
import { MapPin, Printer } from 'lucide-react'

import { duurLabel } from '@/components/bruiloft/draaiboek/ScheduleItemCard'
import { dagVolgordeMinuten, vergelijkTijd } from '@/lib/bruiloft/draaiboek'
import { formatDatumNL } from '@/lib/bruiloft/format'
import { capFirst, cn } from '@/lib/utils'
import type { PublicDraaiboekData, PublicDraaiboekItem } from '@/lib/bruiloft/types'

const MIN_PAUZE_MINUTEN = 5

// Alleen-lezen weergave van het draaiboek voor de ontvanger van de deel-link
// (ceremoniemeester, fotograaf, DJ, locatie). Eén taak: de dag lezen. Filteren
// op je eigen rol en printen zijn de enige twee knoppen; bij printen
// verdwijnen ze (print:hidden) zodat er een schoon A4-schema overblijft.
export function PublicDraaiboek({ data }: { data: PublicDraaiboekData }) {
  const [rol, setRol] = React.useState<string>('')

  const items = React.useMemo(
    () => data.items.slice().sort((a, b) => vergelijkTijd(a.tijd, b.tijd)),
    [data.items]
  )

  // Alleen rollen die daadwerkelijk in het schema voorkomen zijn een filter.
  const rollen = React.useMemo(() => {
    const set = new Set<string>()
    for (const item of items) for (const r of item.betrokkenen) set.add(r)
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'nl'))
  }, [items])

  const gefilterd = rol ? items.filter((i) => i.betrokkenen.includes(rol as never)) : items

  const namen = [data.partner1Naam, data.partner2Naam].filter(Boolean).join(' & ')
  const onderschrift = [
    data.trouwdatum ? formatDatumNL(data.trouwdatum) : '',
    data.locatie,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-10 print:max-w-none print:px-0 print:py-0">
        {/* Kop: wiens dag is dit — leesbaar voor iemand die alleen de link kreeg. */}
        <header className="text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Draaiboek</p>
          <h1 className="mt-1 text-3xl font-medium">{namen || 'Onze trouwdag'}</h1>
          {onderschrift ? (
            <p className="mt-1 text-sm text-muted-foreground">{onderschrift}</p>
          ) : null}
          {rol ? (
            // Op papier moet zichtbaar blijven dát dit een uitsnede is.
            <p className="mt-1 hidden text-sm text-muted-foreground print:block">
              Onderdelen voor: {capFirst(rol)}
            </p>
          ) : null}
        </header>

        {/* Bediening: rolfilter + printen. Verdwijnt op papier. */}
        {items.length > 0 ? (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 print:hidden">
            {rollen.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-1.5" role="group" aria-label="Filter op betrokkene">
                <FilterChip actief={rol === ''} onClick={() => setRol('')}>
                  Alles
                </FilterChip>
                {rollen.map((r) => (
                  <FilterChip key={r} actief={rol === r} onClick={() => setRol(rol === r ? '' : r)}>
                    {capFirst(r)}
                  </FilterChip>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Printer className="h-4 w-4" /> Printen
            </button>
          </div>
        ) : null}

        {/* Het schema zelf. */}
        {items.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Het draaiboek is nog leeg — vraag het bruidspaar om de dagindeling in te vullen.
          </p>
        ) : gefilterd.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Geen onderdelen voor deze betrokkene.
          </p>
        ) : (
          <ol className="mt-8 divide-y divide-border rounded-xl border border-border bg-card shadow-sm print:rounded-none print:border-0 print:shadow-none">
            {gefilterd.map((item, idx) => (
              <PubliekItem
                key={item.id}
                item={item}
                vorige={idx > 0 ? gefilterd[idx - 1] : null}
                toonPauze={rol === ''}
              />
            ))}
          </ol>
        )}

        {/* Bescheiden herkomstregel — ook op papier, zodat de ontvanger weet
            waar dit schema vandaan komt (en de app leert kennen). */}
        <footer className="mt-10 pb-10 text-center text-xs text-muted-foreground">
          Dit draaiboek is gemaakt met{' '}
          <a href="/" className="font-medium text-foreground hover:underline">
            Ons Trouwplan
          </a>
          {' '}— zelf jullie bruiloft plannen is gratis.
        </footer>
      </div>
    </main>
  )
}

function FilterChip({
  actief,
  onClick,
  children,
}: {
  actief: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actief}
      className={cn(
        'rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        actief
          ? 'border-rhino-800 bg-rhino-800 text-white'
          : 'border-input bg-background text-foreground hover:bg-muted'
      )}
    >
      {children}
    </button>
  )
}

function PubliekItem({
  item,
  vorige,
  toonPauze,
}: {
  item: PublicDraaiboekItem
  vorige: PublicDraaiboekItem | null
  toonPauze: boolean
}) {
  const duur = duurLabel(item.tijd, item.eindtijd)
  // Pauze-indicatie alleen in het volledige overzicht: in een rolfilter zitten
  // gaten die geen echte pauzes zijn (andermans onderdelen).
  const pauzeMinuten =
    toonPauze && vorige
      ? dagVolgordeMinuten(item.tijd) - dagVolgordeMinuten(vorige.eindtijd || vorige.tijd)
      : 0

  return (
    <li className="break-inside-avoid">
      {pauzeMinuten >= MIN_PAUZE_MINUTEN ? (
        <p className="border-b border-border bg-muted/30 px-5 py-1 text-center text-xs text-muted-foreground">
          {pauzeMinuten >= 60
            ? `${Math.floor(pauzeMinuten / 60)}u${pauzeMinuten % 60 > 0 ? ` ${pauzeMinuten % 60}min` : ''}`
            : `${pauzeMinuten}min`}{' '}
          pauze
        </p>
      ) : null}
      <div className="flex items-start gap-4 px-5 py-4">
        <div className="w-14 shrink-0 text-right">
          <p className="text-base font-semibold tabular-nums">{item.tijd}</p>
          {item.eindtijd ? (
            <p className="text-xs tabular-nums text-muted-foreground">&ndash;&nbsp;{item.eindtijd}</p>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <p className="font-medium">{item.titel}</p>
            {duur ? <p className="text-xs tabular-nums text-muted-foreground">{duur}</p> : null}
          </div>
          {item.locatie ? (
            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {item.locatie}
            </p>
          ) : null}
          {item.omschrijving ? (
            <p className="mt-1 text-sm text-muted-foreground">{item.omschrijving}</p>
          ) : null}
          {item.betrokkenen.length > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Met: {item.betrokkenen.map(capFirst).join(' · ')}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  )
}
