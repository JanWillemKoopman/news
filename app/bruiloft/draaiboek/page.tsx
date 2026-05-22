'use client'

import * as React from 'react'
import { CalendarClock, Download, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { ScheduleItemForm } from '@/components/bruiloft/draaiboek/ScheduleItemForm'
import {
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  EmptyState,
  Select,
} from '@/components/bruiloft/ui'
import { downloadCsv } from '@/lib/bruiloft/csv'
import { DRAAIBOEK_ROLLEN } from '@/lib/bruiloft/options'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { ScheduleItem } from '@/lib/bruiloft/types'

export default function DraaiboekPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const scheduleItems = useBruiloftStore((s) => s.scheduleItems)
  const addScheduleItem = useBruiloftStore((s) => s.addScheduleItem)
  const updateScheduleItem = useBruiloftStore((s) => s.updateScheduleItem)
  const deleteScheduleItem = useBruiloftStore((s) => s.deleteScheduleItem)

  const [fRol, setFRol] = React.useState('all')
  const [formOpen, setFormOpen] = React.useState(false)
  const [editItem, setEditItem] = React.useState<ScheduleItem | null>(null)
  const [delItem, setDelItem] = React.useState<ScheduleItem | null>(null)

  if (!wedding) return null

  const gesorteerd = scheduleItems
    .filter((s) => fRol === 'all' || s.betrokkenen.includes(fRol as ScheduleItem['betrokkenen'][number]))
    .slice()
    .sort((a, b) => a.tijd.localeCompare(b.tijd))

  const openNieuw = () => {
    setEditItem(null)
    setFormOpen(true)
  }
  const openBewerk = (s: ScheduleItem) => {
    setEditItem(s)
    setFormOpen(true)
  }

  const exporteer = () => {
    downloadCsv(
      fRol === 'all' ? 'draaiboek.csv' : `draaiboek-${fRol}.csv`,
      ['Tijd', 'Titel', 'Locatie', 'Omschrijving', 'Betrokkenen'],
      gesorteerd.map((s) => [
        s.tijd,
        s.titel,
        s.locatie,
        s.omschrijving,
        s.betrokkenen.join(', '),
      ])
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        titel="Draaiboek"
        beschrijving="Het minuutschema van de trouwdag — filter en exporteer per betrokkene."
        actie={
          <>
            <Button variant="outline" onClick={exporteer} disabled={gesorteerd.length === 0}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button onClick={openNieuw}>
              <Plus className="h-4 w-4" /> Onderdeel
            </Button>
          </>
        }
      />

      <div className="mb-6 max-w-xs">
        <Select value={fRol} onChange={(e) => setFRol(e.target.value)}>
          <option value="all">Hele draaiboek</option>
          {DRAAIBOEK_ROLLEN.map((r) => (
            <option key={r} value={r}>
              Alleen {r}
            </option>
          ))}
        </Select>
      </div>

      {scheduleItems.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          titel="Nog geen draaiboek"
          beschrijving="Voeg programmaonderdelen toe om het tijdschema van de dag op te bouwen."
          actie={
            <Button onClick={openNieuw}>
              <Plus className="h-4 w-4" /> Onderdeel toevoegen
            </Button>
          }
        />
      ) : gesorteerd.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          titel="Niets voor deze betrokkene"
          beschrijving="Pas het filter aan of voeg onderdelen toe."
        />
      ) : (
        <div className="space-y-3">
          {gesorteerd.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-start gap-4 p-4">
                <div className="w-14 shrink-0 text-center">
                  <span className="font-serif text-lg font-semibold tabular-nums text-primary">
                    {s.tijd}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{s.titel}</p>
                  {s.locatie ? (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {s.locatie}
                    </p>
                  ) : null}
                  {s.omschrijving ? (
                    <p className="mt-1 text-sm text-muted-foreground">{s.omschrijving}</p>
                  ) : null}
                  {s.betrokkenen.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.betrokkenen.map((r) => (
                        <span
                          key={r}
                          className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium capitalize text-secondary-foreground"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" aria-label="Bewerken" onClick={() => openBewerk(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Verwijderen" onClick={() => setDelItem(s)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ScheduleItemForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editItem}
        onSubmit={(data) => {
          if (editItem) void updateScheduleItem(editItem.id, data)
          else void addScheduleItem(data)
        }}
      />

      <ConfirmDialog
        open={delItem !== null}
        onOpenChange={(o) => !o && setDelItem(null)}
        title="Onderdeel verwijderen?"
        description={delItem ? `Weet je zeker dat je "${delItem.titel}" wilt verwijderen?` : undefined}
        onConfirm={() => delItem && void deleteScheduleItem(delItem.id)}
      />
    </div>
  )
}
