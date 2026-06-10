'use client'

import * as React from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface MeerDetailsProps {
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}

export function MeerDetails({ open, onToggle, children }: MeerDetailsProps) {
  return (
    <div className="rounded-xl border border-border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/40 rounded-xl transition-colors"
      >
        <span>Meer details</span>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
        }
      </button>
      {open && (
        <div className="space-y-4 border-t border-border px-4 pb-4 pt-3">
          {children}
        </div>
      )}
    </div>
  )
}
