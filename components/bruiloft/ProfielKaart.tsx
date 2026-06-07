'use client'

import { CalendarHeart, Home, MapPin, Pencil, Users, Wallet, AlertCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Button, Card, CardContent, Money } from '@/components/bruiloft/ui'
import { formatDatumNL } from '@/lib/bruiloft/format'
import { ontbrekendeProfielvelden } from '@/lib/bruiloft/profiel'
import type { Wedding } from '@/lib/bruiloft/types'

interface ProfielKaartProps {
  wedding: Wedding
  onBewerk: () => void
}

// "Onze gegevens": de essentiële profielgegevens prominent op het overzicht,
// met een subtiele hint wanneer er nog iets ontbreekt.
export function ProfielKaart({ wedding, onBewerk }: ProfielKaartProps) {
  const ontbreekt = ontbrekendeProfielvelden(wedding)

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Onze gegevens</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              De basisgegevens van jullie bruiloft.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onBewerk} className="shrink-0">
            <Pencil className="h-4 w-4" /> Bewerken
          </Button>
        </div>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <Regel
            icon={Users}
            label="Bruidspaar"
            waarde={`${wedding.partner1Naam} & ${wedding.partner2Naam}`}
          />
          <Regel
            icon={CalendarHeart}
            label="Trouwdatum"
            waarde={wedding.trouwdatum ? formatDatumNL(wedding.trouwdatum) : null}
          />
          <Regel icon={Home} label="Woonplaats" waarde={wedding.woonplaats || null} />
          <Regel icon={MapPin} label="Trouwlocatie" waarde={wedding.locatie || null} />
          <Regel
            icon={Wallet}
            label="Totaalbudget"
            waarde={<Money bedrag={wedding.totaalBudget} />}
          />
        </dl>

        {ontbreekt.length > 0 ? (
          <button
            type="button"
            onClick={onBewerk}
            className="mt-4 flex w-full items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-left text-sm text-rose-800 transition-colors hover:bg-rose-100"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <span>
              Nog aan te vullen: {ontbreekt.map((v) => v.label.toLowerCase()).join(', ')}.
            </span>
          </button>
        ) : null}
      </CardContent>
    </Card>
  )
}

function Regel({
  icon: Icon,
  label,
  waarde,
}: {
  icon: LucideIcon
  label: string
  waarde: React.ReactNode | null
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <dt className="sr-only">{label}</dt>
      <dd className="min-w-0 truncate">
        <span className="text-xs text-muted-foreground">{label}: </span>
        {waarde != null ? (
          <span className="font-medium text-foreground">{waarde}</span>
        ) : (
          <span className="italic text-muted-foreground">nog niet ingevuld</span>
        )}
      </dd>
    </div>
  )
}
