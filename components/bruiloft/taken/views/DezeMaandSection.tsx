'use client'

import * as React from 'react'
import { CalendarClock } from 'lucide-react'

import { TaskCard } from '@/components/bruiloft/taken/TaskCard'
import { aankomendeTaken } from '@/lib/bruiloft/taken/stats'
import type { Task, WeddingMember } from '@/lib/bruiloft/types'

interface DezeMaandSectionProps {
  tasks: Task[]
  members: WeddingMember[]
  partner1Naam?: string
  partner2Naam?: string
  onToggleStatus: (t: Task) => void
  onEdit: (t: Task) => void
  onDelete: (t: Task) => void
  onToggleSubtaak: (t: Task, id: string) => void
  selectable: boolean
  isSelected: (id: string) => boolean
  onToggleSelect: (t: Task) => void
}

export function DezeMaandSection(props: DezeMaandSectionProps) {
  const taken = aankomendeTaken(props.tasks)
  if (taken.length === 0) return null
  const label = taken.length === 1 ? 'taak' : 'taken'
  return (
    <div className="mb-8 border-l-2 border-rose-200 pl-4 dark:border-rose-900/40">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <CalendarClock className="h-3.5 w-3.5 shrink-0" />
        Deadline aankomende 30 dagen
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          {taken.length} {label}
        </span>
      </h2>
      <div className="space-y-2">
        {taken.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            members={props.members}
            partner1Naam={props.partner1Naam}
            partner2Naam={props.partner2Naam}
            onToggleStatus={props.onToggleStatus}
            onEdit={props.onEdit}
            onDelete={props.onDelete}
            onToggleSubtaak={props.onToggleSubtaak}
            selectable={props.selectable}
            selected={props.isSelected(t.id)}
            onToggleSelect={props.onToggleSelect}
          />
        ))}
      </div>
    </div>
  )
}
