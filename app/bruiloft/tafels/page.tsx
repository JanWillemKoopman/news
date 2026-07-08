'use client'

import * as React from 'react'
import { AlertTriangle, Armchair, LayoutGrid, Map, Plus, Printer } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { PageInfoButton } from '@/components/bruiloft/PageInfoButton'
import { tafelsInfo } from '@/components/bruiloft/faqContent'
import { FloorPlan, type TafelPatch } from '@/components/bruiloft/tafels/FloorPlan'
import { SeatingBoard } from '@/components/bruiloft/tafels/SeatingBoard'
import { TableForm } from '@/components/bruiloft/tafels/TableForm'
import {
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  EmptyState,
  useToast,
} from '@/components/bruiloft/ui'
import { cn } from '@/lib/utils'
import { canEdit } from '@/lib/bruiloft/permissions'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { SeatUpdate } from '@/lib/bruiloft/seating'
import type { Table } from '@/lib/bruiloft/types'

const WEERGAVE_KEY = 'bruiloft-tafels-weergave'

export default function TafelsPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const guests = useBruiloftStore((s) => s.guests)
  const tables = useBruiloftStore((s) => s.tables)
  const addTable = useBruiloftStore((s) => s.addTable)
  const updateTable = useBruiloftStore((s) => s.updateTable)
  const deleteTable = useBruiloftStore((s) => s.deleteTable)
  const updateGuest = useBruiloftStore((s) => s.updateGuest)
  const updateGuestsSeating = useBruiloftStore((s) => s.updateGuestsSeating)
  const permissions = useBruiloftStore((s) => s.permissions)
  const { toast } = useToast()

  const kanBewerken = canEdit(permissions, 'tafels')

  const [formOpen, setFormOpen] = React.useState(false)
  const [editTable, setEditTable] = React.useState<Table | null>(null)
  const [delTable, setDelTable] = React.useState<Table | null>(null)

  // Plattegrond is de standaard op desktop; lijst op mobiel. De keuze wordt onthouden.
  const [weergave, setWeergave] = React.useState<'plattegrond' | 'lijst'>('plattegrond')
  React.useEffect(() => {
    try {
      const bewaard = localStorage.getItem(WEERGAVE_KEY)
      if (bewaard === 'lijst') { setWeergave('lijst'); return }
      if (bewaard === 'plattegrond') return
      // Geen opgeslagen voorkeur: mobiel standaard naar lijstmodus
      if (window.innerWidth < 768) setWeergave('lijst')
    } catch {
      // localStorage niet beschikbaar; negeren.
    }
  }, [])
  const kiesWeergave = (w: 'plattegrond' | 'lijst') => {
    setWeergave(w)
    try {
      localStorage.setItem(WEERGAVE_KEY, w)
    } catch {
      // localStorage niet beschikbaar; negeren.
    }
  }

  if (!wedding) return null

  // Afgemelde gasten hebben geen stoel nodig.
  const pool = guests.filter((g) => g.rsvpStatus !== 'afgemeld')
  const ingedeeld = pool.filter((g) => g.tafelId).length
  const stoelen = tables.reduce((s, t) => s + t.capaciteit, 0)

  const openNieuw = () => {
    setEditTable(null)
    setFormOpen(true)
  }

  // Wijs een gast aan een tafel toe of haal hem eraf (tableId = null). We sturen
  // tafelId én stoelIndex expliciet mee — bij verwijderen als `null`, zodat de
  // update nooit leeg is (een lege update wordt door de database geweigerd) en
  // de vaste plek meereist met de tafelwissel.
  const assign = async (guestId: string, tableId: string | null) => {
    try {
      await updateGuest(guestId, { tafelId: tableId, stoelIndex: null })
    } catch {
      toast({ title: 'Indelen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    }
  }

  // Vaste plekken aanpassen (op een stoel zetten of stoelen ruilen).
  const seat = async (updates: SeatUpdate[]) => {
    if (updates.length === 0) return
    try {
      await updateGuestsSeating(updates)
    } catch {
      toast({ title: 'Indelen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    }
  }

  const patchTable = async (id: string, patch: TafelPatch) => {
    try {
      await updateTable(id, patch)
    } catch {
      toast({ title: 'Opslaan mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    }
  }

  return (
    <div className="mx-auto max-w-6xl pb-24 min-h-screen">
      <PageHeader
        titel="Tafelschikking"
        info={<PageInfoButton {...tafelsInfo} />}
        primaryActie={
          kanBewerken ? (
            <Button onClick={openNieuw}>
              <Plus className="h-4 w-4" /> Tafel toevoegen
            </Button>
          ) : null
        }
        meerActies={
          tables.length > 0 ? [{ label: 'Afdrukken', icon: Printer, onClick: () => window.print() }] : []
        }
        fab={kanBewerken ? { label: 'Tafel toevoegen', onClick: openNieuw } : undefined}
      />

      {tables.length > 0 ? (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div className="grid flex-1 grid-cols-3 gap-3">
            <Telling label="Tafels" waarde={tables.length} />
            <Telling label="Ingedeeld" waarde={`${ingedeeld}/${pool.length}`} />
            <Telling label="Stoelen" waarde={stoelen} />
          </div>
          {/* Weergavewissel: alleen op desktop, mobiel toont altijd de lijst. */}
          <div className="hidden rounded-lg border border-border bg-background p-1 md:inline-flex">
            <button
              type="button"
              aria-label="Plattegrond"
              aria-pressed={weergave === 'plattegrond'}
              onClick={() => kiesWeergave('plattegrond')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                weergave === 'plattegrond'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Map className="h-4 w-4" /> Plattegrond
            </button>
            <button
              type="button"
              aria-label="Lijstweergave"
              aria-pressed={weergave === 'lijst'}
              onClick={() => kiesWeergave('lijst')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                weergave === 'lijst'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutGrid className="h-4 w-4" /> Lijst
            </button>
          </div>
        </div>
      ) : null}

      {tables.length > 0 && stoelen < pool.length ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>Er zijn {pool.length - stoelen} gasten zonder stoel. Voeg meer tafels toe of vergroot de capaciteit.</span>
        </div>
      ) : null}

      {tables.length === 0 ? (
        <EmptyState
          icon={Armchair}
          titel="Nog geen tafels"
          beschrijving={kanBewerken ? 'Maak je eerste tafel aan en deel daarna de gasten in.' : 'Er zijn nog geen tafels.'}
          actie={
            kanBewerken ? (
              <Button onClick={openNieuw}>
                <Plus className="h-4 w-4" /> Tafel toevoegen
              </Button>
            ) : undefined
          }
        />
      ) : weergave === 'plattegrond' ? (
        <>
          {/* Desktop: interactieve plattegrond. */}
          <div className="hidden md:block">
            <FloorPlan
              tables={tables}
              guests={pool}
              kanBewerken={kanBewerken}
              onAssign={assign}
              onSeat={seat}
              onPatchTable={patchTable}
              onEditTable={(t) => {
                setEditTable(t)
                setFormOpen(true)
              }}
              onDeleteTable={setDelTable}
              onAddTable={openNieuw}
            />
          </div>
          {/* Mobiel: altijd de eenvoudige lijst. */}
          <div className="md:hidden">
            <SeatingBoard
              tables={tables}
              guests={pool}
              onAssign={kanBewerken ? assign : undefined}
              onSeat={kanBewerken ? seat : undefined}
              onEditTable={kanBewerken ? (t) => {
                setEditTable(t)
                setFormOpen(true)
              } : undefined}
              onDeleteTable={kanBewerken ? setDelTable : undefined}
            />
          </div>
        </>
      ) : (
        <SeatingBoard
          tables={tables}
          guests={pool}
          onAssign={kanBewerken ? assign : undefined}
          onSeat={kanBewerken ? seat : undefined}
          onEditTable={kanBewerken ? (t) => {
            setEditTable(t)
            setFormOpen(true)
          } : undefined}
          onDeleteTable={kanBewerken ? setDelTable : undefined}
        />
      )}

      <TableForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editTable}
        onSubmit={async (data) => {
          try {
            if (editTable) {
              await updateTable(editTable.id, data)
              toast({ title: 'Tafel bijgewerkt', variant: 'success' })
            } else {
              await addTable(data)
              toast({ title: 'Tafel toegevoegd', variant: 'success' })
            }
          } catch {
            toast({ title: 'Opslaan mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
          }
        }}
      />

      <ConfirmDialog
        open={delTable !== null}
        onOpenChange={(o) => !o && setDelTable(null)}
        title="Tafel verwijderen?"
        description={
          delTable
            ? `Weet je zeker dat je "${delTable.naam}" wilt verwijderen? De gasten worden weer onverdeeld.`
            : undefined
        }
        onConfirm={async () => {
          if (!delTable) return
          try {
            await deleteTable(delTable.id)
            toast({ title: 'Tafel verwijderd', variant: 'success' })
          } catch {
            toast({ title: 'Verwijderen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
          }
        }}
      />
    </div>
  )
}

function Telling({ label, waarde }: { label: string; waarde: number | string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">{waarde}</p>
      </CardContent>
    </Card>
  )
}
