'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { ScrollContainerContext } from '@/lib/bruiloft/scroll-context'
import { useBruiloftStore } from '@/store/bruiloftStore'

const THRESHOLD = 72

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const ref = React.useContext(ScrollContainerContext)
  const retryInit = useBruiloftStore((s) => s.retryInit)

  const [pullY, setPullY] = React.useState(0)
  const [refreshing, setRefreshing] = React.useState(false)

  // Refs prevent stale closures inside touch handlers (pullY changes on every touchmove)
  const pullYRef = React.useRef(0)
  const refreshingRef = React.useRef(false)

  React.useEffect(() => {
    const el = ref?.current
    if (!el) return

    let startY = 0
    let pulling = false

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop > 0) return
      startY = e.touches[0].clientY
      pulling = true
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling || refreshingRef.current) return
      const delta = e.touches[0].clientY - startY
      if (delta > 0 && el.scrollTop === 0) {
        const next = Math.min(THRESHOLD, delta * 0.4)
        pullYRef.current = next
        setPullY(next)
      }
    }

    const onTouchEnd = async () => {
      if (!pulling) return
      pulling = false
      if (pullYRef.current >= THRESHOLD) {
        refreshingRef.current = true
        setRefreshing(true)
        pullYRef.current = 0
        setPullY(0)
        try {
          await retryInit()
        } finally {
          refreshingRef.current = false
          setRefreshing(false)
        }
      } else {
        pullYRef.current = 0
        setPullY(0)
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [ref, retryInit])

  const indicatorVisible = pullY > 0 || refreshing
  const progress = Math.min(1, pullY / THRESHOLD)

  return (
    <>
      <div
        aria-live="polite"
        aria-label={refreshing ? 'Vernieuwen...' : undefined}
        style={{
          height: refreshing ? THRESHOLD : pullY,
          transition: pullY === 0 ? 'height 200ms ease' : undefined,
          overflow: 'hidden',
        }}
        className="flex items-center justify-center text-sm text-muted-foreground"
      >
        {indicatorVisible && (
          refreshing
            ? <Loader2 className="h-5 w-5 animate-spin" />
            : <Loader2
                className="h-5 w-5"
                style={{ opacity: progress, transform: `rotate(${progress * 180}deg)` }}
              />
        )}
      </div>
      {children}
    </>
  )
}
