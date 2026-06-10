import * as React from 'react'

import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, inputMode, ...props }, ref) => {
    return (
      <input
        type={type}
        // type=number toont op mobiel een numeriek toetsenbord; inputMode
        // verfijnt dat tot een decimalpad en is vooral op Android merkbaar.
        inputMode={inputMode ?? (type === 'number' ? 'decimal' : undefined)}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

// Voor eigennamen en plaatsnamen: zet mobiele autocorrect/spellcheck uit zodat
// invoer als "Haghorst" niet wordt verbouwd, met een hoofdletter per woord.
// Spreid op een <Input> voor naam-, locatie- en woonplaatsvelden.
export const eigennaamInputProps = {
  autoCapitalize: 'words',
  autoCorrect: 'off',
  spellCheck: false,
} as const

export { Input }
