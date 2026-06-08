'use client'

import * as React from 'react'
import { CalendarClock, Download, MapPin, Pencil, Plus, Search, Trash2, X } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { ScheduleItemForm } from '@/components/bruiloft/draaiboek/ScheduleItemForm'
import {
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  EmptyState,
  Input,
  Select,
  useToast,
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
  const { toast } = useToast()

  const [fRol, setFRol] = React.useState('all')
  const [zoek, setZoek] = React.useState('')
  const [formOpen, setFormOpen] = React.useState(false)
  const [editItem, setEditItem] = React.useState<ScheduleItem | null>(null)
  const [delItem, setDelItem] = React.useState<ScheduleItem | null>(null)

  if (!wedding) return null

  const gesorteerd = scheduleItems
    .filter((s) => {
      if (fRol !== 'all' && !s.betrokkenen.includes(fRol as ScheduleItem['betrokkenen'][number])) return false
      if (zoek.trim()) {
        const z = zoek.trim().toLowerCase()
        return (
          s.titel.toLowerCase().includes(z) ||
          s.omschrijving?.toLowerCase().includes(z) ||
          s.locatie?.toLowerCase().includes(z)
        )
      }
      return true
    })
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
    try {
      downloadCsv(
        fRol === 'all' ? 'draaiboek.csv' : `draaiboek-${fRol}.csv`,
        ['Tijd', 'Einde', 'Titel', 'Locatie', 'Omschrijving', 'Betrokkenen'],
        gesorteerd.map((s, idx) => [
          s.tijd,
          gesorteerd[idx + 1]?.tijd ?? '',
          s.titel,
          s.locatie,
          s.omschrijving,
          s.betrokkenen.join(', '),
        ])
      )
      toast({ title: 'Draaiboek geëxporteerd', variant: 'success' })
    } catch {
      toast({ title: 'Export mislukt', variant: 'error' })
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        titel="Draaiboek"
        beschrijving="Het minuutschema van de trouwdag — filter en exporteer per betrokkene."
        actie={
          <>
            <Button variant="outline" onClick={exporteer} disabled={gesorteerd.length === 0}>
              <Download className="h-4 w-4" /> Exporteer draaiboek
            </Button>
            <Button onClick={openNieuw}>
              <Plus className="h-4 w-4" /> Onderdeel toevoegen
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={zoek}
            onChange={(e) => setZoek(e.target.value)}
            placeholder="Zoek in draaiboek..."
            className="pl-9 pr-9"
          />
          {zoek && (
            <button
              type="button"
              onClick={() => setZoek('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={fRol} onChange={(e) => setFRol(e.target.value)} className="w-auto max-w-xs">
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
          {gesorteerd.map((s, idx) => {
            const prev = idx > 0 ? gesorteerd[idx - 1] : null
            const gapMinuten = prev
              ? (() => {
                  const [ph, pm] = prev.tijd.split(':').map(Number)
                  const [sh, sm] = s.tijd.split(':').map(Number)
                  return sh * 60 + sm - (ph * 60 + pm)
                })()
              : 0

            return (
              <React.Fragment key={s.id}>
                {gapMinuten >= 30 && idx > 0 ? (
                  <div className="flex items-center gap-3 py-1">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">
                      {gapMinuten >= 60 ? `${Math.round(gapMinuten / 60)}u` : `${gapMinuten}min`} pauze
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                ) : null}
                <Card>
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="w-14 shrink-0 text-center">
                      <span className="text-lg font-semibold tabular-nums text-primary">
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
              </React.Fragment>
            )
          })}
        </div>
      )}

      <ScheduleItemForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editItem}
        onSubmit={async (data) => {
          try {
            if (editItem) {
              await updateScheduleItem(editItem.id, data)
              toast({ title: 'Onderdeel bijgewerkt', variant: 'success' })
            } else {
              await addScheduleItem(data)
              toast({ title: 'Onderdeel toegevoegd', variant: 'success' })
            }
          } catch {
            toast({ title: 'Opslaan mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
          }
        }}
      />

      <ConfirmDialog
        open={delItem !== null}
        onOpenChange={(o) => !o && setDelItem(null)}
        title="Onderdeel verwijderen?"
        description={delItem ? `Weet je zeker dat je "${delItem.titel}" wilt verwijderen?` : undefined}
        onConfirm={async () => {
          if (!delItem) return
          try {
            await deleteScheduleItem(delItem.id)
            toast({ title: 'Onderdeel verwijderd', variant: 'success' })
          } catch {
            toast({ title: 'Verwijderen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
          }
        }}
      />
    </div>
  )
}
