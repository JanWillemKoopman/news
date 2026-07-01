import * as React from 'react'

import { cn } from '@/lib/utils'

// Witte kaart met fijne grijze rand en zachte schaduw — Riley & Grey-stijl.
// Hover heeft een dunne pink-rand i.p.v. de bestaande translate, zodat de
// look rustig en zakelijk-elegant blijft.
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
          'cursor-pointer transition-[box-shadow,border-color] duration-150 ease-out hover:border-rose-300 hover:shadow-md',
        className
      )}
      {...props}
    />
  )
)
Card.displayName = 'WeddingCard'
