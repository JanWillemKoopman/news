import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  titel: string
  beschrijving?: string
  actie?: React.ReactNode
  secundaireActie?: React.ReactNode
  className?: string
}

// Vriendelijke lege staat: een uitnodiging om te beginnen i.p.v. een leeg scherm.
export function EmptyState({
  icon: Icon,
  titel,
  beschrijving,
  actie,
  secundaireActie,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-8 text-center sm:py-16',
        className
      )}
    >
      {Icon ? (
        <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 ring-8 ring-rose-50/50">
          <Icon className="h-7 w-7 text-rose-400" strokeWidth={1.5} />
        </span>
      ) : null}
      <h3 className="font-serif text-2xl text-foreground">{titel}</h3>
      {beschrijving ? (
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{beschrijving}</p>
      ) : null}
      {actie || secundaireActie ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actie}
          {secundaireActie}
        </div>
      ) : null}
    </div>
  )
}
