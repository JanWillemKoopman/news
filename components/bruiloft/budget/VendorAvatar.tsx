import { cn } from '@/lib/utils'
import { initialsFor } from '@/components/bruiloft/taken/AvatarStack'
import type { Vendor } from '@/lib/bruiloft/types'

// Klein avatarpatroon voor leveranciers op budgetitems. Hergebruikt de
// geëxporteerde initialsFor()-helper uit AvatarStack.tsx; het hash-kleuren-
// palet zelf is daar niet los geëxporteerd (module-lokaal, niet voor
// hergebruik bedoeld), dus die kleine logica wordt hier bewust gedupliceerd
// i.p.v. AvatarStack te wijzigen om iets te exporteren wat het niet voor
// bedoeld is.

const PALET = [
  'bg-rose-200 text-rose-900',
  'bg-amber-200 text-amber-900',
  'bg-emerald-200 text-emerald-900',
  'bg-sky-200 text-sky-900',
  'bg-violet-200 text-violet-900',
  'bg-stone-300 text-stone-900',
]

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

interface VendorAvatarProps {
  vendor: Vendor
  size?: 'sm' | 'md'
  className?: string
}

export function VendorAvatar({ vendor, size = 'sm', className }: VendorAvatarProps) {
  const dim = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs'
  const kleur = PALET[hashCode(vendor.id) % PALET.length]

  return (
    <span
      title={vendor.naam}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-medium ring-2 ring-card',
        dim,
        kleur,
        className
      )}
    >
      {initialsFor({ displayName: vendor.naam, email: vendor.email })}
    </span>
  )
}
