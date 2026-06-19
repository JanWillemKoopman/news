'use client'

import * as React from 'react'
import { Download, Share, X } from 'lucide-react'

import { Button } from '@/components/bruiloft/ui'
import { profielIsCompleet } from '@/lib/bruiloft/profiel'
import { useBruiloftStore } from '@/store/bruiloftStore'

// Na wegklikken blijft de install-uitnodiging een week weg.
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000
const DISMISS_KEY = 'install-prompt-dismissed'

// Chrome's beforeinstallprompt zit niet in de standaard DOM-typings.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function recentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    return !!raw && Date.now() - Number(raw) < DISMISS_MS
  } catch {
    return false
  }
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

// iOS heeft geen beforeinstallprompt; alleen Safari toont "Zet op beginscherm".
function isIOSSafari(): boolean {
  const ua = navigator.userAgent
  const ios =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const anderBrowser = /CriOS|FxiOS|EdgiOS/.test(ua)
  return ios && !anderBrowser
}

// Zwevende, wegklikbare uitnodiging om de app te installeren. App-breed gemount
// in WeddingShell. Verschijnt alleen wanneer het profiel compleet is, zodat de
// ProfielNudge voorrang houdt en er nooit twee kaartjes tegelijk staan.
export function InstallPrompt() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const [mode, setMode] = React.useState<'none' | 'android' | 'ios'>('none')
  const deferred = React.useRef<BeforeInstallPromptEvent | null>(null)

  React.useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return

    function onBeforeInstall(e: Event) {
      e.preventDefault()
      deferred.current = e as BeforeInstallPromptEvent
      setMode('android')
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    if (isIOSSafari()) setMode('ios')

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  if (mode === 'none' || !wedding || !profielIsCompleet(wedding)) return null

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // localStorage niet beschikbaar; gewoon verbergen.
    }
    setMode('none')
  }

  async function install() {
    const evt = deferred.current
    if (!evt) return
    await evt.prompt()
    const { outcome } = await evt.userChoice
    deferred.current = null
    dismiss()
    if (outcome === 'accepted' && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission().catch(() => {})
    }
  }

  return (
    <div className="wedding fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:justify-end sm:px-0">
      <div className="w-full max-w-sm animate-slide-up rounded-xl border border-border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rhino-50 text-rhino-800">
            {mode === 'ios' ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Installeer Ons Trouwplan</p>
            {mode === 'android' ? (
              <>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Zet de app op je beginscherm voor snelle toegang en een fullscreen-weergave.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={install}>
                    Installeer de app
                  </Button>
                  <Button size="sm" variant="ghost" onClick={dismiss}>
                    Later
                  </Button>
                </div>
              </>
            ) : (
              <p className="mt-0.5 text-sm text-muted-foreground">
                Tik op <Share className="inline h-4 w-4 align-text-bottom" /> Deel en kies{' '}
                <span className="font-medium text-foreground">‘Zet op beginscherm’</span>.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Sluiten"
            className="-mr-1 -mt-1 shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
