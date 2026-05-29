'use client'

import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold text-gray-900">Er is iets misgegaan</h1>
      <p className="mt-2 max-w-sm text-sm text-gray-500">
        {error.message || 'Er trad een onverwachte fout op. Probeer de pagina opnieuw te laden.'}
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
      >
        Probeer opnieuw
      </button>
    </div>
  )
}
