'use client'

import * as React from 'react'
import { ListChecks } from 'lucide-react'

import { EmptyState } from '@/components/bruiloft/ui'
import { TaskCard } from '@/components/bruiloft/taken/TaskCard'
import { formatDatumKort } from '@/lib/bruiloft/format'
import { TIJDSBLOK_VOLGORDE } from '@/lib/bruiloft/timeblocks'
import { cn } from '@/lib/utils'
import type { Task, Tijdsblok, Wedding, WeddingMember } from '@/lib/bruiloft/types'

type Entry =
  | { kind: 'milestone'; blok: Tijdsblok }
  | { kind: 'today' }
  | { kind: 'task'; task: Task }

function buildEntries(tasks: Task[]): Entry[] {
  const todayISO = new Date().toISOString().slice(0, 10)
  const sorted = [...tasks].sort((a, b) => a.deadline.localeCompare(b.deadline))

  const entries: Entry[] = []
  let todayInserted = false

  for (const blok of TIJDSBLOK_VOLGORDE) {
    entries.push({ kind: 'milestone', blok })
    const inBlok = sorted.filter((t) => t.tijdsblok === blok)
    for (const t of inBlok) {
      if (!todayInserted && t.deadline >= todayISO) {
        entries.push({ kind: 'today' })
        todayInserted = true
      }
      entries.push({ kind: 'task', task: t })
    }
  }
  if (!todayInserted) entries.push({ kind: 'today' })
  return entries
}

function bulletKleurVoor(task: Task): string {
  if (task.status === 'klaar') return 'bg-emerald-500 border-emerald-500'
  if (task.status === 'bezig') return 'bg-amber-400 border-amber-400'
  return 'bg-card border-border'
}

interface TimelineViewProps {
  tasks: Task[]
  allTasks: Task[]
  wedding: Wedding
  members: WeddingMember[]
  onToggleStatus: (t: Task) => void
  onEdit: (t: Task) => void
  onDelete: (t: Task) => void
  onToggleSubtaak: (t: Task, id: string) => void
  selectable: boolean
  isSelected: (id: string) => boolean
  onToggleSelect: (t: Task) => void
}

export function TimelineView({
  tasks,
  allTasks,
  wedding,
  members,
  onToggleStatus,
  onEdit,
  onDelete,
  onToggleSubtaak,
  selectable,
  isSelected,
  onToggleSelect,
}: TimelineViewProps) {
  if (allTasks.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        titel="Nog geen taken"
        beschrijving="Voeg taken toe of stel je bruiloft in om automatisch een takenlijst te krijgen."
      />
    )
  }

  const entries = buildEntries(tasks)

  return (
    <div className="relative pl-2">
      {/* Verticale rail */}
      <div
        aria-hidden
        className="absolute left-[18px] top-0 bottom-0 w-px bg-border"
      />

      <div className="space-y-3">
        {entries.map((entry, i) => {
          if (entry.kind === 'milestone') {
            return (
              <div key={`m-${entry.blok}`} className="relative flex items-center gap-4 py-2">
                <span className="z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-primary rotate-45" />
                <h3 className="font-serif text-base capitalize text-foreground">{entry.blok}</h3>
              </div>
            )
          }
          if (entry.kind === 'today') {
            return (
              <div key={`today-${i}`} className="relative flex items-center gap-4 py-1">
                <span className="relative z-10 flex h-4 w-4 shrink-0 items-center justify-center">
                  <span className="absolute h-4 w-4 animate-ping rounded-full bg-rose-400/60" />
                  <span className="relative h-3 w-3 rounded-full bg-rose-500 ring-2 ring-card" />
                </span>
                <span className="font-serif text-sm font-medium text-rose-700">
                  Vandaag · {formatDatumKort(new Date())}
                </span>
              </div>
            )
          }
          const t = entry.task
          return (
            <div key={t.id} className="relative flex items-start gap-3">
              <span
                className={cn(
                  'relative z-10 mt-3 flex h-3 w-3 shrink-0 rounded-full border-2 ring-2 ring-card',
                  bulletKleurVoor(t)
                )}
              />
              <div className="min-w-0 flex-1">
                <TaskCard
                  task={t}
                  members={members}
                  onToggleStatus={onToggleStatus}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleSubtaak={onToggleSubtaak}
                  selectable={selectable}
                  selected={isSelected(t.id)}
                  onToggleSelect={onToggleSelect}
                  compact
                />
              </div>
            </div>
          )
        })}
      </div>

      {tasks.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Geen taken zichtbaar met de huidige filters.
        </p>
      ) : null}

      {/* Trouwdag-eindpunt */}
      <div className="relative mt-3 flex items-center gap-4 py-2">
        <span className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white">
          <span className="text-[10px]">♥</span>
        </span>
        <span className="font-serif text-base font-medium text-foreground">
          Trouwdag · {formatDatumKort(wedding.trouwdatum)}
        </span>
      </div>
    </div>
  )
}
