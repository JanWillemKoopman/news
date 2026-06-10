'use client'

import * as React from 'react'
import { Check, Plus, X } from 'lucide-react'

import { Button, Input, useToast } from '@/components/bruiloft/ui'
import { cn } from '@/lib/utils'
import type { Subtaak } from '@/lib/bruiloft/types'

interface SubtakenListProps {
  subtaken: Subtaak[]
  onChange: (next: Subtaak[]) => void
  // Compact rendert kleinere checkboxen voor binnen TaskCard.
  compact?: boolean
}

function newId(): string {
  return `s_${Math.random().toString(36).slice(2, 10)}`
}

export function SubtakenList({ subtaken, onChange, compact }: SubtakenListProps) {
  const [draft, setDraft] = React.useState('')
  const { toast } = useToast()
  const subtakenRef = React.useRef(subtaken)
  React.useEffect(() => { subtakenRef.current = subtaken }, [subtaken])

  const toggle = (id: string) =>
    onChange(subtaken.map((s) => (s.id === id ? { ...s, klaar: !s.klaar } : s)))

  const rename = (id: string, titel: string) =>
    onChange(subtaken.map((s) => (s.id === id ? { ...s, titel } : s)))

  const remove = (id: string) => {
    const removed = subtaken.find((s) => s.id === id)
    const index = subtaken.findIndex((s) => s.id === id)
    onChange(subtaken.filter((s) => s.id !== id))
    if (removed) {
      toast({
        title: 'Subtaak verwijderd',
        variant: 'success',
        duration: 5000,
        action: {
          label: 'Ongedaan maken',
          onClick: () => {
            const current = subtakenRef.current
            onChange([...current.slice(0, index), removed, ...current.slice(index)])
          },
        },
      })
    }
  }

  const add = () => {
    const titel = draft.trim()
    if (!titel) return
    onChange([...subtaken, { id: newId(), titel, klaar: false }])
    setDraft('')
  }

  return (
    <div className={cn('space-y-1.5', compact && 'space-y-1')}>
      {subtaken.map((s) => (
        <div key={s.id} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggle(s.id)}
            aria-label={s.klaar ? 'Markeer als open' : 'Markeer als klaar'}
            className={cn(
              'flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors',
              s.klaar
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-border hover:border-primary'
            )}
          >
            {s.klaar ? <Check className="h-3 w-3 animate-check-pop" /> : null}
          </button>
          <Input
            value={s.titel}
            onChange={(e) => rename(s.id, e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
            className={cn('h-7 text-sm', s.klaar && 'line-through text-muted-foreground')}
          />
          <button
            type="button"
            onClick={() => remove(s.id)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Verwijderen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder="Subtaak toevoegen…"
          className="h-7 text-sm"
        />
        <Button type="button" size="icon" variant="ghost" onClick={add} aria-label="Toevoegen">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// Compacte read/toggle-versie zonder add/rename (gebruikt in TaskCard).
export function SubtakenChecklist({
  subtaken,
  onToggle,
}: {
  subtaken: Subtaak[]
  onToggle: (id: string) => void
}) {
  if (subtaken.length === 0) return null
  return (
    <ul className="mt-2 space-y-1">
      {subtaken.map((s) => (
        <li key={s.id} className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggle(s.id)
            }}
            aria-label={s.klaar ? 'Markeer subtaak als open' : 'Markeer subtaak als klaar'}
            className={cn(
              'flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors',
              s.klaar
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-border hover:border-primary'
            )}
          >
            {s.klaar ? <Check className="h-3 w-3 animate-check-pop" /> : null}
          </button>
          <span className={cn(s.klaar && 'line-through text-muted-foreground')}>{s.titel}</span>
        </li>
      ))}
    </ul>
  )
}
