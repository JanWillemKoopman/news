import { cn } from '@/lib/utils'

type Tone = 'green' | 'amber' | 'red' | 'blue' | 'grey' | 'terracotta'

const toneClasses: Record<Tone, string> = {
  green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300',
  red: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  blue: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  grey: 'bg-stone-200 text-stone-700 dark:bg-stone-700/60 dark:text-stone-200',
  terracotta: 'bg-primary/15 text-primary dark:bg-primary/25',
}

// Kleurcodering per statuswaarde. Alle waarden zijn al Nederlands, dus de
// waarde fungeert tegelijk als label.
type Kind = 'rsvp' | 'taak' | 'leverancier' | 'prioriteit'

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
    laag: 'grey',
    midden: 'amber',
    hoog: 'red',
  },
}

interface StatusBadgeProps {
  kind: Kind
  value: string
  className?: string
}

export function StatusBadge({ kind, value, className }: StatusBadgeProps) {
  const tone = tones[kind][value] ?? 'grey'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
        toneClasses[tone],
        className
      )}
    >
      {value}
    </span>
  )
}
