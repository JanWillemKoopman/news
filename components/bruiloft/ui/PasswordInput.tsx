'use client'

import { Eye, EyeOff } from 'lucide-react'
import * as React from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// Wachtwoordveld met toon/verberg-toggle: voorkomt typefouten (vooral op
// mobiel) zonder dat het wachtwoord standaard zichtbaar is.
export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>
>(({ className, ...props }, ref) => {
  const [zichtbaar, setZichtbaar] = React.useState(false)

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={zichtbaar ? 'text' : 'password'}
        className={cn('pr-10', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setZichtbaar((v) => !v)}
        aria-label={zichtbaar ? 'Wachtwoord verbergen' : 'Wachtwoord tonen'}
        aria-pressed={zichtbaar}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-r-md"
      >
        {zichtbaar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
})
PasswordInput.displayName = 'PasswordInput'

// Live wachtwoord-eis: toont de minimale lengte als hint en kleurt groen
// zodra eraan voldaan is, zodat de eis niet pas na submit duidelijk wordt.
export function PasswordHint({ password, minLength = 8 }: { password: string; minLength?: number }) {
  const voldoet = password.length >= minLength
  return (
    <p
      className={cn(
        'flex items-center gap-1 text-xs transition-colors',
        password.length === 0 ? 'text-muted-foreground' : voldoet ? 'text-emerald-600' : 'text-amber-600'
      )}
    >
      <span aria-hidden>{voldoet ? '✓' : '•'}</span>
      Minimaal {minLength} tekens
    </p>
  )
}
