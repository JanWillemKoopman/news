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
  Menu,
  Star,
  Users,
  Wallet,
  X,
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

const FAQ = [
  {
    q: 'Is Ons Trouwplan echt gratis?',
    a: 'Ja, volledig gratis. Alle functies zijn beschikbaar zonder abonnement, proefperiode of creditcard. Geen verborgen kosten, ooit.',
  },
  {
    q: 'Kunnen mijn partner en ik samen plannen?',
    a: 'Ja. Nodig je partner of ouders uit als medewerker. Iedereen ziet dezelfde informatie in realtime — geen versies die afwijken, geen dubbel werk.',
  },
  {
    q: 'Wat kan ik allemaal bijhouden?',
    a: "Tijdlijn en taken, budget per categorie, gastenlijst, RSVP's, leveranciers en offertes, eigen trouwwebsite en draaiboek voor de dag zelf.",
  },
  {
    q: 'Hoe lang duurt het om te beginnen?',
    a: 'Twee minuten. Vul je e-mailadres in, stel jullie bruiloft in (datum, namen, budget, aantal gasten) en je persoonlijke tijdlijn staat direct klaar.',
  },
  {
    q: 'Is de app volledig in het Nederlands?',
    a: 'Volledig. Alle teksten, labels, e-mails en de trouwwebsite voor jullie gasten zijn in het Nederlands.',
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
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [openFaq, setOpenFaq] = React.useState<number | null>(null)

  React.useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

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

      {/* Mobiel menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white sm:hidden">
          <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4">
            <span className="flex items-center gap-2.5 font-serif text-lg text-rhino-900">
              <BrandMark tone="dark" />
              Ons Trouwplan
            </span>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-md text-rhino-700 hover:bg-gray-100"
              onClick={() => setMenuOpen(false)}
              aria-label="Menu sluiten"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-4 pt-6">
            <Link
              href="/login"
              className="rounded-md px-3 py-3 text-base font-medium text-rhino-800 hover:bg-gray-50"
              onClick={() => setMenuOpen(false)}
            >
              Inloggen
            </Link>
          </nav>
          <div className="border-t border-gray-100 p-4">
            <Button
              className="w-full rounded-full"
              onClick={() => { setMenuOpen(false); start() }}
            >
              Begin gratis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Navigatie */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <span className="flex items-center gap-2.5 font-serif text-lg text-rhino-900">
            <BrandMark tone="dark" />
            Ons Trouwplan
          </span>
          {/* Desktop */}
          <div className="hidden items-center gap-4 sm:flex">
            <Link
              href="/login"
              className="text-sm font-medium text-rhino-700 transition-colors hover:text-rhino-900"
            >
              Inloggen
            </Link>
            <Button size="sm" className="rounded-full" onClick={start}>
              Begin gratis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          {/* Mobiel hamburger */}
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-md text-rhino-700 hover:bg-gray-100 sm:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Menu openen"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-rhino-50 px-4 pb-28 pt-24 sm:px-6 lg:pb-36 lg:pt-32">
        <div className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] -translate-y-1/4 translate-x-1/3 rounded-full bg-rose-200/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[400px] w-[400px] -translate-x-1/3 translate-y-1/3 rounded-full bg-rhino-200/25 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center">
          <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.15em] text-rose-600">
            Gratis, omdat trouwen al duur genoeg is
          </p>

          <h1 className="font-serif text-6xl font-medium leading-[1.02] tracking-tight text-rhino-900 sm:text-7xl lg:text-8xl">
            Jullie bruiloft,{' '}
            <span className="italic text-rose-600 underline decoration-rose-300 underline-offset-4">
              goed geregeld.
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-gray-600">
            Taken, budget, gasten, leveranciers, draaiboek en een eigen trouwwebsite —
            alles op één plek. Volledig in het Nederlands. Volledig gratis.
          </p>

          <form
            onSubmit={startWithEmail}
            className="mx-auto mt-9 flex max-w-md items-center rounded-full border border-gray-200 bg-white p-1.5 shadow-sm transition-all focus-within:border-rose-300 focus-within:ring-2 focus-within:ring-rose-600/20"
          >
            <input
              type="email"
              placeholder="jullie@email.nl"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="min-w-0 flex-1 bg-transparent px-4 py-2 text-sm text-rhino-900 placeholder:text-gray-400 focus:outline-none"
            />
            <Button type="submit" size="sm" className="shrink-0 rounded-full">
              Begin gratis
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
      <section className="border-t border-gray-100 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="mb-12 text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400">
            Wat anderen zeggen
          </p>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            {TESTIMONIALS.map(({ name, text, date }) => (
              <figure key={name}>
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-rose-500 text-rose-500" />
                  ))}
                </div>
                <blockquote className="text-sm leading-relaxed text-gray-600">
                  &ldquo;{text}&rdquo;
                </blockquote>
                <figcaption className="mt-5 border-t border-gray-100 pt-4">
                  <p className="font-serif text-base font-medium text-rhino-900">{name}</p>
                  <p className="text-xs text-gray-400">{date}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── PIJNPUNT ── */}
      <section className="bg-rhino-800 px-4 py-24 text-white sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-center">
            <div className="hidden select-none items-center justify-center md:flex">
              <span className="font-serif text-[14rem] leading-none text-rhino-700/60 lg:text-[18rem]">
                &amp;
              </span>
            </div>
            <div>
              <h2 className="font-serif text-4xl font-medium tracking-tight sm:text-5xl lg:text-6xl">
                Drie vensters open.<br />
                En toch loop je achter.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-rhino-200">
                Een spreadsheet die bijgehouden moet worden, een app die alleen in het Engels is,
                offertes die ergens in een e-mailthread zitten. Je partner denkt dat jij het
                bijhoudt, jij denkt dat hij het bijhoudt. Ons Trouwplan geeft jullie één overzicht —
                volledig in het Nederlands, en gratis, want een trouwplanner betalen wil je niet voor
                iets wat je prima zelf kunt.
              </p>
              <div className="mt-8">
                <Button className="rounded-full" onClick={start}>
                  Bekijk hoe het werkt
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-16 md:grid-cols-2 md:items-start">
            <div className="md:sticky md:top-24">
              <h2 className="font-serif text-4xl font-medium tracking-tight text-rhino-900 sm:text-5xl lg:text-6xl">
                Alles wat erbij<br />komt kijken
              </h2>
              <p className="mt-4 text-gray-500">
                Van eerste checklist tot draaiboek op de dag zelf.
              </p>
              <div className="mt-8">
                <Button className="rounded-full" onClick={start}>
                  Begin gratis
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <ul className="flex flex-col divide-y divide-gray-100">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <li key={title} className="flex gap-4 py-7 first:pt-0">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-serif text-lg font-medium text-rhino-900">{title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── ALLES IN ÉÉN ── */}
      <section className="bg-rhino-800 px-4 py-24 text-white sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="font-serif text-4xl font-medium tracking-tight sm:text-5xl lg:text-6xl">
                Één tool.<br />Alles geregeld.
              </h2>
              <p className="mt-5 text-lg text-rhino-200">
                Je hoeft geen losse apps bij elkaar te sprokkelen. Ons Trouwplan
                dekt het complete traject — van eerste checklist tot de laatste dans.
              </p>
              <form
                onSubmit={startWithEmail}
                className="mt-8 flex max-w-sm items-center rounded-full border border-white/20 bg-white/10 p-1.5 backdrop-blur-sm"
              >
                <input
                  type="email"
                  placeholder="jullie@email.nl"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent px-4 py-2 text-sm text-white placeholder:text-rhino-300 focus:outline-none"
                />
                <Button type="submit" size="sm" className="shrink-0 rounded-full">
                  Begin gratis
                </Button>
              </form>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CAPABILITIES.map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-rose-400" />
                  <span className="text-sm text-rhino-100">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── GRATIS ── */}
      <section className="bg-rhino-50 px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-rose-600">
            Geen addertje onder het gras
          </p>
          <h2 className="font-serif text-4xl font-medium tracking-tight text-rhino-900 sm:text-5xl lg:text-6xl">
            Gratis, omdat trouwen<br className="hidden sm:block" /> al duur genoeg is.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-gray-600">
            Het gemiddelde Nederlandse bruidspaar geeft zo&apos;n €15.000 uit aan hun bruiloft.
            Ons Trouwplan kost niets — en dat blijft zo. Geen proefperiode van veertien
            dagen, geen abonnement na de gratis maand, geen functies die ineens achter een
            betaalmuur zitten.
          </p>
          <div className="mx-auto mt-8 inline-flex flex-col items-start gap-4 text-left">
            {[
              'Alle functies beschikbaar — budget, taken, gasten, website, draaiboek',
              'Geen creditcard nodig om te beginnen',
              'Geen verborgen kosten, ooit',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <span className="text-gray-700">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Button size="lg" className="rounded-full px-8" onClick={start}>
              Begin gratis
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── HOE HET WERKT ── */}
      <section className="border-t border-gray-100 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center font-serif text-4xl font-medium tracking-tight text-rhino-900 sm:text-5xl">
            In drie stappen aan de slag
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="text-center">
                <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-rose-600 font-serif text-xl text-white shadow-sm">
                  {num}
                </div>
                <h3 className="font-serif text-xl font-medium text-rhino-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="border-t border-gray-100 px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 font-serif text-4xl font-medium tracking-tight text-rhino-900 sm:text-5xl lg:text-6xl">
            Jullie vragen,{' '}
            <span className="italic text-rose-600 underline decoration-rose-300 underline-offset-4">
              wij antwoorden.
            </span>
          </h2>
          <ul className="divide-y divide-gray-100">
            {FAQ.map((item, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between gap-6 py-5 text-left"
                >
                  <span className="font-serif text-lg font-medium text-rhino-900">{item.q}</span>
                  <span
                    className="shrink-0 font-serif text-2xl leading-none text-gray-400 transition-all duration-200"
                    aria-hidden
                  >
                    {openFaq === i ? '×' : '—'}
                  </span>
                </button>
                {openFaq === i && (
                  <p className="pb-6 leading-relaxed text-gray-600">{item.a}</p>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-12">
            <button
              type="button"
              onClick={start}
              className="font-serif text-xl italic text-rhino-900 underline decoration-rose-300 underline-offset-4 transition-colors hover:text-rose-600"
            >
              Begin vandaag.
            </button>
          </div>
        </div>
      </section>

      {/* ── AFSLUITENDE CTA ── */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-rhino-800 px-8 py-20 text-center text-white">
          <CalendarHeart className="mx-auto mb-6 h-8 w-8 text-rose-300" />
          <h2 className="font-serif text-4xl font-medium tracking-tight sm:text-5xl lg:text-6xl">
            Begin vandaag.<br />Het kost niets.
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-rhino-200">
            Jullie trouwplan staat over twee minuten klaar.
          </p>
          <form
            onSubmit={startWithEmail}
            className="mx-auto mt-8 flex max-w-md items-center rounded-full border border-white/20 bg-white/10 p-1.5"
          >
            <input
              type="email"
              placeholder="jullie@email.nl"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="min-w-0 flex-1 bg-transparent px-4 py-2 text-sm text-white placeholder:text-rhino-300 focus:outline-none"
            />
            <Button type="submit" size="sm" className="shrink-0 rounded-full">
              Begin gratis
            </Button>
          </form>
          <p className="mt-4 text-sm text-rhino-400">
            Geen creditcard. Geen installatie. Gewoon beginnen.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="flex items-center gap-2.5 font-serif text-base font-medium text-rhino-900">
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
