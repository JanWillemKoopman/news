import { cn } from '@/lib/utils'

// Subtiele laad-placeholder (warme tint, zachte puls).
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-shimmer rounded-md bg-border/60', className)} {...props} />
}
