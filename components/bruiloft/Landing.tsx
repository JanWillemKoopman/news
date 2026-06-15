'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  BookOpen,
  CalendarHeart,
  Check,
  CheckCircle2,
  Globe,
  Gift,
  ListChecks,
  Menu,
  Minus,
  Sparkles,
  Star,
  Users,
  Wallet,
  X,
} from 'lucide-react'

import { Button } from '@/components/bruiloft/ui'
import { useBruiloftStore } from '@/store/bruiloftStore'

/* ────────────────────────────── Content ────────────────────────────── */

const NAV_LINKS = [
  { href: '#functies', label: 'Functies' },
  { href: '#ai', label: 'AI-planner' },
  { href: '#website', label: 'Trouwwebsite' },
  { href: '#gratis', label: 'Gratis' },
  { href: '#faq', label: 'FAQ' },
]

const FEATURE_CARDS = [
  {
    icon: ListChecks,
    label: 'Planning & taken',
    title: 'Een tijdlijn die met jullie meedenkt',
    desc: 'Een kant-en-klare checklist van 47+ taken, verdeeld over 12 maanden. Elke maand precies de juiste taken — niet alles tegelijk.',
    href: '#taken',
  },
  {
    icon: Wallet,
    label: 'Budget & leveranciers',
    title: 'Elke euro in beeld, van offerte tot betaling',
    desc: 'Totaalbudget, uitgaven per categorie, offertes en betaalstatus per leverancier. Geen verrassingen achteraf.',
    href: '#budget',
  },
  {
    icon: Users,
    label: 'Gasten & RSVP',
    title: 'Van uitnodiging tot tafelindeling',
    desc: "Gastenlijst, digitale uitnodigingen, RSVP's met dieetwensen en een drag-and-drop tafelplanner. Alles vanzelf bijgewerkt.",
    href: '#gasten',
  },
  {
    icon: Globe,
    label: 'Trouwwebsite & cadeaulijst',
    title: 'Een eigen pagina waar gasten alles vinden',
    desc: "Persoonlijke trouwwebsite met programma, locatie, RSVP en cadeaulijst. Klaar in vijf minuten, in jullie eigen stijl.",
    href: '#website',
  },
]

const AI_POINTS = [
  {
    title: 'Analyseert jullie hele planning',
    desc: 'Taken, budget, gasten, leveranciers, draaiboek en website — de AI kijkt naar alles tegelijk en ziet wat jullie ontgaat.',
  },
  {
    title: 'Vertelt wat nú belangrijk is',
    desc: 'Geen lijst van honderd dingen, maar de vier of vijf acties die deze week het verschil maken — gesorteerd op urgentie.',
  },
  {
    title: 'Houdt de voortgang bij met een score',
    desc: 'Eén cijfer dat vertelt hoe jullie ervoor staan, per onderdeel uitgesplitst. Loopt iets achter? Dan zien jullie dat meteen.',
  },
]

const COMPARISON = [
  { feature: 'Takenlijst op maat van jullie trouwdatum', us: true, sheet: false, paid: true },
  { feature: 'AI-advies over jullie hele planning', us: true, sheet: false, paid: false },
  { feature: 'Budget van offerte tot betaling', us: true, sheet: 'half', paid: true },
  { feature: "Gastenlijst, RSVP's en dieetwensen", us: true, sheet: 'half', paid: true },
  { feature: 'Eigen trouwwebsite met cadeaulijst', us: true, sheet: false, paid: true },
  { feature: 'Tafelindeling met drag & drop', us: true, sheet: false, paid: 'half' },
  { feature: 'Samen plannen, realtime gesynchroniseerd', us: true, sheet: 'half', paid: true },
  { feature: 'Volledig in het Nederlands', us: true, sheet: true, paid: 'half' },
  { feature: 'Zonder reclame', us: true, sheet: true, paid: false },
] as const

const INCLUDED = [
  'Tijdlijn met 47+ taken op maat',
  'AI-weddingplanner met persoonlijk advies',
  'Budget per categorie, met grafieken',
  'Leveranciers en offertes beheren',
  "Gastenlijst, uitnodigingen en RSVP's",
  'Tafelindeling met drag & drop',
  'Eigen trouwwebsite met cadeaulijst',
  'Draaiboek voor de trouwdag',
  'Samen plannen met partner en familie',
  "Onbeperkt gasten, taken en foto's",
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
    text: 'We zijn €800 onder budget gebleven, puur omdat ik alles van offerte tot betaling bijhield. Met een spreadsheet had ik dat nooit zo precies bijgehouden.',
  },
]

