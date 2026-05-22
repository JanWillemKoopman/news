'use client'

import * as React from 'react'
import { Armchair, Plus } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { SeatingBoard } from '@/components/bruiloft/tafels/SeatingBoard'
import { TableForm } from '@/components/bruiloft/tafels/TableForm'
import { Button, Card, CardContent, ConfirmDialog, EmptyState } from '@/components/bruiloft/ui'
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

  const assign = (guestId: string, tableId: string | null) =>
    void updateGuest(guestId, { tafelId: tableId ?? undefined })

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titel="Tafelschikking"
        beschrijving="Sleep gasten naar een tafel. Afgemelde gasten worden niet meegenomen."
        actie={
          <Button onClick={openNieuw}>
            <Plus className="h-4 w-4" /> Tafel
          </Button>
        }
      />

      {tables.length > 0 ? (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <Telling label="Tafels" waarde={tables.length} />
          <Telling label="Ingedeeld" waarde={`${ingedeeld}/${pool.length}`} />
          <Telling label="Stoelen" waarde={stoelen} />
        </div>
      ) : null}

      {tables.length === 0 ? (
        <EmptyState
          icon={Armchair}
          titel="Nog geen tafels"
          beschrijving="Maak je eerste tafel aan en deel daarna de gasten in."
          actie={
            <Button onClick={openNieuw}>
              <Plus className="h-4 w-4" /> Tafel toevoegen
            </Button>
          }
        />
      ) : (
        <SeatingBoard
          tables={tables}
          guests={pool}
          onAssign={assign}
          onEditTable={(t) => {
            setEditTable(t)
            setFormOpen(true)
          }}
          onDeleteTable={setDelTable}
        />
      )}

      <TableForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editTable}
        onSubmit={(data) => {
          if (editTable) void updateTable(editTable.id, data)
          else void addTable(data)
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
        onConfirm={() => delTable && void deleteTable(delTable.id)}
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
