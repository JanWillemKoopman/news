import { formatEuro } from '@/lib/bruiloft/format'
import { cn } from '@/lib/utils'

interface MoneyProps {
  bedrag: number
  cents?: boolean
  className?: string
}

// Eén manier om een bedrag in euro te tonen (Nederlandse notatie).
export function Money({ bedrag, cents, className }: MoneyProps) {
  return (
    <span className={cn('tabular-nums', className)}>{formatEuro(bedrag, { cents })}</span>
  )
}
