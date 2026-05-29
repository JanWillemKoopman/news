'use client'

import * as React from 'react'

import { EmptyState } from '@/components/bruiloft/ui'
import { ListChecks } from 'lucide-react'
import { TaskCard } from '@/components/bruiloft/taken/TaskCard'
import { QuickAddTask } from '@/components/bruiloft/taken/QuickAddTask'
import { DezeMaandSection } from '@/components/bruiloft/taken/views/DezeMaandSection'
import { TIJDSBLOK_VOLGORDE, addDays, toISODate } from '@/lib/bruiloft/timeblocks'
import type { ISODate, Task, Tijdsblok, Wedding, WeddingMember } from '@/lib/bruiloft/types'

// Een redelijke "midden van het tijdsblok"-deadline t.o.v. de trouwdatum
// (gebruikt als default bij quick-add).
function deadlineVoorBlok(blok: Tijdsblok, trouwdatum: ISODate): ISODate {
  const offsetDagen: Record<Tijdsblok, number> = {
    '12 maanden voor': -340,
    '9 maanden voor': -270,
    '6 maanden voor': -180,
    '3 maanden voor': -90,
    '1 maand voor': -25,
    'laatste week': -7,
    trouwweek: -1,
    'na de bruiloft': 14,
  }
  return toISODate(addDays(trouwdatum, offsetDagen[blok]))
}

interface ListViewProps {
  tasks: Task[]
  allTasks: Task[]
  wedding: Wedding
  members: WeddingMember[]
  onToggleStatus: (t: Task) => void
  onEdit: (t: Task) => void
  onDelete: (t: Task) => void
  onToggleSubtaak: (t: Task, id: string) => void
  onQuickAdd: (titel: string, deadline: ISODate) => Promise<void>
  selectable: boolean
  isSelected: (id: string) => boolean
  onToggleSelect: (t: Task) => void
  achterstandRef?: React.MutableRefObject<HTMLDivElement | null>
}

export function ListView({
  tasks,
  allTasks,
  wedding,
  members,
  onToggleStatus,
  onEdit,
  onDelete,
  onToggleSubtaak,
  onQuickAdd,
  selectable,
  isSelected,
  onToggleSelect,
  achterstandRef,
}: ListViewProps) {
  if (allTasks.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        titel="Nog geen taken"
        beschrijving="Voeg taken toe of stel je bruiloft in om automatisch een takenlijst te krijgen."
      />
    )
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        titel="Geen taken gevonden"
        beschrijving="Pas je filters aan."
      />
    )
  }

  // Vind eerste blok met achterstallige taken voor de scroll-target.
  let achterstallig: Tijdsblok | null = null
  for (const blok of TIJDSBLOK_VOLGORDE) {
    const heeftAchterstand = tasks.some(
      (t) => t.tijdsblok === blok && t.status !== 'klaar' && new Date(t.deadline) < new Date()
    )
    if (heeftAchterstand) {
      achterstallig = blok
      break
    }
  }

  return (
    <div className="space-y-8">
      <DezeMaandSection
        tasks={tasks}
        members={members}
        onToggleStatus={onToggleStatus}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleSubtaak={onToggleSubtaak}
        selectable={selectable}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
      />

      {TIJDSBLOK_VOLGORDE.map((blok) => {
        const blokTaken = tasks
          .filter((t) => t.tijdsblok === blok)
          .sort((a, b) => a.deadline.localeCompare(b.deadline))
        if (blokTaken.length === 0) return null
        return (
          <div
            key={blok}
            ref={blok === achterstallig ? achterstandRef : undefined}
            data-blok={blok}
          >
            <h2 className="mb-3 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {blok}
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                {blokTaken.length} {blokTaken.length === 1 ? 'taak' : 'taken'}
              </span>
            </h2>
            <div className="space-y-2">
              {blokTaken.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  members={members}
                  onToggleStatus={onToggleStatus}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleSubtaak={onToggleSubtaak}
                  selectable={selectable}
                  selected={isSelected(t.id)}
                  onToggleSelect={onToggleSelect}
                />
              ))}
              <QuickAddTask
                defaultDeadline={deadlineVoorBlok(blok, wedding.trouwdatum)}
                onAdd={onQuickAdd}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
