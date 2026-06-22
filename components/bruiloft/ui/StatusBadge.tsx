import { capFirst, cn } from '@/lib/utils'

type Tone = 'green' | 'amber' | 'red' | 'blue' | 'grey' | 'terracotta' | 'white' | 'lightgrey'

// Ingetogen, cohesieve tonen: zachte vulling + inset-ring + statusstip.
const toneClasses: Record<Tone, string> = {
  green:
    'bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:text-emerald-300 dark:ring-emerald-400/20',
  amber:
    'bg-amber-500/10 text-amber-700 ring-amber-600/20 dark:text-amber-300 dark:ring-amber-400/20',
  red: 'bg-rose-500/10 text-rose-700 ring-rose-600/20 dark:text-rose-300 dark:ring-rose-400/20',
  blue: 'bg-sky-500/10 text-sky-700 ring-sky-600/20 dark:text-sky-300 dark:ring-sky-400/20',
  grey: 'bg-foreground/[0.06] text-muted-foreground ring-foreground/10',
  terracotta: 'bg-primary/10 text-primary ring-primary/20',
  white: 'bg-white text-muted-foreground ring-foreground/15 dark:bg-white/95 dark:text-stone-700',
  lightgrey: 'bg-stone-200/70 text-stone-700 ring-stone-300 dark:bg-stone-700/40 dark:text-stone-200',
}

type Kind = 'rsvp' | 'taak' | 'leverancier' | 'prioriteit' | 'urgentie'

const tones: Record<Kind, Record<string, Tone>> = {
  rsvp: {
    bevestigd: 'green',
    afgemeld: 'red',
    'geen reactie': 'amber',
    uitgenodigd: 'blue',
  },
  taak: {
    open: 'grey',
    bezig: 'amber',
    klaar: 'green',
  },
  leverancier: {
    'te bezoeken': 'blue',
    bezocht: 'grey',
    'offerte aangevraagd': 'amber',
    geboekt: 'green',
    afgewezen: 'red',
  },
  prioriteit: {
    laag: 'white',
    midden: 'lightgrey',
    hoog: 'red',
  },
  urgentie: {
    'te laat': 'red',
    binnenkort: 'amber',
  },
}

interface StatusBadgeProps {
  kind: Kind
  value: string
  className?: string
}

export function StatusBadge({ kind, value, className }: StatusBadgeProps) {
  const tone = tones[kind][value] ?? 'grey'
  const label = kind === 'taak' && value === 'bezig' ? 'In uitvoering' : capFirst(value)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5 md:px-2.5 text-xs font-medium ring-1 ring-inset',
        toneClasses[tone],
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {label}
    </span>
  )
}
