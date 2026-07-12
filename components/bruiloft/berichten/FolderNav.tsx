'use client'

import { Archive, FileText, Inbox, Send, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { BerichtFolder } from '@/lib/bruiloft/berichten/threads'

interface FolderDef {
  key: BerichtFolder
  label: string
  icon: LucideIcon
}

const FOLDERS: FolderDef[] = [
  { key: 'postvak-in', label: 'Postvak in', icon: Inbox },
  { key: 'verzonden', label: 'Verzonden', icon: Send },
  { key: 'concepten', label: 'Concepten', icon: FileText },
  { key: 'archief', label: 'Archief', icon: Archive },
  { key: 'verwijderd', label: 'Verwijderd', icon: Trash2 },
]

interface FolderNavProps {
  folder: BerichtFolder
  onChange: (f: BerichtFolder) => void
  ongelezenPostvakIn: number
}

// Categorieën in de stijl van een echte mailbox: één horizontale, scrollbare
// rij mapjes (zelfde idioom op mobiel en desktop) — zodat vijf mappen nooit
// wrappen naar een rommelige tweede regel.
export function FolderNav({ folder, onChange, ongelezenPostvakIn }: FolderNavProps) {
  return (
    <nav aria-label="Mappen" className="flex gap-1 overflow-x-auto px-2 py-2">
      {FOLDERS.map((f) => (
        <FolderKnop
          key={f.key}
          def={f}
          actief={folder === f.key}
          count={f.key === 'postvak-in' ? ongelezenPostvakIn : 0}
          onClick={() => onChange(f.key)}
        />
      ))}
    </nav>
  )
}

function FolderKnop({
  def,
  actief,
  count,
  onClick,
}: {
  def: FolderDef
  actief: boolean
  count: number
  onClick: () => void
}) {
  const Icon = def.icon
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actief}
      className={cn(
        'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors',
        actief
          ? 'border-foreground/20 bg-muted text-foreground'
          : 'border-border bg-background text-muted-foreground hover:border-rose-200'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{def.label}</span>
      {count > 0 ? <span className="text-xs font-semibold text-rose-600">{count}</span> : null}
    </button>
  )
}
