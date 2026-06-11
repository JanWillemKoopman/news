'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'

import { Button, Modal } from '@/components/bruiloft/ui'
import { TaskCard } from '@/components/bruiloft/taken/TaskCard'
import { formatDatumNL } from '@/lib/bruiloft/format'
import { addDays, toISODate } from '@/lib/bruiloft/timeblocks'
import { capFirst, cn } from '@/lib/utils'
import type { ISODate, Task, Wedding, WeddingMember } from '@/lib/bruiloft/types'

interface CalendarViewProps {
  tasks: Task[]
  wedding: Wedding
  members: WeddingMember[]
  onToggleStatus: (t: Task) => void
  onEdit: (t: Task) => void
  onDelete: (t: Task) => void
  onToggleSubtaak: (t: Task, id: string) => void
  onShiftDeadline: (taskId: string, newDeadline: ISODate) => Promise<void>
  onAddTask: (date: ISODate) => void
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function gridStart(monthStart: Date): Date {
  // Maandag-eerste-dag rooster (Nederlands)
  const dow = monthStart.getDay() // 0=zo
  const offset = dow === 0 ? -6 : 1 - dow
  return addDays(monthStart, offset)
}

const DAGEN = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']
const MAAND_FMT = new Intl.DateTimeFormat('nl-NL', { month: 'long', year: 'numeric' })

export function CalendarView({
  tasks,
  wedding,
  members,
  onToggleStatus,
  onEdit,
  onDelete,
  onToggleSubtaak,
  onShiftDeadline,
  onAddTask,
}: CalendarViewProps) {
  const [shown, setShown] = React.useState(() => startOfMonth(new Date()))
  const [popoverDate, setPopoverDate] = React.useState<ISODate | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const tasksByDay = React.useMemo(() => {
    const map = new Map<ISODate, Task[]>()
    for (const t of tasks) {
      const list = map.get(t.deadline) ?? []
      list.push(t)
      map.set(t.deadline, list)
    }
    return map
  }, [tasks])

  const todayISO = toISODate(new Date())
  const start = gridStart(shown)
  const dagen: Date[] = []
  for (let i = 0; i < 42; i++) dagen.push(addDays(start, i))

  const handleDragEnd = async (e: DragEndEvent) => {
    if (!e.over) return
    const id = String(e.active.id)
    const target = String(e.over.id)
    if (!target.startsWith('date:')) return
    const newDeadline = target.slice('date:'.length)
    const task = tasks.find((t) => t.id === id)
    if (!task || task.deadline === newDeadline) return
    await onShiftDeadline(id, newDeadline)
  }

  const popoverTaken = popoverDate ? tasksByDay.get(popoverDate) ?? [] : []

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg text-foreground">{capFirst(MAAND_FMT.format(shown))}</h3>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => setShown(startOfMonth(new Date()))}>
            <span className="text-xs">Nu</span>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Vorige maand"
            onClick={() => setShown(new Date(shown.getFullYear(), shown.getMonth() - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Volgende maand"
            onClick={() => setShown(new Date(shown.getFullYear(), shown.getMonth() + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-border text-xs">
        {DAGEN.map((d) => (
          <div key={d} className="bg-card px-2 py-1 text-center font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {dagen.map((d) => {
            const iso = toISODate(d)
            const inMaand = d.getMonth() === shown.getMonth()
            const isToday = iso === todayISO
            const isTrouwdag = iso === wedding.trouwdatum
            const taken = tasksByDay.get(iso) ?? []
            return (
              <DayCell
                key={iso}
                iso={iso}
                day={d.getDate()}
                inMaand={inMaand}
                isToday={isToday}
                isTrouwdag={isTrouwdag}
                taken={taken}
                onOpen={() => setPopoverDate(iso)}
              />
            )
          })}
        </DndContext>
      </div>

      <Modal
        open={popoverDate !== null}
        onOpenChange={(o) => !o && setPopoverDate(null)}
        title={popoverDate ? formatDatumNL(popoverDate) : ''}
      >
        <div className="space-y-3">
          {popoverTaken.length === 0 ? (
            <p className="text-sm text-muted-foreground">Geen taken op deze dag.</p>
          ) : (
            <div className="space-y-2">
              {popoverTaken.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  members={members}
                  onToggleStatus={onToggleStatus}
                  onEdit={(task) => {
                    setPopoverDate(null)
                    onEdit(task)
                  }}
                  onDelete={onDelete}
                  onToggleSubtaak={onToggleSubtaak}
                  compact
                />
              ))}
            </div>
          )}
          <div className="border-t border-border pt-3">
            <Button
              size="sm"
              className="w-full gap-1.5"
              onClick={() => {
                const date = popoverDate!
                setPopoverDate(null)
                onAddTask(date)
              }}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Taak toevoegen op deze dag
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

interface DayCellProps {
  iso: ISODate
  day: number
  inMaand: boolean
  isToday: boolean
  isTrouwdag: boolean
  taken: Task[]
  onOpen: () => void
}

function DayCell({ iso, day, inMaand, isToday, isTrouwdag, taken, onOpen }: DayCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `date:${iso}` })
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onOpen}
      className={cn(
        'flex min-h-[80px] flex-col items-stretch bg-card p-1 text-left transition-colors',
        !inMaand && 'opacity-50',
        isOver && 'bg-primary/10'
      )}
    >
      <div className="flex items-center justify-end gap-1">
        {isTrouwdag ? <span className="text-rose-500">♥</span> : null}
        <span
          className={cn(
            'inline-flex h-5 w-5 items-center justify-center text-xs',
            isToday && 'rounded-full bg-primary text-primary-foreground font-medium'
          )}
        >
          {day}
        </span>
      </div>
      <div className="mt-1 space-y-0.5 overflow-hidden">
        {taken.slice(0, 2).map((t) => (
          <TaskPill key={t.id} task={t} />
        ))}
        {taken.length > 2 ? (
          <span className="block px-1 text-[10px] text-muted-foreground">
            +{taken.length - 2}
          </span>
        ) : null}
      </div>
    </button>
  )
}

function TaskPill({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  })
  const style: React.CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.6 : 1 }
    : {}
  const klaar = task.status === 'klaar'
  return (
    <span
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'block truncate rounded px-1 text-[10px] leading-tight',
        klaar ? 'bg-emerald-100 text-emerald-800 line-through' : 'bg-secondary text-secondary-foreground'
      )}
    >
      {task.titel}
    </span>
  )
}
