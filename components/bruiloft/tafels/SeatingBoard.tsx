'use client'

import * as React from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { AlertTriangle, Pencil, Trash2, X } from 'lucide-react'

import { Button, Card, Select } from '@/components/bruiloft/ui'
import { cn } from '@/lib/utils'
import type { Guest, Table } from '@/lib/bruiloft/types'

const ONVERDEELD = 'onverdeeld'

interface SeatingBoardProps {
  tables: Table[]
  guests: Guest[] // zitplaatspool (gasten die niet afgemeld zijn)
  onAssign: (guestId: string, tableId: string | null) => void
  onEditTable: (t: Table) => void
  onDeleteTable: (t: Table) => void
}

export function SeatingBoard({
  tables,
  guests,
  onAssign,
  onEditTable,
  onDeleteTable,
}: SeatingBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const onverdeeld = guests.filter((g) => !g.tafelId)

  const onDragEnd = (e: DragEndEvent) => {
    const over = e.over?.id
    if (!over) return
    onAssign(String(e.active.id), over === ONVERDEELD ? null : String(over))
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <DropZone id={ONVERDEELD} className="rounded-2xl border border-border bg-card/40 p-4">
          <h2 className="mb-3 font-serif text-lg text-foreground">
            Onverdeeld{' '}
            <span className="text-sm font-normal text-muted-foreground">({onverdeeld.length})</span>
          </h2>
          {onverdeeld.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Alle gasten zijn ingedeeld.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {onverdeeld.map((g) => (
                <GuestChip key={g.id} guest={g} />
              ))}
            </div>
          )}
        </DropZone>

        <div className="grid gap-4 sm:grid-cols-2">
          {tables.map((t) => (
            <TableCard
              key={t.id}
              table={t}
              gasten={guests.filter((g) => g.tafelId === t.id)}
              onverdeeld={onverdeeld}
              onAssign={onAssign}
              onEdit={onEditTable}
              onDelete={onDeleteTable}
            />
          ))}
        </div>
      </div>
    </DndContext>
  )
}

function DropZone({
  id,
  className,
  children,
}: {
  id: string
  className?: string
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={cn(className, isOver && 'ring-2 ring-primary')}>
      {children}
    </div>
  )
}

function GuestChip({ guest, onRemove }: { guest: Guest; onRemove?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: guest.id,
  })
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 }
    : undefined
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-sm text-foreground shadow-sm',
        isDragging && 'opacity-60'
      )}
    >
      <span {...listeners} {...attributes} className="cursor-grab touch-none select-none">
        {guest.voornaam} {guest.achternaam}
      </span>
      {onRemove ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          aria-label="Van tafel halen"
          className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}

function TableCard({
  table,
  gasten,
  onverdeeld,
  onAssign,
  onEdit,
  onDelete,
}: {
  table: Table
  gasten: Guest[]
  onverdeeld: Guest[]
  onAssign: (guestId: string, tableId: string | null) => void
  onEdit: (t: Table) => void
  onDelete: (t: Table) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: table.id })
  const vol = gasten.length > table.capaciteit

  return (
    <Card ref={setNodeRef} className={cn('p-4', isOver && 'ring-2 ring-primary', vol && 'border-rose-300 dark:border-rose-900')}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">{table.naam}</p>
          <p className="text-xs capitalize text-muted-foreground">{table.vorm}</p>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-semibold',
              vol
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                : 'bg-secondary text-secondary-foreground'
            )}
          >
            {gasten.length}/{table.capaciteit}
          </span>
          <Button variant="ghost" size="icon" aria-label="Tafel bewerken" onClick={() => onEdit(table)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Tafel verwijderen" onClick={() => onDelete(table)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {vol ? (
        <p className="mb-2 inline-flex items-center gap-1 text-xs text-rose-700 dark:text-rose-400">
          <AlertTriangle className="h-3 w-3" /> meer gasten dan stoelen
        </p>
      ) : null}

      <div className="min-h-[3rem] rounded-xl border border-dashed border-border p-2">
        {gasten.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">
            Sleep gasten hierheen
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {gasten.map((g) => (
              <GuestChip key={g.id} guest={g} onRemove={() => onAssign(g.id, null)} />
            ))}
          </div>
        )}
      </div>

      {onverdeeld.length > 0 ? (
        <Select
          aria-label="Gast toevoegen aan tafel"
          value=""
          onChange={(e) => e.target.value && onAssign(e.target.value, table.id)}
          className="mt-3 h-9 text-xs"
        >
          <option value="">+ Gast toevoegen…</option>
          {onverdeeld.map((g) => (
            <option key={g.id} value={g.id}>
              {g.voornaam} {g.achternaam}
            </option>
          ))}
        </Select>
      ) : null}
    </Card>
  )
}
