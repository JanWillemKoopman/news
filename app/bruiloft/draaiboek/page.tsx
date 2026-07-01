'use client'

import * as React from 'react'
import { AlertTriangle, CalendarClock, Download, Plus, Sparkles } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { PageInfoButton } from '@/components/bruiloft/PageInfoButton'
import { draaiboekInfo } from '@/components/bruiloft/faqContent'
import { AIInsightCard } from '@/components/bruiloft/ai/AIInsightCard'
import { AIVoorgesteldDraaiboekModal } from '@/components/bruiloft/draaiboek/AIVoorgesteldDraaiboekModal'
import { DraaiboekControls, type KolomAantal } from '@/components/bruiloft/draaiboek/DraaiboekControls'
import { DraaiboekColumns, filterItems, type RolFilter } from '@/components/bruiloft/draaiboek/DraaiboekColumns'
import { DraaiboekStatsStrip } from '@/components/bruiloft/draaiboek/DraaiboekStatsStrip'
import { ScheduleItemCard } from '@/components/bruiloft/draaiboek/ScheduleItemCard'
import { ScheduleItemForm } from '@/components/bruiloft/draaiboek/ScheduleItemForm'
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Select,
  useToast,
} from '@/components/bruiloft/ui'
import { downloadCsv } from '@/lib/bruiloft/csv'
import { dagVolgordeMinuten, vergelijkTijd } from '@/lib/bruiloft/draaiboek'
import { canEdit } from '@/lib/bruiloft/permissions'
import { useMediaQuery } from '@/lib/bruiloft/useMediaQuery'
import { DRAAIBOEK_ROLLEN } from '@/lib/bruiloft/options'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { ScheduleItem } from '@/lib/bruiloft/types'

const MIN_PAUZE_MINUTEN = 5

