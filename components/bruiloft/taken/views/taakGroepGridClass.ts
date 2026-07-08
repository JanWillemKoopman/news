import { cn } from '@/lib/utils'
import type { KolomAantal } from '@/components/bruiloft/ui'

// Zet een verticale kaartenstapel om in een grid van 2 of 3 kolommen, zodat
// taken uit dezelfde groep (bv. maand) naast elkaar staan i.p.v. onder elkaar.
export function taakGroepGridClass(kolommen: KolomAantal): string {
  return cn(
    kolommen === 1 && 'space-y-2',
    kolommen === 2 && 'grid grid-cols-1 items-start gap-2 sm:grid-cols-2',
    kolommen === 3 && 'grid grid-cols-1 items-start gap-2 sm:grid-cols-2 xl:grid-cols-3'
  )
}
