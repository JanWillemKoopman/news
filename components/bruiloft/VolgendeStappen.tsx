'use client'

import * as React from 'react'
import Link from 'next/link'
import { CheckCircle2, ChevronRight, Sparkles } from 'lucide-react'

import { canEdit } from '@/lib/bruiloft/permissions'
import { dagenTot } from '@/lib/bruiloft/format'
import type { NextStep } from '@/lib/bruiloft/guidance'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { Button, Card, CardContent } from '@/components/bruiloft/ui'

interface VolgendeStappenProps {
  steps: NextStep[]
  trouwdatum: string
}

const URGENTIE_STIJL: Record<NextStep['urgentie'], string> = {
  kritiek: 'bg-rose-100 text-rose-700',
  binnenkort: 'bg-amber-100 text-amber-700',
  normaal: 'bg-muted text-muted-foreground',
}

const URGENTIE_LABEL: Record<NextStep['urgentie'], string> = {
  kritiek: 'Dringend',
  binnenkort: 'Binnenkort',
  normaal: 'Plannen',
}

export function VolgendeStappen({ steps, trouwdatum }: VolgendeStappenProps) {
  const updateTask = useBruiloftStore((s) => s.updateTask)
  const permissions = useBruiloftStore((s) => s.permissions)
  const mayEdit = canEdit(permissions, 'taken')
  const [bezig, setBezig] = React.useState<string | null>(null)

  const top = steps.slice(0, 3)
  const dagen = dagenTot(trouwdatum)

  async function afronden(taskId: string) {
    if (bezig) return
    setBezig(taskId)
    try {
      await updateTask(taskId, { status: 'klaar' })
    } finally {
      setBezig(null)
    }
  }

  return (
    <Card className="border-rhino-100">
      <CardContent className="p-6">
        <div className="mb-5 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-foreground" />
          <h2 className="text-2xl font-medium text-foreground">Advies om nu te doen</h2>
        </div>

        {top.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            {dagen < 0
              ? 'Gefeliciteerd met jullie huwelijk! Nog een paar dingen om af te ronden.'
              : 'Jullie liggen op koers — niets dringends nu.'}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {top.map((stap) => (
              <li key={stap.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${URGENTIE_STIJL[stap.urgentie]}`}
                    >
                      {URGENTIE_LABEL[stap.urgentie]}
                    </span>
                  </div>
                  <p className="font-medium text-foreground">{stap.titel}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{stap.omschrijving}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {stap.bron === 'taak' && mayEdit && stap.taskId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => afronden(stap.taskId!)}
                      disabled={bezig === stap.taskId}
                      className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Afronden
                    </Button>
                  )}
                  <Link
                    href={stap.href}
                    className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-700"
                  >
                    Bekijken
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
