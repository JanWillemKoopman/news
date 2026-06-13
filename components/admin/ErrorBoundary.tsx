'use client'

import * as React from 'react'
import * as Sentry from '@sentry/nextjs'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Sentry krijgt de volledige fout met component-stack voor leesbare traces
    Sentry.captureException(error, {
      extra: { componentStack: info.componentStack },
    })

    // Eigen dashboard voor gebruikersattributie (directe fetch, niet via trackError,
    // om dubbele Sentry-melding te voorkomen)
    void fetch('/api/admin/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'error',
        message: error.message,
        stack: error.stack,
        path: typeof window !== 'undefined' ? window.location.pathname : undefined,
        component: info.componentStack?.split('\n')[1]?.trim() ?? undefined,
        metadata: { componentStack: info.componentStack },
      }),
    }).catch(() => {})
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null
    }
    return this.props.children
  }
}
