import * as React from 'react'

import { cn } from '@/lib/utils'

// Verfijnde kaart voor de bruiloftplanner: hairline-rand + zachte elevatie.
// Layout-subcomponenten komen van de gedeelde primitive.
export {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-border bg-card text-card-foreground shadow-sm',
        interactive &&
          'cursor-pointer transition-[box-shadow,transform,border-color] duration-150 ease-premium hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.35)] hover:shadow-md',
        className
      )}
      {...props}
    />
  )
)
Card.displayName = 'WeddingCard'
