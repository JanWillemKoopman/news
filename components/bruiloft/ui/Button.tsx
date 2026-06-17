import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

// Riley & Grey-stijl knoppen: vlakke dusty-rose primaire knop met lichte
// hover-schaling, krapte typografie en `rounded-md` (6px) hoeken. Outline en
// ghost-varianten houden zich in en gebruiken de standaard tekstkleuren.
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-[transform,color,background-color,box-shadow] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:scale-[1.02] focus-visible:outline-primary',
        outline:
          'border border-input bg-background text-foreground hover:bg-accent hover:border-border focus-visible:outline-ring',
        ghost:
          'text-foreground hover:bg-accent focus-visible:outline-ring',
        secondary:
          'bg-header-bg text-white hover:bg-header-active focus-visible:outline-ring',
        destructive:
          'bg-destructive text-white shadow-sm hover:bg-destructive/90 focus-visible:outline-destructive',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3 text-[13px]',
        lg: 'h-11 px-5 text-[15px]',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    // Met asChild verwacht Radix Slot exact één child; toon dan geen spinner.
    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Comp>
      )
    }
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span className="sr-only">Laden…</span>
          </>
        ) : null}
        {children}
      </Comp>
    )
  }
)
Button.displayName = 'WeddingButton'

export { buttonVariants }