export default function DraaiboekPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const scheduleItems = useBruiloftStore((s) => s.scheduleItems)
  const addScheduleItem = useBruiloftStore((s) => s.addScheduleItem)
  const updateScheduleItem = useBruiloftStore((s) => s.updateScheduleItem)
  const deleteScheduleItem = useBruiloftStore((s) => s.deleteScheduleItem)
  const permissions = useBruiloftStore((s) => s.permissions)
  const { toast } = useToast()

  const kanBewerken = canEdit(permissions, 'draaiboek')
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const [zoek, setZoek] = React.useState('')
  const [kolommen, setKolommen] = React.useState<KolomAantal>(1)
  const [kolomFilters, setKolomFilters] = React.useState<RolFilter[]>(['all', 'all', 'all'])
  const [formOpen, setFormOpen] = React.useState(false)
  const [editItem, setEditItem] = React.useState<ScheduleItem | null>(null)
  const [delItem, setDelItem] = React.useState<ScheduleItem | null>(null)
  const [templateBezig, setTemplateBezig] = React.useState(false)
  const [aiOpen, setAiOpen] = React.useState(false)

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

  // Meerkoloms vergelijken is een desktop-feature; op smallere schermen tonen we
  // altijd één kolom (met het filter van kolom 1).
  const meerkoloms = isDesktop && kolommen >= 2
  const fRol = kolomFilters[0] ?? 'all'

  // Voor de 1-koloms tijdlijn en de export: gefilterd op kolom 1.
  const gesorteerd = filterItems(scheduleItems, fRol, zoek)

  const alleSorteerd = scheduleItems.slice().sort((a, b) => vergelijkTijd(a.tijd, b.tijd))
  const defaultTijdNieuw = alleSorteerd.at(-1)?.eindtijd ?? ''

  const openNieuw = () => {
    setEditItem(null)
    setFormOpen(true)
  }
  const openBewerk = (s: ScheduleItem) => {
    setEditItem(s)
    setFormOpen(true)
  }

  // In de meerkoloms-weergave exporteren we het volledige schema; in 1-koloms
  // de huidige (per-betrokkene gefilterde) lijst.
  const exportLijst = meerkoloms ? alleSorteerd : gesorteerd
  const exportRol = meerkoloms ? 'all' : fRol

  const exporteer = () => {
    try {
      downloadCsv(
        exportRol === 'all' ? 'draaiboek.csv' : `draaiboek-${exportRol}.csv`,
        ['Tijd', 'Einde', 'Titel', 'Locatie', 'Omschrijving', 'Betrokkenen'],
        exportLijst.map((s, idx) => [
          s.tijd,
          s.eindtijd || exportLijst[idx + 1]?.tijd || '',
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

  const setKolomFilter = (index: number, rol: RolFilter) =>
    setKolomFilters((prev) => {
      const next = prev.slice()
      next[index] = rol
      return next
    })

  return (
    <div className="mx-auto max-w-6xl pb-24 min-h-screen">
      <PageHeader
        titel="Draaiboek"
        info={<PageInfoButton {...draaiboekInfo} />}
        primaryActie={
          kanBewerken ? (
            <Button onClick={openNieuw}>
              <Plus className="h-4 w-4" /> Onderdeel toevoegen
            </Button>
          ) : null
        }
        meerActies={[
          ...(kanBewerken ? [{ label: 'AI-draaiboek', icon: Sparkles, onClick: () => setAiOpen(true) }] : []),
          { label: 'Exporteer draaiboek', icon: Download, onClick: exporteer, disabled: exportLijst.length === 0 },
        ]}
        fab={kanBewerken ? { label: 'Onderdeel toevoegen', onClick: openNieuw } : undefined}
      />

      <AIInsightCard sectie="/bruiloft/draaiboek" />

      {/* Stats strip — altijd full-width, net als de andere planning-pagina's */}
      {scheduleItems.length > 0 && (
        <DraaiboekStatsStrip items={scheduleItems} minPauze={MIN_PAUZE_MINUTEN} />
      )}

      {/* Besturingsbalk: globale zoek + kolomkeuze (kolomkeuze alleen op desktop) */}
      {scheduleItems.length > 0 && (
        <DraaiboekControls
          zoek={zoek}
          onZoekChange={setZoek}
          kolommen={kolommen}
          onKolommenChange={setKolommen}
        />
      )}

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
      ) : meerkoloms ? (
        <DraaiboekColumns
          items={scheduleItems}
          kolommen={kolommen}
          kolomFilters={kolomFilters}
          zoek={zoek}
          kanBewerken={kanBewerken}
          onEdit={openBewerk}
          onDelete={setDelItem}
          onFilterChange={setKolomFilter}
        />
      ) : (
        <div>
          {/* Categorie-filter boven de (enige) kolom */}
          <div className="mb-3 max-w-xs">
            <Select
              value={fRol}
              onChange={(e) => setKolomFilter(0, e.target.value as RolFilter)}
              className="w-full"
              aria-label="Filter draaiboek op betrokkene"
            >
              <option value="all">Hele draaiboek</option>
              {DRAAIBOEK_ROLLEN.map((r) => (
                <option key={r} value={r}>
                  Alleen {r}
                </option>
              ))}
            </Select>
          </div>

          {gesorteerd.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              titel="Niets voor deze betrokkene"
              beschrijving="Geen onderdelen komen overeen met het huidige filter."
              actie={
                <Button variant="outline" size="sm" onClick={() => setKolomFilter(0, 'all')}>
                  Wis filter
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {gesorteerd.map((s, idx) => {
                const prev = idx > 0 ? gesorteerd[idx - 1] : null
                const gapMinuten = prev
                  ? dagVolgordeMinuten(s.tijd) - dagVolgordeMinuten(prev.eindtijd || prev.tijd)
                  : 0
                const isOverlap = idx > 0 && gapMinuten < 0

                return (
                  <React.Fragment key={s.id}>
                    {isOverlap ? (
                      <div className="flex items-center gap-3 py-1">
                        <div className="h-px flex-1 bg-rose-200" />
                        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-rose-600">
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
                        <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                          {gapMinuten >= 60
                            ? `${Math.floor(gapMinuten / 60)}u${gapMinuten % 60 > 0 ? ` ${gapMinuten % 60}min` : ''}`
                            : `${gapMinuten}min`}{' '}
                          pauze
                        </span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    ) : null}
                    <ScheduleItemCard
                      item={s}
                      kanBewerken={kanBewerken}
                      onEdit={openBewerk}
                      onDelete={setDelItem}
                    />
                  </React.Fragment>
                )
              })}
            </div>
          )}
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

      <AIVoorgesteldDraaiboekModal
        open={aiOpen}
        onOpenChange={setAiOpen}
        scheduleItems={scheduleItems}
        wedding={wedding}
        onConfirm={async (items) => {
          let toegevoegd = 0
          for (const i of items) {
            try {
              await addScheduleItem({
                tijd: i.tijd,
                eindtijd: i.eindtijd,
                titel: i.titel,
                omschrijving: i.omschrijving,
                locatie: i.locatie,
                betrokkenen: i.betrokkenen as ScheduleItem['betrokkenen'],
              })
              toegevoegd++
            } catch {
              // Ga door met de overige onderdelen; we melden het totaal hieronder.
            }
          }
          toast({
            title:
              toegevoegd > 0
                ? `${toegevoegd} ${toegevoegd === 1 ? 'onderdeel' : 'onderdelen'} toegevoegd`
                : 'Toevoegen mislukt',
            variant: toegevoegd > 0 ? 'success' : 'error',
          })
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
