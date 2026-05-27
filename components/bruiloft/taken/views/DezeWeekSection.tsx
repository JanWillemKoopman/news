'use client'

import * as React from 'react'
import { CalendarClock } from 'lucide-react'

import { TaskCard } from '@/components/bruiloft/taken/TaskCard'
import { dezeWeekTaken } from '@/lib/bruiloft/taken/stats'
import type { Task, WeddingMember } from '@/lib/bruiloft/types'

interface DezeWeekSectionProps {
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

export function DezeWeekSection(props: DezeWeekSectionProps) {
  const taken = dezeWeekTaken(props.tasks)
  if (taken.length === 0) return null
  return (
    <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
      <h2 className="mb-3 flex items-center gap-2 px-1 font-serif text-lg text-foreground">
        <CalendarClock className="h-5 w-5 text-amber-700" />
        Deze week
        <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900">
          {taken.length}
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
