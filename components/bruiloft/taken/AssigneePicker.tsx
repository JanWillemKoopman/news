'use client'

import * as React from 'react'
import { Check, Users } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { ID, WeddingMember } from '@/lib/bruiloft/types'

import { AvatarStack, initialsFor } from './AvatarStack'

interface AssigneePickerProps {
  value: ID[]
  members: WeddingMember[]
  onChange: (next: ID[]) => void
  placeholder?: string
}

export function AssigneePicker({
  value,
  members,
  onChange,
  placeholder = 'Niemand toegewezen',
}: AssigneePickerProps) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selected = members.filter((m) => value.includes(m.userId))

  const toggle = (id: ID) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id))
    else onChange([...value, id])
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm',
          'hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
      >
        {selected.length > 0 ? (
          <>
            <AvatarStack members={selected} />
            <span className="truncate text-foreground">
              {selected.length === 1
                ? selected[0].displayName || selected[0].email
                : `${selected.length} toegewezen`}
            </span>
          </>
        ) : (
          <>
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{placeholder}</span>
          </>
        )}
      </button>

      {open ? (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
          {members.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Geen leden — nodig eerst iemand uit via Beheer.
            </p>
          ) : (
            members.map((m) => {
              const checked = value.includes(m.userId)
              return (
                <button
                  key={m.userId}
                  type="button"
                  onClick={() => toggle(m.userId)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent/40"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border">
                    {checked ? <Check className="h-3.5 w-3.5" /> : null}
                  </span>
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-medium text-secondary-foreground">
                    {initialsFor(m)}
                  </span>
                  <span className="truncate">{m.displayName || m.email}</span>
                </button>
              )
            })
          )}
        </div>
      ) : null}
    </div>
  )
}
