// Nederlandse formattering voor bedragen en datums.

const euroFormatter = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const euroFormatterCents = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatEuro(bedrag: number, opts?: { cents?: boolean }): string {
  const value = Number.isFinite(bedrag) ? bedrag : 0
  return opts?.cents ? euroFormatterCents.format(value) : euroFormatter.format(value)
}

const dateFormatter = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const dateFormatterShort = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function toDate(value: string | Date): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDatumNL(value: string | Date): string {
  const d = toDate(value)
  return d ? dateFormatter.format(d) : ''
}

export function formatDatumKort(value: string | Date): string {
  const d = toDate(value)
  return d ? dateFormatterShort.format(d) : ''
}

// Aantal dagen tot een datum (negatief = in het verleden).
export function dagenTot(value: string | Date): number {
  const d = toDate(value)
  if (!d) return 0
  const today = new Date()
  const a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const b = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((a - b) / 86_400_000)
}

// Leesbaar label voor een aantal dagen t.o.v. vandaag (positief = toekomst).
export function dagLabel(dagen: number): string {
  if (dagen === 0) return 'vandaag'
  if (dagen > 0) return `over ${dagen} ${dagen === 1 ? 'dag' : 'dagen'}`
  const laat = Math.abs(dagen)
  return `${laat} ${laat === 1 ? 'dag' : 'dagen'} te laat`
}

// Korte, Nederlandse "tijd geleden" voor de activiteitenfeed.
export function tijdGeleden(value: string | Date): string {
  const d = toDate(value)
  if (!d) return ''
  const sec = Math.round((Date.now() - d.getTime()) / 1000)
  if (sec < 45) return 'zojuist'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} min geleden`
  const uur = Math.round(min / 60)
  if (uur < 24) return `${uur} uur geleden`
  const dag = Math.round(uur / 24)
  if (dag < 7) return `${dag} ${dag === 1 ? 'dag' : 'dagen'} geleden`
  return formatDatumKort(d)
}
