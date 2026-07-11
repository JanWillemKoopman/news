'use client'

import { capFirst, cn } from '@/lib/utils'

interface MoodboardCategorieFilterProps {
  categorieen: { naam: string; aantal: number }[]
  actief: string | null // null = "Alles"
  onChange: (categorie: string | null) => void
}

// Simpele, altijd-zichtbare chiprij (geen dropdown) — bij een handjevol
// categorieën is direct zien/kiezen sneller dan eerst een menu openen. Toont
// alleen categorieën die daadwerkelijk in gebruik zijn.
export function MoodboardCategorieFilter({ categorieen, actief, onChange }: MoodboardCategorieFilterProps) {
  return (
    <div className="mb-5 flex flex-wrap gap-1.5" role="group" aria-label="Filter op categorie">
      <Chip label="Alles" actief={actief === null} onClick={() => onChange(null)} />
      {categorieen.map((c) => (
        <Chip
          key={c.naam}
          label={`${capFirst(c.naam)} (${c.aantal})`}
          actief={actief === c.naam}
          onClick={() => onChange(actief === c.naam ? null : c.naam)}
        />
      ))}
    </div>
  )
}

function Chip({ label, actief, onClick }: { label: string; actief: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actief}
      className={cn(
        'rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        actief
          ? 'border-rhino-800 bg-rhino-800 text-white'
          : 'border-input bg-background text-foreground hover:bg-muted'
      )}
    >
      {label}
    </button>
  )
}
