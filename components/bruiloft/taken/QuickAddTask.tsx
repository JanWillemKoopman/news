'use client'

import { Plus } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { ISODate } from '@/lib/bruiloft/types'

interface QuickAddTaskProps {
  defaultDeadline: ISODate
  onOpenForm: (deadline: ISODate) => void
  className?: string
}

export function QuickAddTask({ defaultDeadline, onOpenForm, className }: QuickAddTaskProps) {
  return (
    <button
      type="button"
      onClick={() => onOpenForm('')}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground',
        className
      )}
    >
      <Plus className="h-4 w-4 shrink-0" />
      Taak toevoegen
    </button>
  )
}
