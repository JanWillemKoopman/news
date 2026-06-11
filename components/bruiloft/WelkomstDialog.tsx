'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ListChecks, PartyPopper } from 'lucide-react'

import { toonStartgids } from '@/components/bruiloft/OnboardingGids'
import { Button, Modal } from '@/components/bruiloft/ui'
import { formatDatumNL } from '@/lib/bruiloft/format'
import { canEdit } from '@/lib/bruiloft/permissions'
import { alleVoorstellen } from '@/lib/bruiloft/taken/voorstellen'
import { useBruiloftStore } from '@/store/bruiloftStore'

const GEZIEN_PREFIX = 'otp:welkom-gezien:'
// Alleen tonen vlak na het aanmaken; bestaande bruiloften krijgen geen
// welkomstdialoog met terugwerkende kracht.
const MAX_LEEFTIJD_DAGEN = 14

// Eenmalig welkomstmoment direct na de onboarding: vertelt wat er is
// klaargezet en biedt begeleiding aan — maar dringt die niet op.
export function WelkomstDialog() {
  const router = useRouter()
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

  const startSamenstellen = () => {
    toonStartgids(wedding.id)
    sluit()
    router.push('/bruiloft/taken?samenstellen=1')
  }

  const aantalVoorstellen = alleVoorstellen(wedding, tasks).length

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
            {formatDatumNL(wedding.trouwdatum)}) hebben we{' '}
            {aantalVoorstellen > 0 ? `${aantalVoorstellen} taakvoorstellen` : 'een takenlijst'}{' '}
            voor jullie klaargezet — jullie kiezen zelf, kaart voor kaart, welke relevant zijn.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Zullen we samen jullie takenlijst samenstellen? Het hoeft niet: zelf rondkijken kan ook,
          en de voorstellen blijven klaarstaan op de takenpagina.
        </p>
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={sluit}>
            Ik kijk zelf rond
          </Button>
          <Button onClick={startSamenstellen}>
            <ListChecks className="h-4 w-4" /> Stel jullie takenlijst samen
          </Button>
        </div>
      </div>
    </Modal>
  )
}
