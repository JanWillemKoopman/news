'use client'

import * as React from 'react'

// Gedeeld sluitgedrag voor verankerde panelen (filters, dropdowns): klik
// buiten het paneel (pointerdown, zodat ook touch meteen sluit) of Escape.
// Zelfde gedrag als OverflowMenu, zodat elk paneel in de app identiek reageert.
export function useDismiss(
  open: boolean,
  onClose: () => void,
  ...refs: React.RefObject<HTMLElement | null>[]
) {
  React.useEffect(() => {
    if (!open) return
    function pointerHandler(e: PointerEvent) {
      const target = e.target as Node
      if (refs.some((r) => r.current?.contains(target))) return
      onClose()
    }
    function keyHandler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', pointerHandler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('pointerdown', pointerHandler)
      document.removeEventListener('keydown', keyHandler)
    }
    // refs zijn stabiele React-refs; alleen open/onClose triggeren re-binding.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose])
}
