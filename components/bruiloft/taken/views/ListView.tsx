'use client'

import * as React from 'react'

import { Button, EmptyState } from '@/components/bruiloft/ui'
import { ChevronDown, ChevronRight, ListChecks } from 'lucide-react'
import { TaskCard } from '@/components/bruiloft/taken/TaskCard'
import { QuickAddTask } from '@/components/bruiloft/taken/QuickAddTask'
import { DezeMaandSection } from '@/components/bruiloft/taken/views/DezeMaandSection'
import { effectievePrioriteit } from '@/lib/bruiloft/taken/stats'
import { defaultDeadlineVoorMaand, groepeerOpDeadlineMaand } from '@/lib/bruiloft/taken/timeline'
import type { ISODate, Task, Wedding, WeddingMember } from '@/lib/bruiloft/types'

const PRIO_ORDER: Record<string, number> = { hoog: 0, midden: 1, laag: 2 }

interface ListViewProps {
  tasks: Task[]
  allTasks: Task[]
  wedding: Wedding
  members: WeddingMember[]
  onToggleStatus: (t: Task) => void
  onEdit: (t: Task) => void
  onDelete: (t: Task) => void
  onToggleSubtaak: (t: Task, id: string) => void
  onOpenForm: (deadline: ISODate) => void
  selectable: boolean
  isSelected: (id: string) => boolean
  onToggleSelect: (t: Task) => void
  onResetFilters?: () => void
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
  onOpenForm,
  selectable,
  isSelected,
  onToggleSelect,
  onResetFilters,
}: ListViewProps) {
  // Handmatig open/dicht geklapte maandsecties (wint van de standaardkeuze).
  const [maandOverrides, setMaandOverrides] = React.useState<Record<string, boolean>>({})
  const maandGroepen = React.useMemo(() => groepeerOpDeadlineMaand(tasks), [tasks])

  if (allTasks.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        titel="Nog geen taken"
        beschrijving="Stel jullie takenlijst samen via de voorstellen hierboven, of voeg zelf een taak toe."
      />
    )
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        titel="Geen taken gevonden"
        beschrijving="Geen taken komen overeen met de huidige filters."
        actie={onResetFilters ? <Button variant="outline" size="sm" onClick={onResetFilters}>Wis filters</Button> : undefined}
      />
    )
  }

  // Maandsecties zijn inklapbaar, maar staan standaard allemaal open zodat
  // alle kaartjes direct zichtbaar zijn. Een klik op de kop klapt dicht; die
  // keuze wint van de standaard.
  const maandIsOpen = (key: string): boolean => maandOverrides[key] ?? true

  return (
    <div className="space-y-8">
      <DezeMaandSection
        tasks={tasks}
        members={members}
        partner1Naam={wedding.partner1Naam}
        partner2Naam={wedding.partner2Naam}
        onToggleStatus={onToggleStatus}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleSubtaak={onToggleSubtaak}
        selectable={selectable}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
      />

      {maandGroepen.length > 0 ? (
        <p className="px-1 text-sm text-muted-foreground">
          Hieronder per maand de taken met een deadline — de uiterlijke datum waarop het geregeld
          moet zijn.
        </p>
      ) : null}

      {maandGroepen.map((groep) => {
        const groepTaken = [...groep.tasks].sort(
          (a, b) =>
            a.deadline.localeCompare(b.deadline) ||
            PRIO_ORDER[effectievePrioriteit(a)] - PRIO_ORDER[effectievePrioriteit(b)]
        )
        const open = maandIsOpen(groep.key)
        return (
          <div key={groep.key} className="border-l-2 border-border pl-4">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setMaandOverrides((prev) => ({ ...prev, [groep.key]: !open }))}
              className="mb-3 -ml-4 flex w-full items-center gap-2 rounded-md py-1.5 pl-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              {open ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              )}
              {groep.label}
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                {groepTaken.length} {groepTaken.length === 1 ? 'taak' : 'taken'}
              </span>
            </button>
            {open ? (
              <div className="space-y-2">
                {groepTaken.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    members={members}
                    partner1Naam={wedding.partner1Naam}
                    partner2Naam={wedding.partner2Naam}
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
                  defaultDeadline={defaultDeadlineVoorMaand(groep.key)}
                  onOpenForm={onOpenForm}
                />
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
