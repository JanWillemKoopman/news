'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Gift, Globe, ListChecks, PartyPopper, UserPlus, Users } from 'lucide-react'

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

// Wat het stel hier allemaal kan — toont de breedte van de app in één oogopslag,
// zodat ze niet alleen de takenlijst zien maar ook de website, cadeaulijst etc.
const KANSEN: { icon: React.ElementType; titel: string; tekst: string }[] = [
  { icon: ListChecks, titel: 'Plannen', tekst: 'Taken op tijdlijn en budget van offerte tot betaling.' },
  { icon: Users, titel: 'Gasten & tafels', tekst: 'Gastenlijst, RSVP’s en een sleepbare tafelschikking.' },
  { icon: Globe, titel: 'Trouwwebsite', tekst: 'Een eigen pagina waar gasten direct RSVP’en.' },
  { icon: Gift, titel: 'Cadeaulijst', tekst: 'Cadeaus én een geldpotje, bijv. voor de huwelijksreis.' },
  { icon: Camera, titel: 'Fotomuur', tekst: 'Gasten uploaden foto’s via een QR-code, live op een scherm.' },
  { icon: UserPlus, titel: 'Samen plannen', tekst: 'Nodig je partner uit en plan alles samen, live bijgewerkt.' },
]

// Eenmalig welkomstmoment direct na de onboarding. Stap 1 laat zien wát er
// allemaal kan (mental model), stap 2 helpt met de eerste concrete actie — maar
// dringt niets op.
export function WelkomstDialog() {
  const router = useRouter()
  const wedding = useBruiloftStore((s) => s.wedding)
  const tasks = useBruiloftStore((s) => s.tasks)
  const permissions = useBruiloftStore((s) => s.permissions)

  const [open, setOpen] = React.useState(false)
  const [stap, setStap] = React.useState(0)

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
      {stap === 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Fijn dat jullie er zijn! Dit kunnen jullie hier allemaal doen:
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {KANSEN.map(({ icon: Icon, titel, tekst }) => (
              <li key={titel} className="flex items-start gap-2.5 rounded-lg border border-border p-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{titel}</p>
                  <p className="text-xs text-muted-foreground">{tekst}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={sluit}>
              Overslaan
            </Button>
            <Button onClick={() => setStap(1)}>Volgende</Button>
          </div>
        </div>
      ) : (
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
      )}
    </Modal>
  )
}
