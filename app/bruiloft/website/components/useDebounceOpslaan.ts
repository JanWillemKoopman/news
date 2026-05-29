'use client'

import * as React from 'react'

export type OpslaanStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useDebounceOpslaan<T extends object>(
  opslaan: (patch: Partial<T>) => Promise<void>,
  vertraging = 700
) {
  const pendingRef = React.useRef<Partial<T>>({})
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [status, setStatus] = React.useState<OpslaanStatus>('idle')

  const flush = React.useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const patch = pendingRef.current
    pendingRef.current = {} as Partial<T>
    if (Object.keys(patch).length === 0) return
    setStatus('saving')
    try {
      await opslaan(patch)
      setStatus('saved')
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setStatus('idle'), 2000)
    } catch {
      pendingRef.current = { ...patch, ...pendingRef.current }
      setStatus('error')
    }
  }, [opslaan])

  React.useEffect(() => {
    return () => { void flush() }
  }, [flush])

  const stel = React.useCallback((patch: Partial<T>) => {
    pendingRef.current = { ...pendingRef.current, ...patch }
    setStatus('saving')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { void flush() }, vertraging)
  }, [flush, vertraging])

  return { stel, flush, status }
}
