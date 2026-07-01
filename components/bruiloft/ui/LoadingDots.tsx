import { cn } from '@/lib/utils'

// Consistente laad-visualisatie voor content-laadmomenten (AI-advies,
// AI-suggesties, analyses): drie op-en-neer bewegende bolletjes in de
// donkerblauwe headerkleur.
export function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className="h-2 w-2 rounded-full bg-header-bg animate-bounce [animation-delay:-0.3s]" />
      <span className="h-2 w-2 rounded-full bg-header-bg animate-bounce [animation-delay:-0.15s]" />
      <span className="h-2 w-2 rounded-full bg-header-bg animate-bounce" />
    </div>
  )
}
