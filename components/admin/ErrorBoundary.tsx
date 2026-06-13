'use client'

import * as React from 'react'
import { trackError } from '@/lib/analytics'

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
    void trackError(error.message, {
      level: 'error',
      stack: error.stack,
      component: info.componentStack?.split('\n')[1]?.trim() ?? undefined,
      metadata: { componentStack: info.componentStack },
    })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null
    }
    return this.props.children
  }
}
