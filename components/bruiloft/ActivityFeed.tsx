'use client'

import * as React from 'react'

import { Card, CardContent } from '@/components/bruiloft/ui'
import { ongelezenActiviteit, recenteActiviteit } from '@/lib/bruiloft/derived'
import { tijdGeleden } from '@/lib/bruiloft/format'
import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { ActivityEntry } from '@/lib/bruiloft/types'

const ENTITY_LABELS: Record<string, string> = {
  tasks: 'taak',
  guests: 'gast',
  vendors: 'leverancier',
  budget_items: 'budgetregel',
  schedule_items: 'draaiboekpunt',
  tables: 'tafel',
}

const ENTITY_MEERVOUD: Record<string, string> = {
  tasks: 'taken',
  guests: 'gasten',
  vendors: 'leveranciers',
  budget_items: 'budgetregels',
  schedule_items: 'draaiboekpunten',
  tables: 'tafels',
}

function zin(e: ActivityEntry): string {
  const wie = e.actorName || 'Iemand'
  const wat = ENTITY_LABELS[e.entityType] ?? 'item'
  const label = e.label ? `"${e.label}"` : `een ${wat}`
  if (e.action === 'insert') return `${wie} voegde ${label} toe`
  if (e.action === 'delete') return `${wie} verwijderde ${label}`
  return `${wie} wijzigde ${label}`
}

function groepZin(groep: ActivityEntry[]): string {
  const e = groep[0]
  const wie = e.actorName || 'Iemand'
  const wat = ENTITY_MEERVOUD[e.entityType] ?? 'items'
  if (e.action === 'insert') return `${wie} voegde ${groep.length} ${wat} toe`
  if (e.action === 'delete') return `${wie} verwijderde ${groep.length} ${wat}`
  return `${wie} wijzigde ${groep.length} ${wat}`
}

// Vouwt reeksen gelijksoortige acties (zelfde persoon, actie en soort) samen,
// zodat bulkacties — zoals de standaard takenlijst bij onboarding — de feed
// niet overspoelen met tientallen losse regels.
const GROEP_VANAF = 3

function groepeer(entries: ActivityEntry[]): ActivityEntry[][] {
  const groepen: ActivityEntry[][] = []
  for (const e of entries) {
    const vorige = groepen[groepen.length - 1]
    const v = vorige?.[0]
    if (v && v.actorId === e.actorId && v.action === e.action && v.entityType === e.entityType) {
      vorige.push(e)
    } else {
      groepen.push([e])
    }
  }
  return groepen
}

export function ActivityFeed({ toonKop = true }: { toonKop?: boolean }) {
  const activity = useBruiloftStore((s) => s.activity)
  const currentUser = useBruiloftStore((s) => s.currentUser)
  const markActivitySeen = useBruiloftStore((s) => s.markActivitySeen)

  // Snapshot bij binnenkomst: bepaalt de badge én welke items 'nieuw' zijn, en
  // blijft stabiel terwijl je kijkt (ook nadat we hieronder 'gezien' opslaan).
  const seenAtRef = React.useRef(useBruiloftStore.getState().activitySeenAt)
  const userId = currentUser?.id

  React.useEffect(() => {
    markActivitySeen()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ruim ophalen en daarna groeperen, zodat een bulkactie niet de hele feed vult.
  const groepen = groepeer(recenteActiviteit(activity, 60)).slice(0, 15)
  const nieuw = ongelezenActiviteit(activity, seenAtRef.current, userId)

  return (
    <Card>
      <CardContent className="p-6">
        {toonKop || nieuw > 0 ? (
          <div className="mb-4 flex items-center justify-between gap-3">
            {toonKop ? <h2 className="text-xl text-foreground">Recente activiteit</h2> : <span />}
            {nieuw > 0 ? (
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                {nieuw} nieuw
              </span>
            ) : null}
          </div>
        ) : null}

        {groepen.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nog geen activiteit. Wijzigingen van jou en je medeplanners verschijnen hier.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {groepen.flatMap((groep) => {
              const rijen = groep.length >= GROEP_VANAF ? [groep] : groep.map((e) => [e])
              return rijen.map((rij) => {
                const e = rij[0]
                const isNieuw = rij.some(
                  (x) =>
                    x.actorId !== userId &&
                    (!seenAtRef.current || x.createdAt > seenAtRef.current)
                )
                return (
                  <li key={e.id} className="flex items-start gap-3 py-3">
                    <span
                      className={cn(
                        'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                        isNieuw ? 'bg-primary' : 'bg-transparent'
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">
                        {rij.length > 1 ? groepZin(rij) : zin(e)}
                      </p>
                      <p className="text-xs text-muted-foreground">{tijdGeleden(e.createdAt)}</p>
                    </div>
                  </li>
                )
              })
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
