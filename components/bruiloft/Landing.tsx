'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  CalendarHeart,
  CheckCircle2,
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

// Brand-mark — serif ampersand in een vierkant, gelijk aan Riley & Grey.
function BrandMark({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const square =
    tone === 'dark'
      ? 'bg-rhino-800 text-white'
      : 'bg-white text-rhino-800 ring-1 ring-rhino-100'
  return (
    <span aria-hidden className={`flex h-9 w-9 items-center justify-center rounded-md ${square} shadow-sm`}>
      <span className="font-serif text-[22px] font-medium leading-none">&amp;</span>
    </span>
  )
}

export function Landing() {
  const [showOnboarding, setShowOnboarding] = React.useState(false)

  if (showOnboarding) {
    return <OnboardingWizard onBack={() => setShowOnboarding(false)} />
  }

  const start = () => setShowOnboarding(true)

  return (
    <div className="overflow-x-hidden bg-white">
      {/* Donkere navigatiebalk — Riley & Grey-stijl */}
      <nav className="sticky top-0 z-40 bg-rhino-800 text-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <span className="flex items-center gap-2.5 font-serif text-lg text-white">
            <BrandMark tone="light" />
            Ons Trouwplan
          </span>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-rhino-100 transition-colors hover:text-white"
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
      <section className="relative overflow-hidden bg-rhino-50 px-4 pb-20 pt-24 sm:px-6">
        <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] -translate-y-1/3 translate-x-1/3 rounded-full bg-rose-200/40 blur-3xl" />
        <div className="pointer-events-none absolute left-0 bottom-0 h-[400px] w-[400px] translate-y-1/3 -translate-x-1/3 rounded-full bg-rhino-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-3xl text-center">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-700 shadow-sm ring-1 ring-rose-100">
            <Sparkles className="h-3.5 w-3.5" />
            Gratis beginnen, geen account nodig
          </span>
          <h1 className="font-serif text-5xl font-medium leading-[1.05] tracking-tight text-rhino-900 sm:text-6xl lg:text-7xl">
            Jullie droombruiloft, <span className="italic text-rose-600">zonder stress</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            Budget, taken, gasten, leveranciers, draaiboek en een eigen trouwwebsite — alles samen op
            één plek. Direct beginnen, opslaan wanneer je er klaar voor bent.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" onClick={start}>
              Start gratis met plannen
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-600">
            {['Geen account vereist', 'Direct beginnen', '100% gratis'].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-rose-600" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mb-14 max-w-xl text-center">
            <h2 className="font-serif text-4xl font-medium tracking-tight text-rhino-900 sm:text-5xl">
              Alles wat jullie nodig hebben
            </h2>
            <p className="mt-3 text-lg text-gray-600">Eén tool van de eerste planning tot de laatste dans.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-lg border border-border bg-white p-6 transition-colors hover:border-rose-200"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-rose-50 text-rose-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-2xl font-medium text-rhino-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-rhino-50 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-14 text-center">
            <h2 className="font-serif text-4xl font-medium tracking-tight text-rhino-900 sm:text-5xl">
              In 3 stappen aan de slag
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 font-serif text-2xl text-white">
                  {num}
                </div>
                <h3 className="font-serif text-2xl font-medium text-rhino-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{desc}</p>
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
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <div className="mb-3 flex items-center justify-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-rose-600 text-rose-600" />
              ))}
            </div>
            <p className="font-serif text-3xl font-medium text-rhino-900">Door duizenden koppels gebruikt</p>
            <p className="mt-1 text-gray-600">om hun bruiloft te plannen</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            {TESTIMONIALS.map(({ name, text, date }) => (
              <div key={name} className="rounded-lg border border-border bg-white p-6">
                <div className="mb-4 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-rose-600 text-rose-600" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-gray-600">&ldquo;{text}&rdquo;</p>
                <p className="mt-4 font-medium text-rhino-900">{name}</p>
                <p className="text-xs text-gray-500">{date}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl bg-rhino-800 px-8 py-14 text-center text-white">
          <CalendarHeart className="mx-auto mb-5 h-10 w-10 text-rose-300" />
          <h2 className="font-serif text-4xl font-medium tracking-tight sm:text-5xl">Jullie verhaal begint hier</h2>
          <p className="mx-auto mt-3 max-w-md text-lg text-rhino-100">
            Geen wachtlijst, geen creditcard, geen account. Gewoon beginnen.
          </p>
          <div className="mt-8">
            <Button size="lg" onClick={start}>
              Start nu gratis
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
          <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <BrandMark tone="dark" />
            Ons Trouwplan
          </span>
          <p className="text-xs text-gray-500">Gratis te gebruiken · Begin zonder account</p>
        </div>
      </footer>
    </div>
  )
}
