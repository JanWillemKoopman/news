'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  CalendarHeart,
  CheckCircle2,
  CreditCard,
  Globe,
  HeartHandshake,
  ListChecks,
  Sparkles,
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
    title: 'Nooit meer nadenken over wat nu',
    desc: 'Een kant-en-klare tijdlijn van 12 maanden met 47+ taken, gerangschikt per maand. Jullie zien altijd wat er nu aandacht vraagt — en wat jullie al mooi voor elkaar hebben.',
  },
  {
    icon: Wallet,
    label: 'Budgetbeheer',
    title: 'Geen verrassingen meer op de rekening',
    desc: 'Stel jullie totaalbudget in en volg elk bedrag van offerte tot betaling. De budgetpiechart laat in één oogopslag zien hoeveel er nog over is — en waar jullie geld naartoe gaat.',
  },
  {
    icon: Users,
    label: 'Gasten & RSVP',
    title: 'Van uitnodiging tot tafelplaats',
    desc: 'Beheer de volledige gastenlijst, stuur persoonlijke uitnodigingen en ontvang RSVP\'s rechtstreeks in het overzicht. Inclusief dieetwensen, tafelindeling en alles wat er nog tussenin zit.',
  },
  {
    icon: Globe,
    label: 'Eigen trouwwebsite',
    title: 'Jullie eigen pagina, in 5 minuten live',
    desc: 'Maak een mooie, persoonlijke trouwwebsite zonder technische kennis. Deel de locatie, het programma en praktische info met jullie gasten — en laat hen direct RSVP\'en.',
  },
  {
    icon: BookOpen,
    label: 'Draaiboek trouwdag',
    title: 'Op de dag zelf weet iedereen wat hij doet',
    desc: 'Zet de volledige planning van jullie trouwdag vast in een draaiboek. Deel het met jullie leveranciers zodat niemand op de ochtend van de bruiloft met vragen bij jullie aanklopt.',
  },
  {
    icon: HeartHandshake,
    label: 'Samen plannen',
    title: 'Plan samen, altijd op één lijn',
    desc: 'Nodig je partner, ouders of trouwcoördinator uit om mee te kijken en te helpen. Iedereen ziet hetzelfde — geen versies die niet kloppen, geen dubbel werk, geen miscommunicatie.',
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
  'Tafelindeling drag & drop maken',
  'Draaiboek trouwdag opstellen',
  'Samen plannen met je partner',
]

const STEPS = [
  {
    num: '1',
    title: 'Vul jullie trouwdatum in',
    desc: 'In 30 seconden staat jullie persoonlijke tijdlijn klaar, aangemaakt voor jullie datum.',
  },
  {
    num: '2',
    title: 'Stel jullie plan in',
    desc: 'Voeg jullie budget toe, begin de gastenlijst op te bouwen en vink de eerste taken af. Alles werkt direct.',
  },
  {
    num: '3',
    title: 'Bewaar en deel wanneer je wilt',
    desc: 'Maak gratis een account aan om alles veilig op te slaan en je partner toegang te geven.',
  },
]

