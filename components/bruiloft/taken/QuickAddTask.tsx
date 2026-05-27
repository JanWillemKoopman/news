'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'

import { Button, Input } from '@/components/bruiloft/ui'
import type { ISODate } from '@/lib/bruiloft/types'

interface QuickAddTaskProps {
  defaultDeadline: ISODate
  onAdd: (titel: string, deadline: ISODate) => Promise<void> | void
  placeholder?: string
}

export function QuickAddTask({
  defaultDeadline,
  onAdd,
  placeholder = '+ Snel taak toevoegen…',
}: QuickAddTaskProps) {
  const [titel, setTitel] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const t = titel.trim()
    if (!t || busy) return
    setBusy(true)
    try {
      await onAdd(t, defaultDeadline)
      setTitel('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 pl-9">
      <Input
        value={titel}
        onChange={(e) => setTitel(e.target.value)}
        placeholder={placeholder}
        className="h-9"
        disabled={busy}
      />
      <Button type="submit" size="icon" variant="ghost" aria-label="Toevoegen" disabled={busy}>
        <Plus className="h-4 w-4" />
      </Button>
    </form>
  )
}
