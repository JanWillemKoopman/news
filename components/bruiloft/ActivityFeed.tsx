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

function zin(e: ActivityEntry): string {
  const wie = e.actorName || 'Iemand'
  const wat = ENTITY_LABELS[e.entityType] ?? 'item'
  if (e.action === 'insert') return `${wie} voegde een ${wat} toe`
  if (e.action === 'delete') return `${wie} verwijderde een ${wat}`
  return `${wie} wijzigde een ${wat}`
}

export function ActivityFeed() {
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

  const recent = recenteActiviteit(activity, 15)
  const nieuw = ongelezenActiviteit(activity, seenAtRef.current, userId)

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-serif text-xl text-foreground">Recente activiteit</h2>
          {nieuw > 0 ? (
            <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
              {nieuw} nieuw
            </span>
          ) : null}
        </div>

        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nog geen activiteit. Wijzigingen van jou en je medeplanners verschijnen hier.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((e) => {
              const isNieuw =
                e.actorId !== userId &&
                (!seenAtRef.current || e.createdAt > seenAtRef.current)
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
                      {zin(e)}
                      {e.label ? (
                        <>
                          : <span className="font-medium">{e.label}</span>
                        </>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{tijdGeleden(e.createdAt)}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