const STEPS = [
  {
    num: '1',
    title: 'Vul je e-mailadres in',
    desc: 'Dat is alles om te beginnen. Geen lange registratie, geen creditcard.',
  },
  {
    num: '2',
    title: 'Stel jullie bruiloft in',
    desc: 'Datum, namen, budget, aantal gasten. In twee minuten klaar.',
  },
  {
    num: '3',
    title: 'Begin met plannen',
    desc: 'Jullie persoonlijke tijdlijn staat direct klaar — en de AI denkt vanaf dag één mee.',
  },
]

const FAQ = [
  {
    q: 'Is Ons Trouwplan echt helemaal gratis?',
    a: 'Ja, volledig. Alle functies — inclusief de AI-weddingplanner, de trouwwebsite en onbeperkt gasten — zijn gratis. Geen proefperiode, geen premium-versie, geen creditcard nodig.',
  },
  {
    q: 'Waar verdienen jullie dan aan?',
    a: 'Nergens aan, op dit moment. Er zit geen verdienmodel achter Ons Trouwplan: geen reclame, geen verkoop van gegevens, geen betaalde functies. Mocht dat ooit veranderen, dan blijft alles wat nu gratis is, gratis.',
  },
  {
    q: 'Hoe werkt de AI-weddingplanner?',
    a: 'De AI kijkt naar jullie complete planning — taken, budget, gasten, leveranciers, draaiboek en website — en vertaalt dat naar een voortgangsscore en concrete adviezen, gesorteerd op urgentie. Zo weten jullie altijd wat nú belangrijk is.',
  },
  {
    q: 'Kunnen mijn partner en ik samen plannen?',
    a: 'Ja. Nodig je partner, ouders of getuigen uit als medewerker. Iedereen ziet realtime dezelfde informatie — geen versies die afwijken, geen dubbel werk.',
  },
  {
    q: 'Wat zien onze gasten?',
    a: "Jullie eigen trouwwebsite met programma, locatie en praktische info. Gasten kunnen daar direct RSVP'en — met dieetwensen — en de cadeaulijst bekijken. Zonder dat zij een account nodig hebben.",
  },
  {
    q: 'Hoe lang duurt het om te beginnen?',
    a: 'Twee minuten. E-mailadres invullen, jullie bruiloft instellen en de persoonlijke tijdlijn staat klaar. Alles werkt meteen.',
  },
]

/* ──────────────────────────── Bouwstenen ───────────────────────────── */

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

/** Fade-in bij scrollen, in de geest van de zachte overgangen op rileygrey.com. */
function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.12 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-premium ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  )
}

function EmailCta({
  tone = 'light',
  value,
  onChange,
  onSubmit,
  className = '',
}: {
  tone?: 'light' | 'dark'
  value: string
  onChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  className?: string
}) {
  const frame =
    tone === 'light'
      ? 'border border-gray-200 bg-white shadow-sm focus-within:border-rose-300 focus-within:ring-2 focus-within:ring-rose-600/20'
      : 'border border-white/20 bg-white/10 backdrop-blur-sm focus-within:border-white/40'
  const input =
    tone === 'light'
      ? 'text-rhino-900 placeholder:text-gray-400'
      : 'text-white placeholder:text-rhino-300'
  return (
    <form onSubmit={onSubmit} className={`flex items-center rounded-full p-1.5 transition-all ${frame} ${className}`}>
      <input
        type="email"
        placeholder="jullie@email.nl"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`min-w-0 flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none ${input}`}
        aria-label="E-mailadres"
      />
      <Button type="submit" size="sm" className="shrink-0 rounded-full">
        Begin gratis
      </Button>
    </form>
  )
}

function ComparisonMark({ value }: { value: boolean | 'half' }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-rose-600" aria-label="Ja" />
  if (value === 'half') return <Minus className="mx-auto h-4 w-4 text-gray-300" aria-label="Deels" />
  return <X className="mx-auto h-4 w-4 text-gray-300" aria-label="Nee" />
}

/* ─────────────────────────── Product-mockups ───────────────────────── */
/* Gestileerde, met CSS opgebouwde schermen — laten zien in plaats van
   vertellen, zoals de devicemockups op rileygrey.com. */

function MockFrame({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
      <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
        <span className="ml-3 truncate text-[11px] text-gray-400">{title}</span>
      </div>
      {children}
    </div>
  )
}

