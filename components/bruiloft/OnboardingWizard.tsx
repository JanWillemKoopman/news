'use client'

import * as React from 'react'
import { ArrowLeft, ArrowRight, CalendarHeart, Check, Heart, KeyRound, Users, Wallet } from 'lucide-react'

import { Button, Field, Input, useToast } from '@/components/bruiloft/ui'
import type { WeddingInput } from '@/lib/bruiloft/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

type Step = 'datum' | 'namen' | 'budget' | 'gasten' | 'account'
const STEPS: Step[] = ['datum', 'namen', 'budget', 'gasten', 'account']

const BUDGET_PRESETS = [
  { label: '< €10.000', value: 9000 },
  { label: '€10.000 – €15.000', value: 12500 },
  { label: '€15.000 – €25.000', value: 20000 },
  { label: '€25.000 – €40.000', value: 32500 },
  { label: '> €40.000', value: 50000 },
]

export function OnboardingWizard({ onBack, initialEmail = '' }: { onBack: () => void; initialEmail?: string }) {
  const completeOnboarding = useBruiloftStore((s) => s.completeOnboarding)
  const { toast } = useToast()

  const [step, setStep] = React.useState<Step>('datum')
  const [trouwdatum, setTrouwdatum] = React.useState('')
  const [partner1, setPartner1] = React.useState('')
  const [partner2, setPartner2] = React.useState('')
  const [budget, setBudget] = React.useState<number | null>(null)
  const [customBudget, setCustomBudget] = React.useState('')
  const [daggasten, setDaggasten] = React.useState('')
  const [avondgasten, setAvondgasten] = React.useState('')
  const [email, setEmail] = React.useState(initialEmail)
  const [password, setPassword] = React.useState('')
  const [bezig, setBezig] = React.useState(false)

  const stepIndex = STEPS.indexOf(step)

  const canNext =
    step === 'datum' ? trouwdatum !== '' :
    step === 'namen' ? partner1.trim() !== '' && partner2.trim() !== '' :
    step === 'account' ? email.includes('@') && password.length >= 8 :
    true // gasten en budget zijn optioneel

  function prev() {
    if (step === 'datum') onBack()
    else if (step === 'namen') setStep('datum')
    else if (step === 'budget') setStep('namen')
    else if (step === 'gasten') setStep('budget')
    else setStep('gasten')
  }

  async function next() {
    if (step === 'datum') return setStep('namen')
    if (step === 'namen') return setStep('budget')
    if (step === 'budget') return setStep('gasten')
    if (step === 'gasten') return setStep('account')
    await finish()
  }

  async function finish() {
    if (bezig) return
    setBezig(true)
    const input: WeddingInput = {
      partner1Naam: partner1.trim() || 'Partner 1',
      partner2Naam: partner2.trim() || 'Partner 2',
      trouwdatum,
      locatie: '',
      totaalBudget: customBudget ? Number(customBudget) || 0 : budget ?? 0,
      aantalDaggasten: Number(daggasten) || 0,
      aantalAvondgasten: Number(avondgasten) || 0,
    }
    try {
      await completeOnboarding(input, {
        email: email.trim(),
        password,
        displayName: partner1.trim() || 'Partner 1',
      })
    } catch (err) {
      setBezig(false)
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'confirm-email') {
        toast({
          title: 'Bevestig je e-mailadres',
          description: 'We hebben een bevestigingslink gestuurd naar ' + email.trim() + '. Klik de link aan om door te gaan.',
          variant: 'error',
        })
      } else if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered')) {
        toast({
          title: 'E-mailadres al in gebruik',
          description: 'Er bestaat al een account met dit e-mailadres. Log in via de inlogpagina.',
          variant: 'error',
        })
      } else {
        toast({
          title: 'Aanmaken mislukt',
          description: 'We konden jullie account niet aanmaken. Controleer je verbinding en probeer het opnieuw.',
          variant: 'error',
        })
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
        <button
          type="button"
          onClick={prev}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Terug
        </button>
        <span className="flex items-center gap-2 font-serif text-base text-foreground">
          <Heart className="h-4 w-4 text-primary" />
          Ons Trouwplan
        </span>
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= stepIndex ? 'w-8 bg-primary' : 'w-6 bg-border'
              }`}
            />
          ))}
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-lg">
          {step === 'datum' && (
            <div>
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CalendarHeart className="h-6 w-6" />
              </div>
              <h2 className="font-serif text-3xl text-foreground">Wanneer is jullie grote dag?</h2>
              <p className="mt-2 text-muted-foreground">
                We zetten meteen een persoonlijke takenlijst en aftelteller voor jullie klaar.
              </p>
              <div className="mt-8">
                <Field label="Trouwdatum" htmlFor="ob-datum" required>
                  <Input
                    id="ob-datum"
                    type="date"
                    value={trouwdatum}
                    onChange={(e) => setTrouwdatum(e.target.value)}
                    autoFocus
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 'namen' && (
            <div>
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </div>
              <h2 className="font-serif text-3xl text-foreground">Wie gaan er trouwen?</h2>
              <p className="mt-2 text-muted-foreground">Hiermee personaliseren we jullie trouwplan.</p>
              <div className="mt-8 space-y-4">
                <Field label="Jouw naam" htmlFor="ob-p1" required>
                  <Input
                    id="ob-p1"
                    value={partner1}
                    onChange={(e) => setPartner1(e.target.value)}
                    placeholder="Bijv. Sanne"
                    autoFocus
                  />
                </Field>
                <Field label="Naam van je partner" htmlFor="ob-p2" required>
                  <Input
                    id="ob-p2"
                    value={partner2}
                    onChange={(e) => setPartner2(e.target.value)}
                    placeholder="Bijv. Tom"
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 'budget' && (
            <div>
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Wallet className="h-6 w-6" />
              </div>
              <h2 className="font-serif text-3xl text-foreground">Wat is jullie globale budget?</h2>
              <p className="mt-2 text-muted-foreground">Geen zorgen — dit kun je later altijd aanpassen.</p>

              <div className="mt-6 grid grid-cols-2 gap-2.5">
                {BUDGET_PRESETS.map(({ label, value }) => {
                  const active = budget === value && !customBudget
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        setBudget(value)
                        setCustomBudget('')
                      }}
                      className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
                        active
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-accent'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              <div className="mt-4">
                <Field label="Of voer een bedrag in (€)" htmlFor="ob-budget">
                  <Input
                    id="ob-budget"
                    type="number"
                    min={0}
                    value={customBudget}
                    onChange={(e) => {
                      setCustomBudget(e.target.value)
                      setBudget(null)
                    }}
                    placeholder="Bijv. 20000"
                  />
                </Field>
              </div>

            </div>
          )}

          {step === 'gasten' && (
            <div>
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </div>
              <h2 className="font-serif text-3xl text-foreground">Hoeveel gasten verwachten jullie?</h2>
              <p className="mt-2 text-muted-foreground">
                Een schatting is genoeg — je past dit later makkelijk aan.
              </p>
              <div className="mt-8 space-y-4">
                <Field label="Aantal daggasten" htmlFor="ob-daggasten">
                  <Input
                    id="ob-daggasten"
                    type="number"
                    min={0}
                    value={daggasten}
                    onChange={(e) => setDaggasten(e.target.value)}
                    placeholder="Bijv. 80"
                    autoFocus
                  />
                </Field>
                <Field label="Aantal avondgasten" htmlFor="ob-avondgasten">
                  <Input
                    id="ob-avondgasten"
                    type="number"
                    min={0}
                    value={avondgasten}
                    onChange={(e) => setAvondgasten(e.target.value)}
                    placeholder="Bijv. 40"
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 'account' && (
            <div>
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <KeyRound className="h-6 w-6" />
              </div>
              <h2 className="font-serif text-3xl text-foreground">Maak jullie account aan</h2>
              <p className="mt-2 text-muted-foreground">
                Hiermee bewaren we jullie trouwplan veilig en kun je het altijd en overal openen.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                We zetten direct jullie persoonlijke takenlijst klaar — gefaseerd, zodat je niet wordt overweldigd.
              </p>
              <div className="mt-8 space-y-4">
                <Field label="E-mailadres" htmlFor="ob-email" required>
                  <Input
                    id="ob-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jullie@email.nl"
                    autoFocus
                    autoComplete="email"
                  />
                </Field>
                <Field label="Wachtwoord" htmlFor="ob-password" required>
                  <Input
                    id="ob-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimaal 8 tekens"
                    autoComplete="new-password"
                  />
                </Field>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Stap {stepIndex + 1} van {STEPS.length}
            </span>
            <Button onClick={next} disabled={!canNext || bezig} loading={bezig} size="lg">
              {step === 'account' ? (
                <>
                  Maak ons trouwplan
                  <Check className="h-4 w-4" />
                </>
              ) : (
                <>
                  Volgende
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
