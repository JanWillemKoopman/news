'use client'

import * as React from 'react'
import { CalendarClock } from 'lucide-react'

import { TaskCard } from '@/components/bruiloft/taken/TaskCard'
import { aankomendeTaken } from '@/lib/bruiloft/taken/stats'
import type { Task, WeddingMember } from '@/lib/bruiloft/types'

interface DezeMaandSectionProps {
  tasks: Task[]
  members: WeddingMember[]
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
    <div className="mb-8 rounded-lg border border-border bg-muted/50 p-4">
      <h2 className="mb-3 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
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
