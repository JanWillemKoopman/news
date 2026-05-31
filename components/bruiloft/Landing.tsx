'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  CalendarHeart,
  CheckCircle2,
  Globe,
  HeartHandshake,
  ListChecks,
  Star,
  Users,
  Wallet,
} from 'lucide-react'

import { Button } from '@/components/bruiloft/ui'
import { OnboardingWizard } from './OnboardingWizard'

const FEATURES = [
  {
    icon: ListChecks,
    label: 'Tijdlijn & taken',
    title: 'Altijd weten wat er nu moet',
    desc: 'Een kant-en-klare tijdlijn van 12 maanden met 47+ taken, gerangschikt per maand. Elke maand verschijnen de juiste taken — niet alles tegelijk, want dat werkt niet.',
  },
  {
    icon: Wallet,
    label: 'Budget',
    title: 'Van offerte tot betaling, bijgehouden',
    desc: 'Voer jullie totaalbudget in en registreer elk bedrag. De budgetpiechart laat in één oogopslag zien hoeveel er nog over is en waar het naartoe gaat. Geen verrassingen.',
  },
  {
    icon: Users,
    label: 'Gasten & RSVP',
    title: 'Van uitnodiging tot tafelplaats',
    desc: "Beheer de gastenlijst, verstuur uitnodigingen en ontvang RSVP's. Inclusief dieetwensen en drag-and-drop tafelindeling.",
  },
  {
    icon: Globe,
    label: 'Trouwwebsite',
    title: 'Eigen pagina, vijf minuten werk',
    desc: "Maak een persoonlijke trouwwebsite voor jullie gasten. Locatie, programma, praktische info — en gasten kunnen er meteen via RSVP'en.",
  },
  {
    icon: BookOpen,
    label: 'Draaiboek',
    title: 'Niemand hoeft op de dag zelf te vragen',
    desc: 'Zet de planning van jullie trouwdag vast in een draaiboek. Deel het met leveranciers en familie — dan hoeft niemand aan jullie te trekken op de grote dag.',
  },
  {
    icon: HeartHandshake,
    label: 'Samenwerken',
    title: 'Jullie allebei hetzelfde beeld',
    desc: 'Nodig je partner of ouders uit als medewerker. Iedereen ziet dezelfde informatie — geen versies die afwijken, geen dubbel werk.',
  },
]

const CAPABILITIES = [
  'Persoonlijke tijdlijn aanmaken',
  'Taken afvinken per maand',
  'Budget bijhouden per categorie',
  'Offertes en leveranciers beheren',
  'Gastenlijst aanmaken en bijhouden',
  "RSVP's ontvangen en overzien",
  'Eigen trouwwebsite bouwen',
  'Tafelindeling drag & drop',
  'Draaiboek trouwdag opstellen',
  'Samen plannen met je partner',
]

const STEPS = [
  {
    num: '1',
    title: 'Vul je e-mailadres in',
    desc: 'Dat is alles om te beginnen. Geen lange registratie, geen formulieren.',
  },
  {
    num: '2',
    title: 'Stel jullie bruiloft in',
    desc: 'Datum, namen, budget, aantal gasten. In twee minuten klaar.',
  },
  {
    num: '3',
    title: 'Begin met plannen',
    desc: 'Jullie persoonlijke takenlijst staat direct klaar. Alles werkt meteen.',
  },
]

