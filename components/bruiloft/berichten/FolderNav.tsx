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

// Categorieën in de stijl van een echte mailbox: op desktop een verticale
// mapjeslijst (zoals Gmail/Outlook) bovenaan de berichtenlijst-kolom, op
// mobiel een horizontale, scrollbare rij — zodat vijf mappen nooit wrappen
// naar een rommelige tweede regel.
export function FolderNav({ folder, onChange, ongelezenPostvakIn }: FolderNavProps) {
  return (
    <>
      <nav aria-label="Mappen" className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2 md:hidden">
        {FOLDERS.map((f) => (
          <FolderKnop
            key={f.key}
            def={f}
            actief={folder === f.key}
            count={f.key === 'postvak-in' ? ongelezenPostvakIn : 0}
            onClick={() => onChange(f.key)}
            variant="pill"
          />
        ))}
      </nav>
      <nav aria-label="Mappen" className="hidden shrink-0 flex-col gap-0.5 border-b border-border p-2 md:flex">
        {FOLDERS.map((f) => (
          <FolderKnop
            key={f.key}
            def={f}
            actief={folder === f.key}
            count={f.key === 'postvak-in' ? ongelezenPostvakIn : 0}
            onClick={() => onChange(f.key)}
            variant="rij"
          />
        ))}
      </nav>
    </>
  )
}

function FolderKnop({
  def,
  actief,
  count,
  onClick,
  variant,
}: {
  def: FolderDef
  actief: boolean
  count: number
  onClick: () => void
  variant: 'pill' | 'rij'
}) {
  const Icon = def.icon
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actief}
      className={cn(
        'flex shrink-0 items-center gap-2 text-sm transition-colors',
        variant === 'pill' ? 'rounded-full border px-3 py-1.5' : 'w-full rounded-md px-3 py-2 text-left',
        actief
          ? variant === 'pill'
            ? 'border-foreground/20 bg-muted text-foreground'
            : 'bg-muted font-medium text-foreground'
          : variant === 'pill'
            ? 'border-border bg-background text-muted-foreground hover:border-rose-200'
            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{def.label}</span>
      {count > 0 ? <span className="text-xs font-semibold text-rose-600">{count}</span> : null}
    </button>
  )
}
