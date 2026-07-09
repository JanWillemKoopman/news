'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

// Vangt fouten op in de root layout zelf (buiten <ErrorBoundary>).
// Heeft een eigen <html>/<body> nodig omdat de root layout niet beschikbaar is.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="nl">
      <body className="flex min-h-screen flex-col items-center justify-center px-4 text-center bg-white text-gray-900">
        <h1 className="text-2xl font-semibold">Er is iets misgegaan</h1>
        <p className="mt-2 text-sm text-gray-500">
          {error.message || 'Probeer de pagina opnieuw te laden.'}
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Probeer opnieuw
        </button>
      </body>
    </html>
  )
}
