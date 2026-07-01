'use client'

import * as React from 'react'

// Telt een getal soepel op naar de doelwaarde — klein, doelbewust
// "wow"-moment bij het laden van de Budget Briefing. Geen dependency:
// requestAnimationFrame volstaat. Animeert ook bij latere waardewijzigingen
// (bv. na een edit), vanaf de vorige weergegeven waarde.
export function useCountUp(target: number, durationMs = 700): number {
  const [waarde, setWaarde] = React.useState(0)
  const vorige = React.useRef(0)

  React.useEffect(() => {
    const van = vorige.current
    const naar = target
    if (van === naar) return

    let frame: number
    const start = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const ease = 1 - Math.pow(1 - t, 3) // ease-out cubic
      if (t < 1) {
        setWaarde(van + (naar - van) * ease)
        frame = requestAnimationFrame(tick)
      } else {
        setWaarde(naar)
        vorige.current = naar
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs])

  return waarde
}
