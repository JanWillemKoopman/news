'use client'

import * as React from 'react'
import { Compass, PartyPopper } from 'lucide-react'

import { toonStartgids } from '@/components/bruiloft/OnboardingGids'
import { Button, Modal } from '@/components/bruiloft/ui'
import { formatDatumNL } from '@/lib/bruiloft/format'
import { canEdit } from '@/lib/bruiloft/permissions'
import { useBruiloftStore } from '@/store/bruiloftStore'

const GEZIEN_PREFIX = 'otp:welkom-gezien:'
// Alleen tonen vlak na het aanmaken; bestaande bruiloften krijgen geen
// welkomstdialoog met terugwerkende kracht.
const MAX_LEEFTIJD_DAGEN = 14

// Eenmalig welkomstmoment direct na de onboarding: vertelt wat er is
// klaargezet en biedt begeleiding aan — maar dringt die niet op.
export function WelkomstDialog() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const tasks = useBruiloftStore((s) => s.tasks)
  const permissions = useBruiloftStore((s) => s.permissions)

  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    if (!wedding || !canEdit(permissions, 'taken')) return
    const leeftijdDagen = (Date.now() - new Date(wedding.createdAt).getTime()) / 86_400_000
    if (leeftijdDagen > MAX_LEEFTIJD_DAGEN) return
    try {
      if (localStorage.getItem(GEZIEN_PREFIX + wedding.id)) return
    } catch {
      return
    }
    setOpen(true)
  }, [wedding, permissions])

  if (!wedding) return null

  const sluit = () => {
    try {
      localStorage.setItem(GEZIEN_PREFIX + wedding.id, new Date().toISOString())
    } catch {
      // localStorage niet beschikbaar; negeren.
    }
    setOpen(false)
  }

  const startBegeleiding = () => {
    toonStartgids(wedding.id)
    sluit()
    // Na het sluiten van de dialoog zacht naar de gids scrollen.
    requestAnimationFrame(() => {
      document.getElementById('startgids')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const aantalTaken = tasks.length

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && sluit()}
      title={`Welkom, ${wedding.partner1Naam} & ${wedding.partner2Naam}!`}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm leading-relaxed text-foreground">
            Jullie trouwplan staat klaar. Op basis van jullie trouwdatum (
            {formatDatumNL(wedding.trouwdatum)}) hebben we alvast{' '}
            {aantalTaken > 0 ? `een takenlijst met ${aantalTaken} taken` : 'een takenlijst'}{' '}
            klaargezet, verdeeld over de maanden tot de grote dag.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Wil je dat we jullie op weg helpen met de eerste stappen — budget, gasten en de eerste
          taken? Het kan altijd, maar het hoeft niet: alles staat ook gewoon voor jullie klaar om
          zelf te ontdekken.
        </p>
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={sluit}>
            Ik kijk zelf rond
          </Button>
          <Button onClick={startBegeleiding}>
            <Compass className="h-4 w-4" /> Neem me mee langs de eerste stappen
          </Button>
        </div>
      </div>
    </Modal>
  )
}
