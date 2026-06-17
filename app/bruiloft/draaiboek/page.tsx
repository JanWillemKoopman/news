'use client'

import * as React from 'react'
import { AlertTriangle, CalendarClock, Download, MapPin, Pencil, Plus, Search, Trash2, X } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { AIInsightCard } from '@/components/bruiloft/ai/AIInsightCard'
import { DraaiboekStatsStrip } from '@/components/bruiloft/draaiboek/DraaiboekStatsStrip'
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
import { canEdit } from '@/lib/bruiloft/permissions'
import { capFirst } from '@/lib/utils'
import { DRAAIBOEK_ROLLEN } from '@/lib/bruiloft/options'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { ScheduleItem } from '@/lib/bruiloft/types'

const MIN_PAUZE_MINUTEN = 5

function duurLabel(tijd: string, eindtijd: string): string | null {
  if (!tijd || !eindtijd) return null
  const [sh, sm] = tijd.split(':').map(Number)
  const [eh, em] = eindtijd.split(':').map(Number)
  const min = eh * 60 + em - (sh * 60 + sm)
  if (min <= 0) return null
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? (m > 0 ? `${h}u ${m}min` : `${h}u`) : `${min}min`
}

export default function DraaiboekPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const scheduleItems = useBruiloftStore((s) => s.scheduleItems)
  const addScheduleItem = useBruiloftStore((s) => s.addScheduleItem)
  const updateScheduleItem = useBruiloftStore((s) => s.updateScheduleItem)
  const deleteScheduleItem = useBruiloftStore((s) => s.deleteScheduleItem)
  const permissions = useBruiloftStore((s) => s.permissions)
  const { toast } = useToast()

  const kanBewerken = canEdit(permissions, 'draaiboek')

  const [fRol, setFRol] = React.useState('all')
  const [zoek, setZoek] = React.useState('')
  const [formOpen, setFormOpen] = React.useState(false)
  const [editItem, setEditItem] = React.useState<ScheduleItem | null>(null)
  const [delItem, setDelItem] = React.useState<ScheduleItem | null>(null)
  const [templateBezig, setTemplateBezig] = React.useState(false)

  if (!wedding) return null

  const startMetTemplate = async () => {
    if (templateBezig) return
    setTemplateBezig(true)
    const template: { tijd: string; eindtijd: string; titel: string; omschrijving: string; betrokkenen: ScheduleItem['betrokkenen'] }[] = [
      { tijd: '13:30', eindtijd: '14:00', titel: 'Aankomst gasten', omschrijving: 'Ontvangst met koffie en thee.', betrokkenen: ['gasten', 'locatie'] },
      { tijd: '14:00', eindtijd: '15:00', titel: 'Ceremonie', omschrijving: 'Het jawoord en de ringen.', betrokkenen: ['bruidspaar', 'gasten', 'fotograaf'] },
      { tijd: '15:00', eindtijd: '15:30', titel: 'Toost en felicitaties', omschrijving: 'Proosten met alle gasten.', betrokkenen: ['bruidspaar', 'gasten', 'catering'] },
      { tijd: '15:30', eindtijd: '17:00', titel: 'Fotoshoot', omschrijving: "Foto's met familie en vrienden.", betrokkenen: ['bruidspaar', 'fotograaf'] },
      { tijd: '17:00', eindtijd: '18:30', titel: 'Borrel', omschrijving: 'Drankjes en hapjes.', betrokkenen: ['gasten', 'catering'] },
      { tijd: '18:30', eindtijd: '20:30', titel: 'Diner', omschrijving: 'Aan tafel met de daggasten.', betrokkenen: ['bruidspaar', 'gasten', 'catering'] },
      { tijd: '20:30', eindtijd: '21:00', titel: 'Aankomst avondgasten', omschrijving: '', betrokkenen: ['gasten', 'locatie'] },
      { tijd: '21:00', eindtijd: '23:30', titel: 'Openingsdans en feest', omschrijving: 'De eerste dans, daarna dansen.', betrokkenen: ['bruidspaar', 'dj of band'] },
      { tijd: '23:30', eindtijd: '', titel: 'Einde feest en uitzwaaien', omschrijving: '', betrokkenen: ['bruidspaar', 'gasten'] },
    ]
    try {
      for (const item of template) {
        await addScheduleItem({ ...item, locatie: '' })
      }
      toast({ title: 'Standaard dagindeling klaargezet', description: 'Pas tijden en onderdelen aan jullie dag aan.', variant: 'success' })
    } catch {
      toast({ title: 'Klaarzetten mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    } finally {
      setTemplateBezig(false)
    }
  }

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

  const defaultTijdNieuw = gesorteerd.at(-1)?.eindtijd ?? ''

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
          s.eindtijd || gesorteerd[idx + 1]?.tijd || '',
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
    <div className="mx-auto max-w-6xl pb-24 min-h-screen">
      <PageHeader
        titel="Draaiboek"
        beschrijving="Het minuutschema van de trouwdag — filter en exporteer per betrokkene."
        actie={
          <>
            <Button variant="outline" onClick={exporteer} disabled={gesorteerd.length === 0}>
              <Download className="h-4 w-4" /> Exporteer draaiboek
            </Button>
            {kanBewerken && (
              <Button onClick={openNieuw}>
                <Plus className="h-4 w-4" /> Onderdeel toevoegen
              </Button>
            )}
          </>
        }
        fab={kanBewerken ? { label: 'Onderdeel toevoegen', onClick: openNieuw } : undefined}
      />

      <AIInsightCard sectie="/bruiloft/draaiboek" />

      {scheduleItems.length > 0 && (
        <DraaiboekStatsStrip items={scheduleItems} minPauze={MIN_PAUZE_MINUTEN} />
      )}

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
          beschrijving={
            kanBewerken
              ? 'Start met een veelgebruikte dagindeling en pas die aan, of bouw het schema zelf op.'
              : 'Er zijn nog geen onderdelen in het draaiboek.'
          }
          actie={
            kanBewerken ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={startMetTemplate} loading={templateBezig}>
                  <CalendarClock className="h-4 w-4" /> Start met standaard dagindeling
                </Button>
                <Button variant="outline" onClick={openNieuw}>
                  <Plus className="h-4 w-4" /> Zelf opbouwen
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : gesorteerd.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          titel="Niets voor deze betrokkene"
          beschrijving="Geen onderdelen komen overeen met het huidige filter."
          actie={<Button variant="outline" size="sm" onClick={() => setFRol('all')}>Wis filter</Button>}
        />
      ) : (
        <div className="space-y-3">
          {gesorteerd.map((s, idx) => {
            const prev = idx > 0 ? gesorteerd[idx - 1] : null
            const gapMinuten = prev
              ? (() => {
                  const referentieTijd = prev.eindtijd || prev.tijd
                  const [rh, rm] = referentieTijd.split(':').map(Number)
                  const [sh, sm] = s.tijd.split(':').map(Number)
                  return sh * 60 + sm - (rh * 60 + rm)
                })()
              : 0
            const isOverlap = idx > 0 && gapMinuten < 0
            const label = duurLabel(s.tijd, s.eindtijd)

            return (
              <React.Fragment key={s.id}>
                {isOverlap ? (
                  <div className="flex items-center gap-3 py-1">
                    <div className="h-px flex-1 bg-rose-200" />
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600">
                      <AlertTriangle className="h-3 w-3" />
                      {Math.abs(gapMinuten) >= 60
                        ? `Overlap ${Math.floor(Math.abs(gapMinuten) / 60)}u${Math.abs(gapMinuten) % 60 > 0 ? ` ${Math.abs(gapMinuten) % 60}min` : ''}`
                        : `Overlap ${Math.abs(gapMinuten)}min`}
                    </span>
                    <div className="h-px flex-1 bg-rose-200" />
                  </div>
                ) : gapMinuten >= MIN_PAUZE_MINUTEN ? (
                  <div className="flex items-center gap-3 py-1">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">
                      {gapMinuten >= 60
                        ? `${Math.floor(gapMinuten / 60)}u${gapMinuten % 60 > 0 ? ` ${gapMinuten % 60}min` : ''}`
                        : `${gapMinuten}min`}{' '}
                      pauze
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                ) : null}
                <Card>
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="shrink-0 text-center">
                      <span className="text-lg font-semibold tabular-nums text-primary">
                        {s.tijd}
                      </span>
                      {s.eindtijd ? (
                        <p className="text-xs text-muted-foreground tabular-nums">&ndash;&nbsp;{s.eindtijd}</p>
                      ) : null}
                      {label ? (
                        <p className="text-xs text-muted-foreground/60 tabular-nums">{label}</p>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-foreground">{s.titel}</p>
                        {kanBewerken && (
                          <div className="flex shrink-0 gap-1">
                            <Button variant="ghost" size="icon" aria-label="Bewerken" onClick={() => openBewerk(s)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" aria-label="Verwijderen" onClick={() => setDelItem(s)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
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
                              className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                            >
                              {capFirst(r)}
                            </span>
                          ))}
                        </div>
                      ) : null}
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
        defaultTijd={editItem ? undefined : defaultTijdNieuw}
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
