'use client'

import * as React from 'react'
import { AlertTriangle, Check, ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react'

import { Card, CardContent, OverflowMenu, StatusBadge } from '@/components/bruiloft/ui'
import { dagLabel, dagenTot, formatDatumNL } from '@/lib/bruiloft/format'
import { effectievePrioriteit } from '@/lib/bruiloft/taken/stats'
import { capFirst, cn } from '@/lib/utils'
import type { Subtaak, Task, WeddingMember } from '@/lib/bruiloft/types'

import { AvatarStack } from './AvatarStack'
import { SubtakenChecklist } from './SubtakenList'

interface TaskCardProps {
  task: Task
  members: WeddingMember[]
  onToggleStatus: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onToggleSubtaak?: (task: Task, subtaakId: string) => void
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: (task: Task) => void
  compact?: boolean
}

export function TaskCard({
  task,
  members,
  onToggleStatus,
  onEdit,
  onDelete,
  onToggleSubtaak,
  selectable,
  selected,
  onToggleSelect,
  compact,
}: TaskCardProps) {
  const klaar = task.status === 'klaar'
  const d = dagenTot(task.deadline)
  const achterstallig = !klaar && d < 0
  const [expanded, setExpanded] = React.useState(false)
  const heeftSubtaken = task.subtaken.length > 0
  const subKlaar = task.subtaken.filter((s: Subtaak) => s.klaar).length

  const toegewezenLeden = members.filter((m) => task.assignees.includes(m.userId))
  const fallbackLabel =
    toegewezenLeden.length === 0 && task.toegewezenAan ? task.toegewezenAan : null

  const swipeStartX = React.useRef(0)
  const [swipeX, setSwipeX] = React.useState(0)
  const swiping = React.useRef(false)

  const onTouchStart = (e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX
    swiping.current = true
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!swiping.current) return
    const delta = swipeStartX.current - e.touches[0].clientX
    if (delta > 0) setSwipeX(delta)
  }
  const onTouchEnd = () => {
    swiping.current = false
    if (swipeX > 60) {
      setSwipeX(0)
      onDelete(task)
    } else {
      setSwipeX(0)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Rode laag achter de kaart, zichtbaar bij links-vegen */}
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 flex items-center justify-end rounded-xl bg-rose-600 pr-5 text-white"
        style={{ width: `${Math.min(swipeX, 80)}px`, opacity: swipeX > 10 ? 1 : 0 }}
      >
        <Trash2 className="h-5 w-5 shrink-0" />
      </div>
      <Card
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: swipeX > 0 ? `translateX(-${Math.min(swipeX, 80)}px)` : undefined,
          transition: swipeX === 0 ? 'transform 200ms ease' : undefined,
        }}
        className={cn(
          'group relative transition-opacity',
          klaar && 'opacity-60',
          selected && 'ring-2 ring-primary',
          achterstallig && 'border-l-4 border-l-rose-400'
        )}
      >
      <CardContent className="flex items-start gap-3 p-3">
        {selectable ? (
          <button
            type="button"
            onClick={() => onToggleSelect?.(task)}
            aria-label={selected ? 'Deselecteer' : 'Selecteer'}
            className={cn(
              'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border hover:border-primary'
            )}
          >
            {selected ? <Check className="h-3 w-3" /> : null}
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => onToggleStatus(task)}
          aria-label={klaar ? 'Markeer als open' : 'Markeer als klaar'}
          className={cn(
            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            klaar
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-border hover:border-primary'
          )}
        >
          {klaar ? <Check className="h-4 w-4" /> : null}
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => onEdit(task)}
              className={cn(
                'text-left font-medium text-foreground hover:underline',
                klaar && 'line-through'
              )}
            >
              {task.titel}
            </button>
            <div className="shrink-0">
              <OverflowMenu
                label={`Acties voor ${task.titel}`}
                items={[
                  { label: 'Bewerken', icon: Pencil, onClick: () => onEdit(task) },
                  { label: 'Verwijderen', icon: Trash2, danger: true, onClick: () => onDelete(task) },
                ]}
              />
            </div>
          </div>
          {task.omschrijving && !compact ? (
            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
              {task.omschrijving}
            </p>
          ) : null}

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {task.deadline ? (
              <span className="inline-flex items-center gap-1">
                {achterstallig ? (
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                ) : null}
                {formatDatumNL(task.deadline)}
                {!klaar ? (
                  <span className={cn(achterstallig && 'font-medium text-rose-600 dark:text-rose-400')}>
                    · {dagLabel(d)}
                  </span>
                ) : null}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <StatusBadge kind="prioriteit" value={effectievePrioriteit(task)} />
            </span>
            {toegewezenLeden.length > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <AvatarStack members={toegewezenLeden} />
                <span className="truncate text-foreground">
                  {toegewezenLeden
                    .map((m) => m.displayName || m.email)
                    .join(', ')}
                </span>
              </span>
            ) : fallbackLabel ? (
              <span>{capFirst(fallbackLabel)}</span>
            ) : null}
            {heeftSubtaken ? (
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground hover:bg-secondary/80"
              >
                {expanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                {subKlaar}/{task.subtaken.length} subtaken
              </button>
            ) : null}
          </div>

          {heeftSubtaken && expanded && onToggleSubtaak ? (
            <SubtakenChecklist
              subtaken={task.subtaken}
              onToggle={(id) => onToggleSubtaak(task, id)}
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
    </div>
  )
}