function HeroMockup() {
  return (
    <MockFrame title="onstrouwplan.nl/bruiloft">
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        <div className="rounded-lg bg-rhino-800 p-4 text-white sm:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-serif text-xl">Emma &amp; Daan</p>
              <p className="mt-0.5 text-xs text-rhino-300">Zaterdag 14 juni 2026 · Kasteel Wijenburg</p>
            </div>
            <div className="text-right">
              <p className="font-serif text-3xl leading-none">142</p>
              <p className="text-[11px] uppercase tracking-wide text-rhino-300">dagen te gaan</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-100 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Taken</p>
          <p className="mt-1 font-serif text-2xl text-rhino-900">28 van 47 afgerond</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full w-[60%] rounded-full bg-rose-500" />
          </div>
          <p className="mt-2 text-xs text-gray-400">Deze maand: proefdiner plannen</p>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-600">
            <Sparkles className="h-3 w-3" /> AI-advies
          </p>
          <p className="mt-1.5 text-sm leading-snug text-rhino-900">
            Vraag deze week offertes aan bij fotografen — populaire data zitten 9 maanden vooruit vol.
          </p>
        </div>
      </div>
    </MockFrame>
  )
}

function AIMockup() {
  const modules = [
    { name: 'Taken', status: 'Op schema', tone: 'text-emerald-300' },
    { name: 'Budget', status: 'Actie vereist', tone: 'text-amber-300' },
    { name: 'Gasten', status: 'Op schema', tone: 'text-emerald-300' },
    { name: 'Leveranciers', status: 'Kritiek', tone: 'text-rose-300' },
  ]
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-rhino-900/60 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-white">
          <Sparkles className="h-4 w-4 text-rose-300" />
          AI Wedding Planner
        </p>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-rhino-200">zojuist bijgewerkt</span>
      </div>
      <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="mx-auto flex h-28 w-28 flex-col items-center justify-center rounded-full border-4 border-rose-400/80 bg-rhino-800">
          <span className="font-serif text-4xl text-white">86</span>
          <span className="text-[10px] uppercase tracking-wide text-rhino-300">score</span>
        </div>
        <ul className="space-y-2.5">
          {modules.map((m) => (
            <li key={m.name} className="flex items-center justify-between rounded-lg bg-white/5 px-3.5 py-2.5">
              <span className="text-sm text-rhino-100">{m.name}</span>
              <span className={`text-xs font-medium ${m.tone}`}>{m.status}</span>
            </li>
          ))}
        </ul>
        <div className="rounded-lg border border-rose-300/30 bg-rose-400/10 p-4 sm:col-span-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-200">Eerstvolgende actie · kritiek</p>
          <p className="mt-1.5 text-sm leading-snug text-white">
            De DJ is nog niet vastgelegd terwijl de trouwdatum over 5 maanden is. Vergelijk deze week de twee offertes in jullie lijst.
          </p>
        </div>
      </div>
    </div>
  )
}

