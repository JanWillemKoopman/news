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
import { AlertTriangle, ChevronDown, ChevronUp, Pencil, Trash2, X } from 'lucide-react'

import { Button, Card, Select } from '@/components/bruiloft/ui'
import { capFirst, cn } from '@/lib/utils'
import {
  reorderSeatUpdates,
  seatsForTable,
  type SeatUpdate,
} from '@/lib/bruiloft/seating'
import type { Guest, Table } from '@/lib/bruiloft/types'

const ONVERDEELD = 'onverdeeld'

interface SeatingBoardProps {
  tables: Table[]
  guests: Guest[] // zitplaatspool (gasten die niet afgemeld zijn)
  onAssign?: (guestId: string, tableId: string | null) => void
  onSeat?: (updates: SeatUpdate[]) => void
  onEditTable?: (t: Table) => void
  onDeleteTable?: (t: Table) => void
}

export function SeatingBoard({
  tables,
  guests,
  onAssign,
  onSeat,
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
    if (!over || !onAssign) return
    onAssign(String(e.active.id), over === ONVERDEELD ? null : String(over))
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <DropZone id={ONVERDEELD} className="rounded-2xl border border-border bg-card/40 p-4">
          <h2 className="mb-3 text-lg text-foreground">
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
              onSeat={onSeat}
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
      <span
        {...listeners}
        {...attributes}
        className="inline-block max-w-[11rem] cursor-grab truncate align-middle touch-none select-none"
        title={guest.dieetwensen || undefined}
      >
        {guest.voornaam} {guest.achternaam}
        {guest.dieetwensen ? <span className="ml-1 text-[10px] opacity-60">🌿</span> : null}
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

// Eén genummerde stoel in een tafelkaart. De naam is versleepbaar (naar een
// andere tafel of terug naar onverdeeld); met de pijltjes verschuif je de gast
// naar een andere plek, met het kruisje haal je hem van tafel.
function SeatRow({
  seatNr,
  guest,
  overflow,
  canUp,
  canDown,
  onUp,
  onDown,
  onRemove,
  draggable,
}: {
  seatNr: number
  guest: Guest
  overflow: boolean
  canUp: boolean
  canDown: boolean
  onUp?: () => void
  onDown?: () => void
  onRemove?: () => void
  draggable: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: guest.id,
    disabled: !draggable,
  })
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 }
    : undefined
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm',
        overflow ? 'text-rose-600' : 'text-foreground',
        isDragging && 'opacity-60'
      )}
    >
      <span className="w-5 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
        {seatNr}
      </span>
      <span
        {...listeners}
        {...attributes}
        className={cn(
          'min-w-0 flex-1 truncate align-middle',
          draggable && 'cursor-grab touch-none select-none'
        )}
        title={guest.dieetwensen || undefined}
      >
        {guest.voornaam} {guest.achternaam}
        {guest.dieetwensen ? <span className="ml-1 text-[10px] opacity-60">🌿</span> : null}
      </span>
      {overflow ? <span className="text-[10px] uppercase">geen stoel</span> : null}
      {onUp || onDown ? (
        <span className="flex shrink-0 items-center">
          <button
            type="button"
            aria-label="Een plek omhoog"
            disabled={!canUp}
            onClick={onUp}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Een plek omlaag"
            disabled={!canDown}
            onClick={onDown}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </span>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Van tafel halen"
          className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </li>
  )
}

// Eén lege stoel in een tafelkaart.
function EmptySeatRow({ seatNr }: { seatNr: number }) {
  return (
    <li className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-muted-foreground/60">
      <span className="w-5 shrink-0 text-center text-xs tabular-nums">{seatNr}</span>
      <span className="flex-1 italic">leeg</span>
    </li>
  )
}

function TableCard({
  table,
  gasten,
  onverdeeld,
  onAssign,
  onSeat,
  onEdit,
  onDelete,
}: {
  table: Table
  gasten: Guest[]
  onverdeeld: Guest[]
  onAssign?: (guestId: string, tableId: string | null) => void
  onSeat?: (updates: SeatUpdate[]) => void
  onEdit?: (t: Table) => void
  onDelete?: (t: Table) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: table.id })
  const vol = gasten.length > table.capaciteit
  const seats = seatsForTable(table.capaciteit, gasten)

  return (
    <Card ref={setNodeRef} className={cn('p-4', isOver && 'ring-2 ring-primary', vol && 'border-rose-300')}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">{table.naam}</p>
          <p className="text-xs text-muted-foreground">{capFirst(table.vorm)}</p>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-semibold',
              vol
                ? 'bg-rose-100 text-rose-800'
                : 'bg-secondary text-secondary-foreground'
            )}
          >
            {gasten.length}/{table.capaciteit}
          </span>
          {onEdit && (
            <Button variant="ghost" size="icon" aria-label="Tafel bewerken" onClick={() => onEdit(table)}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="icon" aria-label="Tafel verwijderen" onClick={() => onDelete(table)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {vol ? (
        <p className="mb-2 inline-flex items-center gap-1 text-xs text-rose-700">
          <AlertTriangle className="h-3 w-3" /> meer gasten dan stoelen
        </p>
      ) : null}

      <div className="min-h-[3rem] rounded-xl border border-dashed border-border p-1.5">
        {gasten.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">
            Sleep gasten hierheen of voeg ze hieronder toe
          </p>
        ) : (
          <ol className="space-y-0.5">
            {seats.map((g, i) =>
              g ? (
                <SeatRow
                  key={g.id}
                  seatNr={i + 1}
                  guest={g}
                  overflow={i >= table.capaciteit}
                  canUp={i > 0}
                  canDown={i < seats.length - 1}
                  onUp={onSeat ? () => onSeat(reorderSeatUpdates(seats, i, -1)) : undefined}
                  onDown={onSeat ? () => onSeat(reorderSeatUpdates(seats, i, 1)) : undefined}
                  onRemove={onAssign ? () => onAssign(g.id, null) : undefined}
                  draggable={!!onAssign}
                />
              ) : (
                <EmptySeatRow key={`leeg-${i}`} seatNr={i + 1} />
              )
            )}
          </ol>
        )}
      </div>

      {onverdeeld.length > 0 && onAssign ? (
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
