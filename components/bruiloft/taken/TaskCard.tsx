'use client'

import * as React from 'react'
import { AlertTriangle, Check, ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react'

import { Card, CardContent, OverflowMenu, StatusBadge } from '@/components/bruiloft/ui'
import { dagLabel, dagenTot, formatDatumNL } from '@/lib/bruiloft/format'
import { toegewezenAanLabel } from '@/lib/bruiloft/options'
import { effectievePrioriteit } from '@/lib/bruiloft/taken/stats'
import { cn } from '@/lib/utils'
import type { Subtaak, Task, WeddingMember } from '@/lib/bruiloft/types'

import { AvatarStack } from './AvatarStack'
import { SubtakenChecklist } from './SubtakenList'

interface TaskCardProps {
  task: Task
  members: WeddingMember[]
  partner1Naam?: string
  partner2Naam?: string
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
  partner1Naam,
  partner2Naam,
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
    // overflow-hidden alleen tijdens het swipen zelf (voor de rode laag +
    // afgeronde hoeken): permanent overflow-hidden zou ook het "meer"-menu
    // afknippen, want dat wordt binnen deze wrapper absoluut gepositioneerd.
    <div className={cn('relative rounded-xl', swipeX > 0 && 'overflow-hidden')}>
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
          'group relative',
          selected && 'ring-2 ring-primary',
          achterstallig && 'border-l-4 border-l-rose-400'
        )}
      >
      <CardContent
        className={cn('flex items-start gap-3 p-3', !compact && 'sm:items-center')}
      >
        {selectable ? (
          <button
            type="button"
            onClick={() => onToggleSelect?.(task)}
            aria-label={selected ? 'Deselecteer' : 'Selecteer'}
            className={cn(
              'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
              !compact && 'sm:mt-0',
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
            !compact && 'sm:mt-0',
            klaar
              ? 'border-muted-foreground/40 bg-muted-foreground/15 text-muted-foreground'
              : 'border-border hover:border-primary'
          )}
        >
          {klaar ? <Check className="h-4 w-4" /> : null}
        </button>

        {/* Op mobiel (en in compacte contexten zoals de kalender-popover)
            blijft alles onder elkaar staan. Op desktop past titel,
            omschrijving en metadata op één regel — minder verticale ruimte,
            de beschikbare breedte wordt benut i.p.v. leeg te blijven.
            opacity staat hier i.p.v. op de hele Card: opacity < 1 creëert
            een nieuwe stacking-context, en zou anders het "meer"-menu
            (verderop in dezelfde Card) achter latere kaarten in de lijst
            laten verdwijnen zodra de taak is afgevinkt. */}
        <div
          className={cn(
            'min-w-0 flex-1 transition-opacity',
            klaar && 'opacity-60',
            !compact && 'sm:flex sm:items-center sm:gap-4'
          )}
        >
          <div className={cn('min-w-0', !compact && 'sm:flex sm:min-w-0 sm:flex-1 sm:items-center sm:gap-3')}>
            <button
              type="button"
              onClick={() => onEdit(task)}
              className={cn(
                'text-left font-medium text-foreground hover:underline',
                !compact && 'sm:shrink-0 sm:truncate sm:max-w-[15rem]',
                klaar && 'line-through'
              )}
            >
              {task.titel}
            </button>
            {task.omschrijving && !compact ? (
              <>
                <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground sm:hidden">
                  {task.omschrijving}
                </p>
                <p className="hidden text-sm text-muted-foreground sm:block sm:min-w-0 sm:flex-1 sm:truncate">
                  {task.omschrijving}
                </p>
              </>
            ) : null}
          </div>

          <div
            className={cn(
              'mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground',
              !compact && 'sm:mt-0 sm:shrink-0 sm:flex-nowrap'
            )}
          >
            {task.deadline ? (
              <span className="inline-flex shrink-0 items-center gap-1">
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
            <span className="inline-flex shrink-0 items-center gap-1.5">
              <StatusBadge kind="prioriteit" value={effectievePrioriteit(task)} />
            </span>
            {toegewezenLeden.length > 0 ? (
              <span className="inline-flex min-w-0 shrink items-center gap-1.5">
                <AvatarStack members={toegewezenLeden} />
                <span className="max-w-[9rem] truncate text-foreground">
                  {toegewezenLeden
                    .map((m) => m.displayName || m.email)
                    .join(', ')}
                </span>
              </span>
            ) : fallbackLabel ? (
              <span className="shrink-0">
                {toegewezenAanLabel(fallbackLabel, partner1Naam, partner2Naam)}
              </span>
            ) : null}
            {heeftSubtaken ? (
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground hover:bg-secondary/80"
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
        </div>

        <div className="shrink-0">
          <OverflowMenu
            label={`Acties voor ${task.titel}`}
            items={[
              { label: 'Bewerken', icon: Pencil, onClick: () => onEdit(task) },
              { label: 'Verwijderen', icon: Trash2, danger: true, onClick: () => onDelete(task) },
            ]}
          />
        </div>
      </CardContent>

      {heeftSubtaken && expanded && onToggleSubtaak ? (
        <div className="px-3 pb-3 sm:pl-[4.5rem]">
          <SubtakenChecklist
            subtaken={task.subtaken}
            onToggle={(id) => onToggleSubtaak(task, id)}
          />
        </div>
      ) : null}
    </Card>
    </div>
  )
}
