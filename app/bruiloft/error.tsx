'use client'

import { WifiOff } from 'lucide-react'

export default function BruiloftError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="wedding flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <WifiOff className="h-7 w-7" />
      </div>
      <h2 className="mt-5 font-serif text-3xl font-medium text-foreground">Er ging iets mis</h2>
      <p className="mt-2 max-w-sm text-muted-foreground">
        {error.message || 'Controleer je verbinding en probeer het opnieuw.'}
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
      >
        Opnieuw proberen
      </button>
    </div>
  )
}