const TESTIMONIALS = [
  {
    name: 'Emma & Daan',
    date: 'Getrouwd september 2025',
    text: 'We begonnen pas 8 maanden voor de bruiloft en waren meteen overweldigd. De maandelijkse taakoverzichten gaven me rust — ik wist precies wat ik wanneer moest regelen, zonder iets te vergeten. Ik had dit al veel eerder willen hebben.',
  },
  {
    name: 'Lisa & Mark',
    date: 'Trouwen juni 2026',
    text: 'Mark en ik plannen allebei vanuit een ander scherm, maar we zitten altijd op dezelfde pagina. En toen onze eerste RSVP binnenkwam via onze eigen trouwwebsite — dat voelde echt als een moment.',
  },
  {
    name: 'Sophie & Tim',
    date: 'Getrouwd maart 2025',
    text: 'Ik was doodsbang om ongemerkt over ons budget heen te gaan. De budgettool liet me precies zien wat geoffreerd was en wat betaald. Uiteindelijk bleven we €800 onder budget. Dat hadden we nooit gekund met een spreadsheet.',
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

  if (showOnboarding) {
    return <OnboardingWizard onBack={() => setShowOnboarding(false)} />
  }

  const start = () => setShowOnboarding(true)

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
              Start gratis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* ── SECTIE 1: HERO ── */}
      <section className="relative overflow-hidden bg-rhino-50 px-4 pb-20 pt-24 sm:px-6">
        <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] -translate-y-1/3 translate-x-1/3 rounded-full bg-rose-200/40 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[400px] w-[400px] -translate-x-1/3 translate-y-1/3 rounded-full bg-rhino-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-3xl text-center">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-700 shadow-sm ring-1 ring-rose-100">
            <Sparkles className="h-3.5 w-3.5" />
            100% gratis — geen creditcard, direct starten
          </span>
          <h1 className="font-serif text-5xl font-medium leading-[1.05] tracking-tight text-rhino-900 sm:text-6xl lg:text-7xl">
            Jullie trouwdag,{' '}
            <span className="italic text-rose-600">zonder de chaos</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            Je weet niet waar je moet beginnen, je partner en jij plannen langs
            elkaar heen, en alles staat overal. Ons Trouwplan geeft jullie één
            overzicht van taken, budget, gasten en meer — volledig gratis, in
            het Nederlands.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" onClick={start}>
              Start gratis met plannen
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Al duizenden koppels begonnen — zonder creditcard
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-600">
            {['100% gratis', 'Geen creditcard', 'Direct beginnen'].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-rose-600" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTIE 2: SOCIAL PROOF — TESTIMONIALS ── */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <div className="mb-3 flex items-center justify-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-rose-600 text-rose-600" />
              ))}
            </div>
            <p className="font-serif text-3xl font-medium text-rhino-900">
              Door duizenden koppels gebruikt
            </p>
            <p className="mt-1 text-gray-600">om hun bruiloft te plannen</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            {TESTIMONIALS.map(({ name, text, date }) => (
              <div key={name} className="rounded-lg border border-border bg-white p-6 shadow-sm">
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

      {/* ── SECTIE 3: HET PIJNPUNT-BLOK ── */}
      <section className="bg-rhino-50 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-4xl font-medium tracking-tight text-rhino-900 sm:text-5xl">
            Je weet niet waar je moet beginnen
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Een bruiloft plannen is meer dan een lijst met dingen regelen. Het is
            de mentale last van altijd alles bijhouden — de spreadsheet die nooit
            klopt, de tool die alleen in het Engels is, de planner die je
            eigenlijk niet nodig wilt hebben. Je partner en jij praten langs
            elkaar heen, en je bent al drie keer dezelfde offerte kwijtgeraakt.
            Dat hoeft niet zo te gaan. Ons Trouwplan geeft jullie de structuur en
            het overzicht dat je zoekt — gratis, volledig in het Nederlands, en
            klaar om samen te gebruiken.
          </p>
        </div>
      </section>

      {/* ── SECTIE 4: FEATURE-BLOKKEN ── */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mb-14 max-w-xl text-center">
            <h2 className="font-serif text-4xl font-medium tracking-tight text-rhino-900 sm:text-5xl">
              Alles wat jullie nodig hebben
            </h2>
            <p className="mt-3 text-lg text-gray-600">
              Eén tool van de eerste checklist tot de laatste dans.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, label, title, desc }) => (
              <div
                key={title}
                className="rounded-lg border border-border bg-white p-6 transition-colors hover:border-rose-200"
              >
                <div className="mb-1 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-rose-50 text-rose-600">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-rose-600">
                    {label}
                  </span>
                </div>
                <h3 className="mt-3 font-serif text-xl font-medium text-rhino-900">
                  {title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTIE 5: ALLES IN ÉÉN OVERZICHTSBLOK ── */}
      <section className="bg-rhino-800 px-4 py-20 text-white sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h2 className="font-serif text-4xl font-medium tracking-tight sm:text-5xl">
              Alles wat erbij komt kijken, op één plek
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-rhino-100">
              Van de eerste checklist tot de laatste dans — Ons Trouwplan dekt
              het complete traject.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CAPABILITIES.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-rose-400" />
                <span className="text-rhino-100">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Button size="lg" onClick={start}>
              Start gratis met plannen
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── SECTIE 6: GRATIS-SECTIE ── */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl bg-rose-50 px-8 py-14 text-center ring-1 ring-rose-100">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-700 shadow-sm ring-1 ring-rose-100">
              <Sparkles className="h-3.5 w-3.5" />
              Geen asterisk, geen addertje
            </span>
            <h2 className="mt-4 font-serif text-4xl font-medium tracking-tight text-rhino-900 sm:text-5xl">
              Echt gratis. Punt.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-gray-600">
              De meeste &lsquo;gratis&rsquo; tools geven je net genoeg om te zien
              wat je mist — en vragen dan een maandelijks bedrag om verder te
              gaan. Ons Trouwplan is anders. Alles wat jullie nodig hebben om de
              bruiloft volledig te plannen is gratis. Geen freemium. Geen
              proefperiode. Geen verrassing achteraf.
            </p>
            <div className="mt-8 inline-flex flex-col items-start gap-3 text-left">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-rose-600" />
                <span className="text-gray-700">
                  Alle functies beschikbaar — budget, taken, gasten, website,
                  draaiboek
                </span>
              </div>
              <div className="flex items-center gap-3">
                <X className="h-5 w-5 flex-shrink-0 text-gray-400" />
                <span className="text-gray-700">
                  Geen creditcard nodig om te beginnen
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 flex-shrink-0 text-gray-400 line-through" />
                <span className="text-gray-700">
                  Geen verborgen kosten, nooit
                </span>
              </div>
            </div>
            <div className="mt-10">
              <Button size="lg" onClick={start}>
                Begin gratis
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTIE 7: HOE HET WERKT ── */}
      <section className="bg-rhino-50 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-14 text-center">
            <h2 className="font-serif text-4xl font-medium tracking-tight text-rhino-900 sm:text-5xl">
              In drie stappen op weg
            </h2>
            <p className="mt-3 text-lg text-gray-600">Laagdrempeliger dan je denkt.</p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 font-serif text-2xl text-white">
                  {num}
                </div>
                <h3 className="font-serif text-xl font-medium text-rhino-900">{title}</h3>
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

      {/* ── SECTIE 8: AFSLUITENDE CTA ── */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl bg-rhino-800 px-8 py-16 text-center text-white">
          <CalendarHeart className="mx-auto mb-5 h-10 w-10 text-rose-300" />
          <h2 className="font-serif text-4xl font-medium tracking-tight sm:text-5xl">
            Jullie bruiloft begint nu
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg text-rhino-100">
            De mooiste dag van jullie leven verdient een goed begin. Start
            vandaag nog — het is gratis, het duurt 30 seconden, en je hoeft
            niets te installeren.
          </p>
          <div className="mt-8">
            <Button size="lg" onClick={start}>
              Start gratis met plannen
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
          <p className="mt-4 text-sm text-rhino-300">
            100% gratis · Geen account vereist · Direct beginnen
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
          <p className="text-xs text-gray-500">
            Gratis te gebruiken · Begin zonder account · Volledig in het Nederlands
          </p>
        </div>
      </footer>
    </div>
  )
}
