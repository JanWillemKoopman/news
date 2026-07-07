'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'

interface UseHoverMegaMenuResult {
  open: boolean
  setOpen: (open: boolean) => void
  containerRef: React.RefObject<HTMLDivElement>
  panelRef: React.RefObject<HTMLDivElement>
  handleMouseEnter: () => void
  handleMouseLeave: () => void
  handleTriggerClick: (e: React.MouseEvent) => void
}

// Gedeelde open/dicht-logica voor de hover-uitklapmenu's in de donkere
// header (Leveranciers-megamenu en de eenvoudigere sectiemenu's). Opent bij
// hover (met een korte sluitvertraging zodat de muis naar het paneel kan
// bewegen) en bij klik; focust het eerste item alleen bij toetsenbord-
// activatie (anders krijgt de trigger een ongewenste focusring bij hoveren).
// Sluit bij wegbewegen van de muis, Escape, klik/tik buiten het menu, of een
// routewissel.
export function useHoverMegaMenu(): UseHoverMegaMenuResult {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)
  const closeTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const openedViaToetsenbord = React.useRef(false)

  function clearCloseTimeout() {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current)
      closeTimeout.current = null
    }
  }

  function openNow() {
    clearCloseTimeout()
    setOpen(true)
  }

  function scheduleClose() {
    clearCloseTimeout()
    closeTimeout.current = setTimeout(() => setOpen(false), 150)
  }

  function handleMouseEnter() {
    openedViaToetsenbord.current = false
    openNow()
  }

  function handleTriggerClick(e: React.MouseEvent) {
    openedViaToetsenbord.current = e.detail === 0
    openNow()
  }

  React.useEffect(() => {
    setOpen(false)
  }, [pathname])

  React.useEffect(() => clearCloseTimeout, [])

  React.useEffect(() => {
    if (!open) return
    const el = panelRef.current
    if (!el) return

    const focusable = () =>
      Array.from(el.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]'))

    if (openedViaToetsenbord.current) {
      focusable()[0]?.focus()
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      }
    }

    // Sluit ook bij een klik/tik buiten menu en trigger — voor toetsenbord- en
    // touch-gebruikers, die geen mouseleave krijgen.
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  return {
    open,
    setOpen,
    containerRef,
    panelRef,
    handleMouseEnter,
    handleMouseLeave: scheduleClose,
    handleTriggerClick,
  }
}
