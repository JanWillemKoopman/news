'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  CalendarHeart,
  CheckCircle2,
  Heart,
  ListChecks,
  Sparkles,
  Star,
  Users,
  Wallet,
} from 'lucide-react'

import { Button } from '@/components/bruiloft/ui'
import { OnboardingWizard } from './OnboardingWizard'

const FEATURES = [
  {
    icon: Wallet,
    title: 'Budget in de hand',
    desc: 'Stel jullie totaalbudget in en houd elke uitgave bij per categorie. Nooit meer verrassingen.',
  },
  {
    icon: ListChecks,
    title: 'Tijdlijn & taken',
    desc: 'Een slimme planning van 12 maanden tot de grote dag. Vink af wat klaar is.',
  },
  {
    icon: Users,
    title: 'Gasten & RSVP',
    desc: 'Beheer de gastenlijst, verstuur persoonlijke uitnodigingen en volg wie er komt.',
  },
  {
    icon: Building2,
    title: 'Leveranciers & meer',
    desc: 'Fotograaf, catering, draaiboek, tafelschikking en een eigen trouwwebsite — alles op één plek.',
  },
]

const STEPS = [
  { num: '1', title: 'Vul jullie trouwdatum in', desc: 'In 30 seconden staat jullie persoonlijke tijdlijn klaar.' },
  { num: '2', title: 'Begin meteen te plannen', desc: 'Taken, gasten en budget werken direct — zonder account.' },
  { num: '3', title: 'Bewaar wanneer je wilt', desc: 'Maak gratis een account om jullie plan veilig op te slaan en samen te werken.' },
]

const TESTIMONIALS = [
  { name: 'Emma & Daan', text: 'Eindelijk overzicht. We hadden onze leveranciers en het budget binnen 10 minuten staan.', date: 'Getrouwd september 2025' },
  { name: 'Lisa & Mark', text: 'Heerlijk dat je gewoon kunt beginnen zonder je meteen te registreren.', date: 'Trouwen juni 2026' },
  { name: 'Sophie & Tim', text: 'De takenlijst per maand is goud waard. We wisten precies wat er nog moest gebeuren.', date: 'Getrouwd maart 2025' },
]

export function Landing() {
  const [showOnboarding, setShowOnboarding] = React.useState(false)

  if (showOnboarding) {
    return <OnboardingWizard onBack={() => setShowOnboarding(false)} />
  }

  const start = () => setShowOnboarding(true)

  return (
    <div className="overflow-x-hidden">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="flex items-center gap-2 font-serif text-lg text-foreground">
            <Heart className="h-5 w-5 text-primary" />
            Ons Trouwplan
          </span>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Inloggen
            </Link>
            <Button size="sm" onClick={start}>
              Start gratis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-20 sm:px-6">
        <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] -translate-y-1/3 translate-x-1/3 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-3xl text-center">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Gratis beginnen, geen account nodig
          </span>
          <h1 className="font-serif text-4xl leading-[1.1] text-foreground sm:text-5xl lg:text-6xl">
            Jullie droombruiloft, <span className="text-primary">zonder stress</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Budget, taken, gasten, leveranciers, draaiboek en een eigen trouwwebsite — alles samen op
            één plek. Direct beginnen, opslaan wanneer je er klaar voor bent.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" onClick={start}>
              Start gratis met plannen
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {['Geen account vereist', 'Direct beginnen', '100% gratis'].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mb-12 max-w-xl text-center">
            <h2 className="font-serif text-3xl text-foreground sm:text-4xl">Alles wat jullie nodig hebben</h2>
            <p className="mt-3 text-muted-foreground">Eén tool van de eerste planning tot de laatste dans.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/30">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-lg text-foreground">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-card/40 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="font-serif text-3xl text-foreground sm:text-4xl">In 3 stappen aan de slag</h2>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary font-serif text-lg text-primary-foreground">
                  {num}
                </div>
                <h3 className="font-serif text-lg text-foreground">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Button size="lg" onClick={start}>
              Start nu, het is gratis
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <div className="mb-3 flex items-center justify-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-primary text-primary" />
              ))}
            </div>
            <p className="font-serif text-2xl text-foreground">Door duizenden koppels gebruikt</p>
            <p className="mt-1 text-muted-foreground">om hun bruiloft te plannen</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {TESTIMONIALS.map(({ name, text, date }) => (
              <div key={name} className="rounded-2xl border border-border bg-card p-6">
                <div className="mb-4 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">&ldquo;{text}&rdquo;</p>
                <p className="mt-4 font-medium text-foreground">{name}</p>
                <p className="text-xs text-muted-foreground">{date}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card p-10 text-center">
          <CalendarHeart className="mx-auto mb-5 h-10 w-10 text-primary" />
          <h2 className="font-serif text-3xl text-foreground sm:text-4xl">Jullie verhaal begint hier</h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Geen wachtlijst, geen creditcard, geen account. Gewoon beginnen.
          </p>
          <div className="mt-7">
            <Button size="lg" onClick={start}>
              Start nu gratis
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
          <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Heart className="h-4 w-4 text-primary" />
            Ons Trouwplan
          </span>
          <p className="text-xs text-muted-foreground">Gratis te gebruiken · Begin zonder account</p>
        </div>
      </footer>
    </div>
  )
}
