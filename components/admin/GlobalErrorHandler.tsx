'use client'

import * as React from 'react'
import { trackError } from '@/lib/analytics'

// Vangt onverwerkte JS-fouten en promise-rejections op en stuurt ze naar
// het admin foutendashboard. Wordt één keer geïnstalleerd in de root layout.
export function GlobalErrorHandler() {
  React.useEffect(() => {
    function onError(event: ErrorEvent) {
      void trackError(event.message, {
        level: 'error',
        stack: event.error?.stack,
        metadata: { filename: event.filename, lineno: event.lineno, colno: event.colno },
      })
    }

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason
      const message = reason instanceof Error ? reason.message : String(reason)
      void trackError(message, {
        level: 'error',
        stack: reason instanceof Error ? reason.stack : undefined,
        metadata: { type: 'unhandledRejection' },
      })
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [])

  return null
}