const TESTIMONIALS = [
  {
    name: 'Emma & Daan',
    date: 'Getrouwd september 2025',
    text: 'Acht maanden voor de bruiloft begonnen en toch niets vergeten. De takenlijst per maand was het verschil. Ik had dit eerder gewild.',
  },
  {
    name: 'Lisa & Mark',
    date: 'Trouwen juni 2026',
    text: 'We plannen samen vanuit twee schermen en zien altijd hetzelfde. Toen de eerste RSVP binnenkwam via onze trouwpagina stuurde Mark me meteen een screenshot.',
  },
  {
    name: 'Sophie & Tim',
    date: 'Getrouwd maart 2025',
    text: "We zijn €800 onder budget gebleven, puur omdat ik alles van offerte tot betaling bijhield. Met een spreadsheet had ik dat nooit zo precies bijgehouden.",
  },
]

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
  const [heroEmail, setHeroEmail] = React.useState('')
  const [emailInput, setEmailInput] = React.useState('')

  if (showOnboarding) {
    return <OnboardingWizard onBack={() => setShowOnboarding(false)} initialEmail={heroEmail} />
  }

  function startWithEmail(e: React.FormEvent) {
    e.preventDefault()
    setHeroEmail(emailInput.trim())
    setShowOnboarding(true)
  }

  function start() {
    setHeroEmail('')
    setShowOnboarding(true)
  }

  return (
    <div className="overflow-x-hidden bg-white">

      {/* Navigatie */}
      <nav className="bg-rhino-800 text-white md:sticky md:top-0 md:z-40">
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
              Begin gratis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-rhino-50 px-4 pb-24 pt-20 sm:px-6 lg:pb-32 lg:pt-28">
        <div className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] -translate-y-1/4 translate-x-1/3 rounded-full bg-rose-200/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[400px] w-[400px] -translate-x-1/3 translate-y-1/3 rounded-full bg-rhino-200/25 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center">
          <p className="mb-5 text-sm font-medium tracking-wide text-rose-700">
            Gratis, omdat trouwen al duur genoeg is
          </p>

          <h1 className="font-serif text-5xl font-medium leading-[1.05] tracking-tight text-rhino-900 sm:text-6xl lg:text-[5rem]">
            Jullie bruiloft,{' '}
            <span className="italic text-rose-600">goed geregeld.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-600">
            Taken, budget, gasten, leveranciers, draaiboek en een eigen trouwwebsite —
            alles op één plek. Volledig in het Nederlands. Volledig gratis.
          </p>

          <form
            onSubmit={startWithEmail}
            className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              placeholder="jullie@email.nl"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="flex-1 rounded-md border border-border bg-white px-4 py-2.5 text-sm text-rhino-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-600/30"
            />
            <Button type="submit">
              Begin gratis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-3 text-xs text-gray-400">
            Geen creditcard. Geen installatie. Gewoon beginnen.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
            {['100% gratis', 'Geen creditcard', 'Volledig Nederlands'].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-rose-500" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="border-t border-border px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="mb-10 text-center text-xs font-semibold uppercase tracking-widest text-gray-400">
            Wat anderen zeggen
          </p>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {TESTIMONIALS.map(({ name, text, date }) => (
              <div key={name} className="rounded-lg border border-border bg-white p-6">
                <div className="mb-4 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-gray-600">&ldquo;{text}&rdquo;</p>
                <div className="mt-4 border-t border-border pt-4">
                  <p className="font-serif text-base font-medium text-rhino-900">{name}</p>
                  <p className="text-xs text-gray-400">{date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PIJNPUNT ── */}
      <section className="border-t border-border bg-rhino-50 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-serif text-4xl font-medium tracking-tight text-rhino-900 sm:text-5xl">
            Drie vensters open.<br className="hidden sm:block" />
            En toch loop je achter.
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Een spreadsheet die bijgehouden moet worden, een app die alleen in het Engels is,
            offertes die ergens in een e-mailthread zitten. Je partner denkt dat jij het bijhoudt,
            jij denkt dat hij het bijhoudt. Ons Trouwplan geeft jullie één overzicht — volledig
            in het Nederlands, en gratis, want een trouwplanner betalen wil je niet voor iets
            wat je prima zelf kunt.
          </p>
          <div className="mt-8">
            <Button onClick={start}>
              Bekijk hoe het werkt
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="border-t border-border px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mb-14 max-w-xl text-center">
            <h2 className="font-serif text-4xl font-medium tracking-tight text-rhino-900 sm:text-5xl">
              Alles wat erbij komt kijken
            </h2>
            <p className="mt-3 text-gray-500">
              Van eerste checklist tot draaiboek op de dag zelf.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, label, title, desc }) => (
              <div
                key={title}
                className="rounded-lg border border-border bg-white p-6 transition-colors hover:border-rose-200"
              >
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-rose-50 text-rose-600">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {label}
                  </span>
                </div>
                <h3 className="font-serif text-xl font-medium text-rhino-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ALLES IN ÉÉN ── */}
      <section className="bg-rhino-800 px-4 py-20 text-white sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="font-serif text-4xl font-medium tracking-tight sm:text-5xl">
                Één tool.<br />Alles geregeld.
              </h2>
              <p className="mt-4 text-lg text-rhino-200">
                Je hoeft geen losse apps bij elkaar te sprokkelen. Ons Trouwplan
                dekt het complete traject — van eerste checklist tot de laatste
                dans.
              </p>
              <div className="mt-8">
                <Button variant="outline" onClick={start}>
                  Begin gratis
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CAPABILITIES.map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-rose-400" />
                  <span className="text-sm text-rhino-100">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── GRATIS ── */}
      <section className="border-t border-border px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-rose-600">
            Geen addertje onder het gras
          </p>
          <h2 className="font-serif text-4xl font-medium tracking-tight text-rhino-900 sm:text-5xl">
            Gratis, omdat trouwen<br className="hidden sm:block" /> al duur genoeg is.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-600">
            Het gemiddelde Nederlandse bruidspaar geeft zo'n €15.000 uit aan hun bruiloft.
            Ons Trouwplan kost niets — en dat blijft zo. Geen proefperiode van veertien
            dagen, geen abonnement na de gratis maand, geen functies die ineens achter een
            betaalmuur zitten.
          </p>
          <div className="mt-8 inline-flex flex-col items-start gap-3 text-left">
            {[
              'Alle functies beschikbaar — budget, taken, gasten, website, draaiboek',
              'Geen creditcard nodig om te beginnen',
              'Geen verborgen kosten, ooit',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />
                <span className="text-gray-700">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Button size="lg" onClick={start}>
              Begin gratis
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── HOE HET WERKT ── */}
      <section className="border-t border-border bg-rhino-50 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-14 text-center">
            <h2 className="font-serif text-4xl font-medium tracking-tight text-rhino-900 sm:text-5xl">
              In drie stappen aan de slag
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-600 font-serif text-xl text-white">
                  {num}
                </div>
                <h3 className="font-serif text-xl font-medium text-rhino-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AFSLUITENDE CTA ── */}
      <section className="border-t border-border px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl bg-rhino-800 px-8 py-16 text-center text-white">
          <CalendarHeart className="mx-auto mb-5 h-8 w-8 text-rose-300" />
          <h2 className="font-serif text-4xl font-medium tracking-tight sm:text-5xl">
            Begin vandaag.<br />Het kost niets.
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-rhino-200">
            Jullie trouwplan staat over twee minuten klaar.
          </p>
          <form
            onSubmit={startWithEmail}
            className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              placeholder="jullie@email.nl"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="flex-1 rounded-md border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-rhino-300 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
            <Button type="submit">
              Begin gratis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-4 text-sm text-rhino-400">
            Geen creditcard. Geen installatie. Gewoon beginnen.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
          <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <BrandMark tone="dark" />
            Ons Trouwplan
          </span>
          <p className="text-xs text-gray-400">
            Gratis te gebruiken · Begin zonder account · Volledig in het Nederlands
          </p>
        </div>
      </footer>
    </div>
  )
}
