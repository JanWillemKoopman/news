'use client'

import * as React from 'react'

// Stuurt onverwerkte fouten naar het eigen admin-dashboard voor gebruikersattributie.
// Sentry vangt dezelfde fouten automatisch op via sentry.client.config.ts —
// daarom wordt Sentry hier niet nogmaals aangeroepen.
async function logToCustomDashboard(
  message: string,
  stack?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await fetch('/api/admin/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'error',
        message,
        stack,
        path: typeof window !== 'undefined' ? window.location.pathname : undefined,
        metadata,
      }),
    })
  } catch {
    // Bewust leeg
  }
}

export function GlobalErrorHandler() {
  React.useEffect(() => {
    function onError(event: ErrorEvent) {
      void logToCustomDashboard(event.message, event.error?.stack, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      })
    }

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason
      const message = reason instanceof Error ? reason.message : String(reason)
      void logToCustomDashboard(
        message,
        reason instanceof Error ? reason.stack : undefined,
        { type: 'unhandledRejection' }
      )
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
