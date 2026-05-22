import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  titel: string
  beschrijving?: string
  actie?: React.ReactNode
  className?: string
}

// Vriendelijke lege staat: een uitnodiging om te beginnen i.p.v. een leeg scherm.
export function EmptyState({
  icon: Icon,
  titel,
  beschrijving,
  actie,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center',
        className
      )}
    >
      {Icon ? (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-7 w-7" />
        </div>
      ) : null}
      <h3 className="font-serif text-xl text-foreground">{titel}</h3>
      {beschrijving ? (
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{beschrijving}</p>
      ) : null}
      {actie ? <div className="mt-6">{actie}</div> : null}
    </div>
  )
}
