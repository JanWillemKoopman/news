'use client'

import * as React from 'react'
import { AlertTriangle, Armchair, Plus, Printer } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { AIInsightCard } from '@/components/bruiloft/ai/AIInsightCard'
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
import { canEdit } from '@/lib/bruiloft/permissions'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { Table } from '@/lib/bruiloft/types'

export default function TafelsPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const guests = useBruiloftStore((s) => s.guests)
  const tables = useBruiloftStore((s) => s.tables)
  const addTable = useBruiloftStore((s) => s.addTable)
  const updateTable = useBruiloftStore((s) => s.updateTable)
  const deleteTable = useBruiloftStore((s) => s.deleteTable)
  const updateGuest = useBruiloftStore((s) => s.updateGuest)
  const permissions = useBruiloftStore((s) => s.permissions)
  const { toast } = useToast()

  const kanBewerken = canEdit(permissions, 'tafels')

  const [formOpen, setFormOpen] = React.useState(false)
  const [editTable, setEditTable] = React.useState<Table | null>(null)
  const [delTable, setDelTable] = React.useState<Table | null>(null)

  if (!wedding) return null

  // Afgemelde gasten hebben geen stoel nodig.
  const pool = guests.filter((g) => g.rsvpStatus !== 'afgemeld')
  const ingedeeld = pool.filter((g) => g.tafelId).length
  const stoelen = tables.reduce((s, t) => s + t.capaciteit, 0)

  const openNieuw = () => {
    setEditTable(null)
    setFormOpen(true)
  }

  const assign = async (guestId: string, tableId: string | null) => {
    try {
      await updateGuest(guestId, { tafelId: tableId ?? undefined })
    } catch {
      toast({ title: 'Indelen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    }
  }

  return (
    <div className="mx-auto max-w-6xl pb-24 min-h-screen">
      <PageHeader
        titel="Tafelschikking"
        beschrijving="Sleep gasten naar een tafel. Afgemelde gasten worden niet meegenomen."
        actie={
          <>
            {tables.length > 0 ? (
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Afdrukken
              </Button>
            ) : null}
            {kanBewerken && (
              <Button onClick={openNieuw}>
                <Plus className="h-4 w-4" /> Tafel
              </Button>
            )}
          </>
        }
        fab={kanBewerken ? { label: 'Tafel toevoegen', onClick: openNieuw } : undefined}
      />

      <AIInsightCard sectie="/bruiloft/tafels" />

      {tables.length > 0 ? (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Telling label="Tafels" waarde={tables.length} />
          <Telling label="Ingedeeld" waarde={`${ingedeeld}/${pool.length}`} />
          <Telling label="Stoelen" waarde={stoelen} />
        </div>
      ) : null}

      {tables.length > 0 && stoelen < pool.length ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
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
      ) : (
        <SeatingBoard
          tables={tables}
          guests={pool}
          onAssign={kanBewerken ? assign : undefined}
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
