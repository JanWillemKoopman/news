import { capFirst, cn } from '@/lib/utils'

// Eén betekenisvolle kleur: rose voor "vraagt aandacht", verder overal
// hetzelfde neutrale grijs. Status wordt onderscheiden door de tekst zelf,
// niet door een eigen kleur per waarde — zo blijft rose herkenbaar als
// signaal in plaats van decoratie.
type Tone = 'neutral' | 'attention'

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-foreground/[0.06] text-muted-foreground ring-foreground/10',
  attention: 'bg-rose-500/10 text-rose-700 ring-rose-600/20 dark:text-rose-300 dark:ring-rose-400/20',
}

type Kind = 'rsvp' | 'taak' | 'leverancier' | 'prioriteit'

const tones: Record<Kind, Record<string, Tone>> = {
  rsvp: {
    bevestigd: 'neutral',
    afgemeld: 'attention',
    'geen reactie': 'attention',
    uitgenodigd: 'neutral',
    'nog niet uitgenodigd': 'attention',
  },
  taak: {
    open: 'neutral',
    bezig: 'neutral',
    klaar: 'neutral',
  },
  leverancier: {
    'te bezoeken': 'neutral',
    bezocht: 'neutral',
    'offerte aangevraagd': 'neutral',
    geboekt: 'neutral',
    afgewezen: 'attention',
  },
  prioriteit: {
    laag: 'neutral',
    midden: 'neutral',
    hoog: 'neutral',
  },
}

interface StatusBadgeProps {
  kind: Kind
  value: string
  className?: string
}

export function StatusBadge({ kind, value, className }: StatusBadgeProps) {
  const tone = tones[kind][value] ?? 'neutral'
  const label = kind === 'taak' && value === 'bezig' ? 'In uitvoering' : capFirst(value)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-1.5 py-0.5 md:px-2.5 text-xs font-medium ring-1 ring-inset',
        toneClasses[tone],
        className
      )}
    >
      {label}
    </span>
  )
}