function TakenMockup() {
  const taken = [
    { t: 'Locatie bezichtigen en vastleggen', done: true },
    { t: 'Trouwambtenaar regelen', done: true },
    { t: 'Save-the-dates versturen', done: true },
    { t: 'Offertes fotografen vergelijken', done: false },
    { t: 'Proefdiner plannen', done: false },
  ]
  return (
    <MockFrame title="onstrouwplan.nl/bruiloft/taken">
      <div className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">9 maanden te gaan</p>
        <ul className="mt-3 space-y-2.5">
          {taken.map(({ t, done }) => (
            <li key={t} className="flex items-center gap-3 rounded-lg border border-gray-100 px-3.5 py-2.5">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  done ? 'border-rose-500 bg-rose-500 text-white' : 'border-gray-300'
                }`}
              >
                {done && <Check className="h-3 w-3" />}
              </span>
              <span className={`text-sm ${done ? 'text-gray-400 line-through' : 'text-rhino-900'}`}>{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </MockFrame>
  )
}

function BudgetMockup() {
  const items = [
    { c: 'Locatie & catering', v: '€ 7.200', pct: 'w-[80%]', bar: 'bg-rhino-500' },
    { c: 'Fotografie & video', v: '€ 2.400', pct: 'w-[55%]', bar: 'bg-rose-400' },
    { c: 'Kleding & ringen', v: '€ 1.850', pct: 'w-[40%]', bar: 'bg-rhino-300' },
    { c: 'Muziek & entertainment', v: '€ 950', pct: 'w-[25%]', bar: 'bg-rose-300' },
  ]
  return (
    <MockFrame title="onstrouwplan.nl/bruiloft/budget">
      <div className="p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Uitgegeven</p>
            <p className="font-serif text-3xl text-rhino-900">€ 12.400</p>
          </div>
          <p className="text-sm text-gray-400">
            van <span className="font-medium text-rhino-900">€ 15.000</span>
          </p>
        </div>
        <ul className="mt-5 space-y-3.5">
          {items.map(({ c, v, pct, bar }) => (
            <li key={c}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-rhino-900">{c}</span>
                <span className="text-gray-500">{v}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full rounded-full ${bar} ${pct}`} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </MockFrame>
  )
}

function RsvpMockup() {
  return (
    <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-[2rem] border-[6px] border-rhino-900 bg-white shadow-xl">
      <div className="bg-rhino-50 px-5 pb-6 pt-7 text-center">
        <p className="text-[10px] uppercase tracking-[0.2em] text-rose-600">Jullie zijn uitgenodigd</p>
        <p className="mt-2 font-serif text-2xl text-rhino-900">Emma &amp; Daan</p>
        <p className="mt-1 text-xs text-gray-500">14 juni 2026 · Echteld</p>
      </div>
      <div className="space-y-3 p-5">
        <p className="text-center text-sm font-medium text-rhino-900">Zijn jullie erbij?</p>
        <div className="rounded-full bg-rose-600 py-2.5 text-center text-sm font-semibold text-white shadow-sm">
          Ja, wij komen!
        </div>
        <div className="rounded-full border border-gray-200 py-2.5 text-center text-sm text-gray-500">
          Helaas niet
        </div>
        <div className="rounded-lg border border-gray-100 px-3.5 py-2.5 text-xs text-gray-400">
          Dieetwensen of allergieën…
        </div>
      </div>
    </div>
  )
}

function WebsiteMockup() {
  return (
    <MockFrame title="onstrouwplan.nl/trouwen/emma-en-daan">
      <div className="bg-rhino-50">
        <div className="px-6 pb-8 pt-10 text-center">
          <p className="text-[10px] uppercase tracking-[0.25em] text-gray-400">Wij gaan trouwen</p>
          <p className="mt-3 font-serif text-4xl text-rhino-900">
            Emma <span className="italic text-rose-600">&amp;</span> Daan
          </p>
          <p className="mt-2 text-sm text-gray-500">Zaterdag 14 juni 2026 — Kasteel Wijenburg, Echteld</p>
          <div className="mx-auto mt-5 inline-flex rounded-full bg-rose-600 px-5 py-2 text-xs font-semibold text-white shadow-sm">
            Laat ons weten of je komt
          </div>
        </div>
        <div className="flex items-center justify-center gap-5 border-t border-rhino-100 bg-white px-4 py-3 text-[11px] text-gray-500">
          {['Welkom', 'Programma', 'Locatie', 'RSVP', 'Cadeaulijst'].map((item, i) => (
            <span key={item} className={i === 0 ? 'font-semibold text-rhino-900' : ''}>
              {item}
            </span>
          ))}
        </div>
      </div>
    </MockFrame>
  )
}

function DraaiboekMockup() {
  const rows = [
    { t: '14:00', a: 'Ceremonie in de kasteeltuin', who: 'Trouwambtenaar' },
    { t: '15:30', a: 'Toost & fotomoment', who: 'Fotograaf' },
    { t: '18:00', a: 'Diner geserveerd', who: 'Catering' },
    { t: '21:00', a: 'Openingsdans & feest', who: 'DJ' },
  ]
  return (
    <MockFrame title="onstrouwplan.nl/bruiloft/draaiboek">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">De grote dag</p>
          <span className="rounded-full bg-rhino-50 px-2.5 py-1 text-[11px] text-rhino-700">
            Gedeeld met 4 personen
          </span>
        </div>
        <ul className="mt-4 space-y-0">
          {rows.map(({ t, a, who }, i) => (
            <li key={t} className={`flex gap-4 py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
              <span className="w-12 shrink-0 font-serif text-base text-rose-600">{t}</span>
              <div>
                <p className="text-sm text-rhino-900">{a}</p>
                <p className="text-xs text-gray-400">{who}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </MockFrame>
  )
}

/* ─────────────────────────────── Pagina ────────────────────────────── */

export function Landing() {
  const router = useRouter()
  const currentUser = useBruiloftStore((s) => s.currentUser)
  const [emailInput, setEmailInput] = React.useState('')
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [openFaq, setOpenFaq] = React.useState<number | null>(0)

  React.useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  function startWithEmail(e: React.FormEvent) {
    e.preventDefault()
    const email = emailInput.trim()
    // Ingelogde gebruiker: sla stap 1 (account aanmaken) over.
    if (currentUser) {
      router.push('/aanmelden')
      return
    }
    router.push(email ? `/aanmelden?email=${encodeURIComponent(email)}` : '/aanmelden')
  }

  function start() {
    router.push('/aanmelden')
  }

  return (
    <div className="overflow-x-hidden bg-white">

      {/* Mobiel menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden">
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
            {NAV_LINKS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="rounded-md px-3 py-3 text-base font-medium text-rhino-800 hover:bg-gray-50"
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </a>
            ))}
            {!currentUser && (
              <Link
                href="/inloggen"
                className="rounded-md px-3 py-3 text-base font-medium text-rhino-800 hover:bg-gray-50"
                onClick={() => setMenuOpen(false)}
              >
                Inloggen
              </Link>
            )}
          </nav>
          <div className="border-t border-gray-100 p-4">
            <Button
              className="w-full rounded-full"
              onClick={() => {
                setMenuOpen(false)
                start()
              }}
            >
              {currentUser ? 'Trouwplan aanmaken' : 'Begin gratis'}
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
          <nav className="hidden items-center gap-7 lg:flex">
            {NAV_LINKS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="text-sm font-medium text-rhino-700 transition-colors hover:text-rhino-900"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-4 lg:flex">
            {currentUser ? (
              <button
                type="button"
                onClick={start}
                className="flex items-center gap-2.5 rounded-full border border-gray-200 bg-white py-1.5 pl-1.5 pr-4 text-sm font-medium text-rhino-800 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-xs font-semibold text-white">
                  {(currentUser.displayName || currentUser.email || '?').slice(0, 1).toUpperCase()}
                </span>
                {currentUser.displayName || currentUser.email}
              </button>
            ) : (
              <>
                <Link
                  href="/inloggen"
                  className="text-sm font-medium text-rhino-700 transition-colors hover:text-rhino-900"
                >
                  Inloggen
                </Link>
                <Button size="sm" className="rounded-full" onClick={start}>
                  Begin gratis
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          {/* Mobiel hamburger */}
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-md text-rhino-700 hover:bg-gray-100 lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Menu openen"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-rhino-50 px-4 pt-20 sm:px-6 lg:pt-28">
        <div className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] -translate-y-1/4 translate-x-1/3 rounded-full bg-rose-200/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[400px] w-[400px] -translate-x-1/3 translate-y-1/3 rounded-full bg-rhino-200/25 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center">
          <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.15em] text-rose-600">
            Volledig gratis · Zonder reclame · Met persoonlijk AI-advies
          </p>

          <h1 className="font-serif text-5xl font-medium leading-[1.02] tracking-tight text-rhino-900 sm:text-7xl lg:text-8xl">
            Plan jullie bruiloft{' '}
            <span className="italic text-rose-600 underline decoration-rose-300 underline-offset-4">
              zonder stress.
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-gray-600">
            Taken, budget, gasten, trouwwebsite én een AI-weddingplanner die met jullie meedenkt —
            alles op één plek, volledig in het Nederlands.
          </p>

          <EmailCta
            tone="light"
            value={emailInput}
            onChange={setEmailInput}
            onSubmit={startWithEmail}
            className="mx-auto mt-9 max-w-md"
          />

          <p className="mt-3 text-xs text-gray-400">Geen creditcard. Geen installatie. Gewoon beginnen.</p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
            {['100% gratis', 'Zonder reclame', 'Volledig Nederlands'].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-rose-500" />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Productmockup zoals de devicepresentatie op rileygrey.com */}
        <Reveal className="relative mx-auto mt-14 max-w-3xl pb-0">
          <HeroMockup />
        </Reveal>
        <div className="h-16 lg:h-24" />
      </section>

      {/* ── PRODUCTFEITEN ── */}
      <section className="border-b border-gray-100 px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 text-center md:grid-cols-4">
          {[
            ['€ 0', 'voor altijd, alles inbegrepen'],
            ['47+', 'taken klaar op jullie tijdlijn'],
            ['8', 'modules — één overzicht'],
            ['2 min', 'en jullie plan staat klaar'],
          ].map(([big, small]) => (
            <div key={big}>
              <p className="font-serif text-4xl font-medium text-rhino-900">{big}</p>
              <p className="mt-1 text-xs text-gray-400">{small}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURE CARDS ── */}
      <section id="functies" className="scroll-mt-16 px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-4xl font-medium tracking-tight text-rhino-900 sm:text-5xl lg:text-6xl">
              Een bruiloft plannen is veel.<br />
              <span className="italic text-rose-600">Wij maken het overzichtelijk.</span>
            </h2>
            <p className="mt-5 text-lg text-gray-500">
              Alles wat er bij jullie grote dag komt kijken, in één app die de losse
              spreadsheets, notities en groepsapps vervangt.
            </p>
          </Reveal>
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURE_CARDS.map(({ icon: Icon, label, title, desc, href }, i) => (
              <Reveal key={label} delay={i * 80}>
                <a
                  href={href}
                  className="group flex h-full flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-rose-200 hover:shadow-lg"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">{label}</p>
                  <p className="mt-2 font-serif text-xl font-medium leading-snug text-rhino-900">{title}</p>
                  <p className="mt-2.5 flex-1 text-sm leading-relaxed text-gray-500">{desc}</p>
                  <p className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-rose-600">
                    Bekijk
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </p>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI WEDDINGPLANNER ── */}
      <section id="ai" className="scroll-mt-16 bg-rhino-800 px-4 py-24 text-white sm:px-6 lg:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center">
            <Reveal>
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-rose-300/30 bg-rose-400/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-200">
                <Sparkles className="h-3.5 w-3.5" />
                AI Wedding Planner
              </p>
              <h2 className="font-serif text-4xl font-medium tracking-tight sm:text-5xl lg:text-6xl">
                Alsof je een weddingplanner hebt.{' '}
                <span className="italic text-rose-300">Maar dan gratis.</span>
              </h2>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-rhino-200">
                Een professionele weddingplanner kost al snel duizenden euro&apos;s. Onze AI kijkt —
                net als een planner — naar jullie complete voorbereiding en vertelt precies waar
                jullie staan en wat de volgende stap is.
              </p>
              <ul className="mt-9 space-y-6">
                {AI_POINTS.map(({ title, desc }) => (
                  <li key={title} className="flex gap-4">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-rose-300" />
                    <div>
                      <p className="font-medium text-white">{title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-rhino-200">{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-10">
                <Button className="rounded-full" onClick={start}>
                  Vraag jullie eerste AI-advies
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <AIMockup />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── TAKEN ── */}
      <section id="taken" className="scroll-mt-16 px-4 py-24 sm:px-6">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center">
          <Reveal className="lg:order-2">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-rose-600">
              Tijdlijn &amp; taken
            </p>
            <h2 className="font-serif text-4xl font-medium tracking-tight text-rhino-900 sm:text-5xl">
              Altijd weten wat er <span className="italic text-rose-600">nu</span> moet gebeuren
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-gray-600">
              Vul jullie trouwdatum in en er staat direct een complete planning klaar: 47+ taken,
              slim verdeeld over de maanden tot de grote dag. Elke maand precies de juiste taken —
              niet alles tegelijk, want dat werkt niet.
            </p>
            <ul className="mt-7 space-y-3">
              {[
                'Automatisch gegenereerd op basis van jullie trouwdatum',
                'Taken toewijzen aan je partner of familie',
                'Reageren en meedenken per taak',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-gray-700">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120} className="lg:order-1">
            <TakenMockup />
          </Reveal>
        </div>
      </section>

      {/* ── BUDGET ── */}
      <section id="budget" className="scroll-mt-16 bg-rhino-50 px-4 py-24 sm:px-6">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-rose-600">
              Budget &amp; leveranciers
            </p>
            <h2 className="font-serif text-4xl font-medium tracking-tight text-rhino-900 sm:text-5xl">
              Geen verrassingen.<br />
              <span className="italic text-rose-600">Wel ruimte over.</span>
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-gray-600">
              Het gemiddelde Nederlandse bruidspaar geeft zo&apos;n €15.000 uit. Houd elke euro bij —
              van offerte tot aanbetaling tot eindafrekening — per categorie en per leverancier.
              De AI signaleert waar het budget uit de pas loopt.
            </p>
            <ul className="mt-7 space-y-3">
              {[
                'Uitgaven per categorie, met grafieken',
                'Offertes en boekingsstatus per leverancier',
                'Betaald, aanbetaald en nog openstaand in één oogopslag',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-gray-700">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <BudgetMockup />
          </Reveal>
        </div>
      </section>

      {/* ── GASTEN & RSVP ── */}
      <section id="gasten" className="scroll-mt-16 px-4 py-24 sm:px-6">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center">
          <Reveal className="lg:order-2">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-rose-600">
              Gasten, RSVP &amp; tafels
            </p>
            <h2 className="font-serif text-4xl font-medium tracking-tight text-rhino-900 sm:text-5xl">
              Eindelijk iedereen die <span className="italic text-rose-600">gewoon reageert</span>
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-gray-600">
              Verstuur uitnodigingen met een persoonlijke RSVP-link. Gasten reageren in tien
              seconden — inclusief dieetwensen — zonder account of app. Jullie gastenlijst werkt
              zichzelf bij, tot en met de tafelindeling.
            </p>
            <ul className="mt-7 space-y-3">
              {[
                'Digitale uitnodigingen per e-mail',
                "RSVP's en dieetwensen automatisch verzameld",
                'Tafelindeling met drag & drop',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-gray-700">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120} className="lg:order-1">
            <RsvpMockup />
          </Reveal>
        </div>
      </section>

      {/* ── TROUWWEBSITE & CADEAULIJST ── */}
      <section id="website" className="scroll-mt-16 bg-rhino-50 px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-rose-600">
              Trouwwebsite &amp; cadeaulijst
            </p>
            <h2 className="font-serif text-4xl font-medium tracking-tight text-rhino-900 sm:text-5xl lg:text-6xl">
              Eén link voor jullie gasten.<br />
              <span className="italic text-rose-600">Daar staat alles.</span>
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-gray-600">
              Een persoonlijke trouwwebsite met het programma, de locatie, foto&apos;s en praktische
              info — in jullie eigen stijl en kleuren. Gasten RSVP&apos;en er direct en vinden er de
              cadeaulijst, inclusief bijdragen aan jullie huwelijksreis.
            </p>
          </Reveal>
          <Reveal delay={120} className="mx-auto mt-12 max-w-3xl">
            <WebsiteMockup />
          </Reveal>
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { icon: Globe, t: 'Eigen webadres en huisstijl' },
              { icon: Users, t: 'RSVP rechtstreeks op de site' },
              { icon: Gift, t: 'Cadeaulijst en huwelijkspot' },
            ].map(({ icon: Icon, t }) => (
              <div key={t} className="flex items-center gap-3 rounded-xl border border-rhino-100 bg-white px-4 py-3.5 shadow-xs">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-rhino-900">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DRAAIBOEK & SAMENWERKEN ── */}
      <section className="px-4 py-24 sm:px-6">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-rose-600">
              Draaiboek &amp; samenwerken
            </p>
            <h2 className="font-serif text-4xl font-medium tracking-tight text-rhino-900 sm:text-5xl">
              Op de dag zelf hoeft <span className="italic text-rose-600">niemand</span> jullie iets te vragen
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-gray-600">
              Zet de hele trouwdag vast in een draaiboek en deel het met leveranciers, getuigen en
              familie. En plan in de maanden ervoor sámen: nodig je partner of ouders uit en kijk
              realtime naar hetzelfde overzicht.
            </p>
            <ul className="mt-7 space-y-3">
              {[
                'Minuut-tot-minuut planning van de trouwdag',
                'Deelbaar met leveranciers en familie',
                'Samen plannen met rollen en rechten',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-gray-700">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <DraaiboekMockup />
          </Reveal>
        </div>
      </section>

      {/* ── VERGELIJKING ── */}
      <section className="border-t border-gray-100 px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-4xl font-medium tracking-tight text-rhino-900 sm:text-5xl">
              De spreadsheet kan met pensioen
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Alles wat losse tools half doen, doet Ons Trouwplan in één keer goed.
            </p>
          </Reveal>
          <Reveal delay={100} className="mt-12 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-4 pr-4 text-left font-medium text-gray-400" />
                  <th className="rounded-t-xl bg-rhino-50 px-4 py-4 text-center">
                    <span className="font-serif text-base font-medium text-rhino-900">Ons Trouwplan</span>
                    <span className="mt-0.5 block text-[11px] font-normal text-rose-600">€ 0</span>
                  </th>
                  <th className="px-4 py-4 text-center font-medium text-gray-500">
                    Spreadsheet
                    <span className="mt-0.5 block text-[11px] font-normal text-gray-400">veel handwerk</span>
                  </th>
                  <th className="px-4 py-4 text-center font-medium text-gray-500">
                    Betaalde apps
                    <span className="mt-0.5 block text-[11px] font-normal text-gray-400">vaak Engelstalig</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map(({ feature, us, sheet, paid }, i) => (
                  <tr key={feature} className={i < COMPARISON.length - 1 ? 'border-b border-gray-100' : ''}>
                    <td className="py-3.5 pr-4 text-gray-700">{feature}</td>
                    <td className={`bg-rhino-50 px-4 py-3.5 ${i === COMPARISON.length - 1 ? 'rounded-b-xl' : ''}`}>
                      <ComparisonMark value={us} />
                    </td>
                    <td className="px-4 py-3.5">
                      <ComparisonMark value={sheet} />
                    </td>
                    <td className="px-4 py-3.5">
                      <ComparisonMark value={paid} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </div>
      </section>

      {/* ── GRATIS / "PRICING" ── */}
      <section id="gratis" className="scroll-mt-16 bg-rhino-800 px-4 py-24 text-white sm:px-6 lg:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center">
            <Reveal>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-rose-300">
                Geen addertje onder het gras
              </p>
              <h2 className="font-serif text-4xl font-medium tracking-tight sm:text-5xl lg:text-6xl">
                Gratis. Echt gratis.<br />
                <span className="italic text-rose-300">En zonder reclame.</span>
              </h2>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-rhino-200">
                Trouwen is al duur genoeg. Achter Ons Trouwplan zit geen verdienmodel: geen
                advertenties, geen premium-versie, geen verkoop van jullie gegevens en geen
                functies die ineens achter een betaalmuur verdwijnen.
              </p>
              <div className="mt-9">
                <EmailCta
                  tone="dark"
                  value={emailInput}
                  onChange={setEmailInput}
                  onSubmit={startWithEmail}
                  className="max-w-sm"
                />
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="rounded-2xl border border-white/10 bg-white p-8 text-rhino-900 shadow-xl">
                <div className="flex items-baseline justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400">
                    Alles inbegrepen
                  </p>
                  <p>
                    <span className="font-serif text-5xl font-medium">€ 0</span>
                    <span className="ml-1.5 text-sm text-gray-400">voor altijd</span>
                  </p>
                </div>
                <ul className="mt-6 space-y-2.5">
                  {INCLUDED.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button className="mt-7 w-full rounded-full" size="lg" onClick={start}>
                  Maak gratis jullie account
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="mt-3 text-center text-xs text-gray-400">Geen creditcard nodig</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <p className="mb-12 text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400">
              Stellen die jullie voorgingen
            </p>
          </Reveal>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            {TESTIMONIALS.map(({ name, text, date }, i) => (
              <Reveal key={name} delay={i * 100}>
                <figure>
                  <div className="mb-3 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="h-3 w-3 fill-rose-500 text-rose-500" />
                    ))}
                  </div>
                  <blockquote className="text-sm leading-relaxed text-gray-600">&ldquo;{text}&rdquo;</blockquote>
                  <figcaption className="mt-5 border-t border-gray-100 pt-4">
                    <p className="font-serif text-base font-medium text-rhino-900">{name}</p>
                    <p className="text-xs text-gray-400">{date}</p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOE HET WERKT ── */}
      <section className="border-t border-gray-100 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <h2 className="mb-12 text-center font-serif text-4xl font-medium tracking-tight text-rhino-900 sm:text-5xl">
              Vanavond nog een compleet trouwplan
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {STEPS.map(({ num, title, desc }, i) => (
              <Reveal key={num} delay={i * 100} className="text-center">
                <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-rose-600 font-serif text-xl text-white shadow-sm">
                  {num}
                </div>
                <h3 className="font-serif text-xl font-medium text-rhino-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="scroll-mt-16 border-t border-gray-100 px-4 py-24 sm:px-6">
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
                  aria-expanded={openFaq === i}
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
        <Reveal className="mx-auto max-w-4xl">
          <div className="overflow-hidden rounded-3xl bg-rhino-800 px-8 py-20 text-center text-white">
            <CalendarHeart className="mx-auto mb-6 h-8 w-8 text-rose-300" />
            <h2 className="font-serif text-4xl font-medium tracking-tight sm:text-5xl lg:text-6xl">
              De mooiste dag van jullie leven<br />
              <span className="italic text-rose-300">begint met een goed plan.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-rhino-200">
              Over twee minuten staat jullie persoonlijke trouwplan klaar — inclusief AI-advies.
            </p>
            <EmailCta
              tone="dark"
              value={emailInput}
              onChange={setEmailInput}
              onSubmit={startWithEmail}
              className="mx-auto mt-8 max-w-md"
            />
            <p className="mt-4 text-sm text-rhino-400">Gratis. Zonder reclame. Zonder creditcard.</p>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white px-4 pb-10 pt-14 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
            <div>
              <span className="flex items-center gap-2.5 font-serif text-base font-medium text-rhino-900">
                <BrandMark tone="dark" />
                Ons Trouwplan
              </span>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-400">
                De gratis Nederlandse trouwplanner met AI — van eerste checklist tot de laatste dans.
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Functies</p>
              <ul className="mt-4 space-y-2.5 text-sm text-gray-500">
                {[
                  ['#taken', 'Tijdlijn & taken'],
                  ['#budget', 'Budget & leveranciers'],
                  ['#gasten', 'Gasten & RSVP'],
                  ['#website', 'Trouwwebsite & cadeaulijst'],
                  ['#ai', 'AI Wedding Planner'],
                ].map(([href, label]) => (
                  <li key={href}>
                    <a href={href} className="transition-colors hover:text-rhino-900">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Account</p>
              <ul className="mt-4 space-y-2.5 text-sm text-gray-500">
                <li>
                  <button type="button" onClick={start} className="transition-colors hover:text-rhino-900">
                    Gratis account aanmaken
                  </button>
                </li>
                <li>
                  <Link href="/inloggen" className="transition-colors hover:text-rhino-900">
                    Inloggen
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-400">
              Gratis te gebruiken · Zonder reclame · Volledig in het Nederlands
            </p>
            <p className="flex gap-4 text-xs text-gray-400">
              <Link href="/privacy" className="transition-colors hover:text-rhino-900">
                Privacy
              </Link>
              <Link href="/voorwaarden" className="transition-colors hover:text-rhino-900">
                Algemene voorwaarden
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
