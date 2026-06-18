'use client'

import * as React from 'react'
import { Trash2, X } from 'lucide-react'

import { Button, Input, Select } from '@/components/bruiloft/ui'
import { TASK_STATUSSEN } from '@/lib/bruiloft/options'
import type { TaskStatus } from '@/lib/bruiloft/types'

interface BulkActionsBarProps {
  aantal: number
  onClear: () => void
  onSetStatus: (status: TaskStatus) => Promise<void> | void
  onShiftDeadline: (dagen: number) => Promise<void> | void
  onDelete: () => Promise<void> | void
}

export function BulkActionsBar({
  aantal,
  onClear,
  onSetStatus,
  onShiftDeadline,
  onDelete,
}: BulkActionsBarProps) {
  const [shift, setShift] = React.useState('7')
  const [busy, setBusy] = React.useState(false)

  const run = async (fn: () => Promise<void> | void) => {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 mx-auto w-[min(96vw,720px)] rounded-xl border border-border bg-card p-3 shadow-lg md:bottom-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-2 text-sm font-medium">{aantal} geselecteerd</span>
        <Select
          aria-label="Status wijzigen"
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value
            if (v) {
              run(() => onSetStatus(v as TaskStatus))
              e.target.value = ''
            }
          }}
          className="h-8 w-auto"
          disabled={busy}
        >
          <option value="" disabled>
            Status →
          </option>
          {TASK_STATUSSEN.map((s) => (
            <option key={s} value={s}>
              Markeer als {s}
            </option>
          ))}
        </Select>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={shift}
            onChange={(e) => setShift(e.target.value)}
            className="h-8 w-16"
            disabled={busy}
          />
          <span className="text-xs text-muted-foreground">dagen</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => run(() => onShiftDeadline(Number(shift) || 0))}
            disabled={busy}
          >
            Verschuif
          </Button>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => run(onDelete)}
          disabled={busy}
          className="text-rose-600 hover:bg-rose-50"
        >
          <Trash2 className="h-4 w-4" /> Verwijder
        </Button>
        <Button size="sm" variant="ghost" onClick={onClear} className="ml-auto">
          <X className="h-4 w-4" /> Annuleren
        </Button>
      </div>
    </div>
  )
}
