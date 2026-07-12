'use client'

import { MapPin, Pencil, Trash2 } from 'lucide-react'

import { Button, Card, CardContent } from '@/components/bruiloft/ui'
import { dagVolgordeMinuten } from '@/lib/bruiloft/draaiboek'
import { capFirst } from '@/lib/utils'
import type { ScheduleItem } from '@/lib/bruiloft/types'

export function duurLabel(tijd: string, eindtijd: string): string | null {
  if (!tijd || !eindtijd) return null
  const min = dagVolgordeMinuten(eindtijd) - dagVolgordeMinuten(tijd)
  if (min <= 0) return null
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? (m > 0 ? `${h}u ${m}min` : `${h}u`) : `${min}min`
}

interface ScheduleItemCardProps {
  item: ScheduleItem
  kanBewerken: boolean
  onEdit: (s: ScheduleItem) => void
  onDelete: (s: ScheduleItem) => void
  /** Toon het tijd-blok links in de kaart (1-koloms tijdlijn). In de
   *  meerkoloms rail-weergave staat de tijd in de rail, dus uit. */
  showTime?: boolean
}

export function ScheduleItemCard({
  item: s,
  kanBewerken,
  onEdit,
  onDelete,
  showTime = true,
}: ScheduleItemCardProps) {
  const label = duurLabel(s.tijd, s.eindtijd)

  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-4">
        {showTime ? (
          <div className="w-16 shrink-0 text-center lg:w-20">
            <span className="text-lg font-semibold tabular-nums text-primary lg:text-xl">
              {s.tijd}
            </span>
            {s.eindtijd ? (
              <p className="text-xs text-muted-foreground tabular-nums">&ndash;&nbsp;{s.eindtijd}</p>
            ) : null}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <p className="font-medium text-foreground">{s.titel}</p>
              {s.locatie ? (
                <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {s.locatie}
                </p>
              ) : null}
              {showTime && label ? (
                <p className="text-xs text-muted-foreground/60 tabular-nums">{label}</p>
              ) : null}
              {!showTime && (s.eindtijd || label) ? (
                <p className="text-xs text-muted-foreground tabular-nums">
                  {s.eindtijd ? `tot ${s.eindtijd}` : null}
                  {s.eindtijd && label ? ' · ' : null}
                  {label}
                </p>
              ) : null}
            </div>
            {kanBewerken && (
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Bewerken"
                  onClick={() => onEdit(s)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Verwijderen"
                  onClick={() => onDelete(s)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
          {s.betrokkenen.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {s.betrokkenen.map((r) => (
                <span
                  key={r}
                  className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                >
                  {capFirst(r)}
                </span>
              ))}
            </div>
          ) : null}
          {s.omschrijving ? (
            <p className="mt-1.5 text-sm text-muted-foreground">{s.omschrijving}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
