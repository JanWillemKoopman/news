import * as React from 'react'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FieldProps {
  label: string
  htmlFor?: string
  children: React.ReactNode
  className?: string
  error?: string
  required?: boolean
}

// Label + control met consistente tussenruimte + optionele inline-foutmelding.
export function Field({ label, htmlFor, children, className, error, required }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="ml-0.5 text-destructive" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

// Gestileerd native <select> dat aansluit op de Input-stijl.
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm capitalize ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  >
    {children}
  </select>
))
Select.displayName = 'Select'
