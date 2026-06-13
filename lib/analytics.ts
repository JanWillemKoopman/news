'use client'

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

// Stuur een foutmelding naar de server.
export async function trackError(
  message: string,
  options?: {
    level?: 'error' | 'warning' | 'info'
    stack?: string
    component?: string
    metadata?: Record<string, unknown>
  }
) {
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
