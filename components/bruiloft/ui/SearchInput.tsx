'use client'

import * as React from 'react'
import { Search, X } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SearchInputProps
  extends Omit<React.ComponentProps<typeof Input>, 'onChange' | 'value'> {
  value: string
  onValueChange: (v: string) => void
  /** Classes voor de buitenste wrapper (bv. "min-w-0 flex-1" in een toolbar). */
  containerClassName?: string
}

// Hét zoekveld van de app: loep links, wisknop (X) zodra er tekst staat.
// Gebruik overal hetzelfde placeholder-formaat: "Zoek …" met een echt
// beletselteken (…), geen drie losse punten.
export function SearchInput({
  value,
  onValueChange,
  containerClassName,
  className,
  ...props
}: SearchInputProps) {
  return (
    <div className={cn('relative', containerClassName)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn('pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden', className)}
        {...props}
      />
      {value ? (
        <button
          type="button"
          aria-label="Zoekopdracht wissen"
          onClick={() => onValueChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}
