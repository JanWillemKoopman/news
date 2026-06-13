'use client'

import * as Sentry from '@sentry/nextjs'

// Stuur een analytics event naar de server. Faalt stil zodat tracking nooit
// de gebruikerservaring verstoort.
export async function trackEvent(
  eventType: string,
  metadata?: Record<string, unknown>
) {
  try {
    await fetch('/api/admin/log-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: eventType,
        path: typeof window !== 'undefined' ? window.location.pathname : undefined,
        metadata,
      }),
    })
  } catch {
    // Bewust leeg — tracking mag de app nooit blokkeren
  }
}

// Stuur een foutmelding naar Sentry (alerts + leesbare traces) én naar het
// eigen dashboard (gebruikersattributie). Faalt stil.
export async function trackError(
  message: string,
  options?: {
    level?: 'error' | 'warning' | 'info'
    stack?: string
    component?: string
    metadata?: Record<string, unknown>
  }
) {
  // Sentry vangt expliciete fouten op (auto-capture dekt alleen unhandled errors)
  Sentry.captureMessage(message, {
    level: options?.level ?? 'error',
    extra: {
      stack: options?.stack,
      component: options?.component,
      ...options?.metadata,
    },
  })

  // Eigen dashboard voor gebruikersattributie
  try {
    await fetch('/api/admin/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: options?.level ?? 'error',
        message,
        stack: options?.stack,
        path: typeof window !== 'undefined' ? window.location.pathname : undefined,
        component: options?.component,
        metadata: options?.metadata,
      }),
    })
  } catch {
    // Bewust leeg
  }
}
