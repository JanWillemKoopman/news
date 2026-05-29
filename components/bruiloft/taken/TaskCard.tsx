'use client'

import * as React from 'react'
import { Check, ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react'

import { Button, Card, CardContent, StatusBadge } from '@/components/bruiloft/ui'
import { dagenTot, formatDatumNL } from '@/lib/bruiloft/format'
import { cn } from '@/lib/utils'
import type { Subtaak, Task, WeddingMember } from '@/lib/bruiloft/types'

// Deadline-label specifiek voor de taakkaart: "deadline over X dagen" in de
// toekomst, "vandaag" voor 0 dagen, "X dagen te laat" voor het verleden.
function deadlineLabel(dagen: number): string {
  if (dagen === 0) return 'uiterlijk vandaag'
  if (dagen > 0) return `uiterlijk over ${dagen} ${dagen === 1 ? 'dag' : 'dagen'}`
  const laat = Math.abs(dagen)
  return `${laat} ${laat === 1 ? 'dag' : 'dagen'} te laat`
}

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
  const [expanded, setExpanded] = React.useState(false)
  const heeftSubtaken = task.subtaken.length > 0
  const subKlaar = task.subtaken.filter((s: Subtaak) => s.klaar).length

  const toegewezenLeden = members.filter((m) => task.assignees.includes(m.userId))
  const fallbackLabel =
    toegewezenLeden.length === 0 && task.toegewezenAan ? task.toegewezenAan : null

  return (
    <Card
      className={cn(
        'transition-opacity',
        klaar && 'opacity-60',
        selected && 'ring-2 ring-primary'
      )}
    >
      <CardContent className={cn('flex items-start gap-3', compact ? 'p-3' : 'p-4')}>
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
          <div className="flex items-start justify-between gap-2">
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
          </div>
          {task.omschrijving && !compact ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{task.omschrijving}</p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{formatDatumNL(task.deadline)}</span>
            {!klaar ? (
              <span className={cn(d < 0 && 'font-medium text-rose-600 dark:text-rose-400')}>
                {deadlineLabel(d)}
              </span>
            ) : null}
            <StatusBadge kind="prioriteit" value={task.prioriteit} />
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
              <span className="capitalize">{fallbackLabel}</span>
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

        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Bewerken"
            onClick={() => onEdit(task)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Verwijderen"
            onClick={() => onDelete(task)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
