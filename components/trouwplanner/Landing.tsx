'use client'

import { useState } from 'react'
import { ArrowRight, Heart, CheckCircle2, Users, CalendarDays, Wallet, Star, ChevronRight, ListChecks, Building2 } from 'lucide-react'
import OnboardingWizard from './OnboardingWizard'

const FEATURES = [
  {
    icon: Wallet,
    title: 'Budget beheer',
    desc: 'Stel jullie totaalbudget in en houd elke uitgave bij per categorie. Nooit meer verrassingen.',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: ListChecks,
    title: 'Tijdlijn & taken',
    desc: 'Slimme planning van 12 maanden tot 1 week voor de trouwdag. Vink af wat gedaan is.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: Users,
    title: 'Gastenlijst',
    desc: 'Voeg gasten toe, beheer RSVP\'s en houd bij wie komt, wie afzegt en wie nog niet heeft gereageerd.',
    color: 'bg-violet-50 text-violet-600',
  },
  {
    icon: Building2,
    title: 'Leveranciers',
    desc: 'Bewaar alle contacten — fotograaf, catering, bloemen — en zie in één oogopslag wat al geboekt is.',
    color: 'bg-amber-50 text-amber-600',
  },
]

const STEPS = [
  {
    num: '1',
    title: 'Voer jullie trouwdatum in',
    desc: 'In 30 seconden staat jullie persoonlijke tijdlijn klaar.',
  },
  {
    num: '2',
    title: 'Voeg taken, gasten en budget toe',
    desc: 'Alles werkt direct, zonder account of installatie.',
  },
  {
    num: '3',
    title: 'Sla op wanneer je er klaar voor bent',
    desc: 'Maak een gratis account als je je plan wil bewaren en overal bereiken.',
  },
]

const TESTIMONIALS = [
  {
    name: 'Emma & Daan',
    text: 'Eindelijk een tool die echt overzicht geeft. We hadden al onze leveranciers en het budget in 10 minuten staan.',
    date: 'Getrouwd september 2025',
  },
  {
    name: 'Lisa & Mark',
    text: 'Super handig dat je gewoon kunt beginnen zonder je meteen te registreren. Wij gebruiken het nu al 3 maanden.',
    date: 'Trouwen juni 2026',
  },
  {
    name: 'Sophie & Tim',
    text: 'De takenlijst per maand is goud waard. We wisten precies wat nog gedaan moest worden.',
    date: 'Getrouwd maart 2025',
  },
]

export default function Landing() {
  const [showOnboarding, setShowOnboarding] = useState(false)

  if (showOnboarding) {
    return <OnboardingWizard onBack={() => setShowOnboarding(false)} />
  }

  return (
    <div className="overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-rose-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart size={18} className="text-rose-500 fill-rose-500" />
            <span className="font-semibold text-stone-900 text-sm tracking-tight">Trouwplanner</span>
          </div>
          <button
            onClick={() => setShowOnboarding(true)}
            className="text-sm font-medium text-rose-600 hover:text-rose-700 transition-colors flex items-center gap-1"
          >
            Start gratis
            <ChevronRight size={14} />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-28 pb-20 px-4 sm:px-6 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-rose-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-pink-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-600 text-xs font-semibold px-3 py-1.5 rounded-full border border-rose-200 mb-6">
            <Heart size={12} className="fill-rose-500" />
            Gratis beginnen, altijd
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 leading-[1.1] tracking-tight mb-6">
            Jullie droombruiloft,{' '}
            <span className="text-rose-500">zonder stress</span>
          </h1>

          <p className="text-lg sm:text-xl text-stone-500 max-w-2xl mx-auto mb-8 leading-relaxed">
            Budget, taken, gastenlijst en leveranciers op één plek. Direct beginnen, geen account vereist.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <button
              onClick={() => setShowOnboarding(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-semibold px-8 py-4 rounded-2xl text-base shadow-lg shadow-rose-500/25 hover:shadow-rose-500/35 transition-all duration-200 hover:-translate-y-0.5"
            >
              Start gratis plannen
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-stone-400">
            {['Geen account vereist', 'Direct beginnen', '100% gratis'].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Dashboard preview mockup */}
        <div className="relative max-w-4xl mx-auto mt-16">
          <div className="bg-white rounded-3xl shadow-2xl shadow-stone-200 border border-stone-100 overflow-hidden">
            {/* Mockup header */}
            <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-rose-100 text-xs font-medium uppercase tracking-wider mb-1">Jullie grote dag</p>
                  <p className="text-2xl font-bold">238 dagen</p>
                  <p className="text-rose-200 text-sm mt-0.5">Emma & Daan · 14 september 2026</p>
                </div>
                <CalendarDays size={40} className="text-rose-200/60" />
              </div>
            </div>
            {/* Mockup tabs */}
            <div className="border-b border-stone-100 px-6">
              <div className="flex gap-6">
                {['Taken', 'Budget', 'Gasten', 'Leveranciers'].map((tab, i) => (
                  <button
                    key={tab}
                    className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                      i === 0
                        ? 'border-rose-500 text-rose-600'
                        : 'border-transparent text-stone-400'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            {/* Mockup content */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">9 maanden voor</p>
                {[
                  { done: true, label: 'Trouwlocatie geboekt' },
                  { done: true, label: 'Fotograaf geboekt' },
                  { done: false, label: 'Catering kiezen' },
                  { done: false, label: 'Trouwjurk uitzoeken' },
                ].map(({ done, label }) => (
                  <div key={label} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-stone-50">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-500 border-emerald-500' : 'border-stone-300'}`}>
                      {done && <CheckCircle2 size={12} className="text-white fill-white" />}
                    </div>
                    <span className={`text-sm ${done ? 'line-through text-stone-400' : 'text-stone-700'}`}>{label}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Budget overzicht</p>
                <div className="space-y-2">
                  {[
                    { cat: 'Locatie', amount: 4500, pct: 55 },
                    { cat: 'Catering', amount: 2800, pct: 34 },
                    { cat: 'Fotografie', amount: 1200, pct: 15 },
                  ].map(({ cat, amount, pct }) => (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-stone-600">{cat}</span>
                        <span className="text-stone-500">€{amount.toLocaleString('nl')}</span>
                      </div>
                      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-stone-100 flex justify-between">
                  <span className="text-xs text-stone-500">Totaal gebruikt</span>
                  <span className="text-xs font-semibold text-stone-900">€8.500 / €15.000</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-stone-400 mt-3">Zo ziet jullie persoonlijke planner eruit</p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-4">
              Alles wat jullie nodig hebben
            </h2>
            <p className="text-stone-500 text-lg max-w-xl mx-auto">
              Vier modules, volledig gratis, direct beschikbaar zonder registratie.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="group p-6 rounded-2xl border border-stone-100 hover:border-rose-200 hover:shadow-md transition-all duration-200 bg-white">
                <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center mb-4`}>
                  <Icon size={20} />
                </div>
                <h3 className="font-semibold text-stone-900 mb-2 text-lg">{title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 sm:px-6 bg-stone-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-4">
              In 3 stappen aan de slag
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="text-center">
                <div className="w-12 h-12 rounded-full bg-rose-500 text-white font-bold text-lg flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/25">
                  {num}
                </div>
                <h3 className="font-semibold text-stone-900 mb-2">{title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => setShowOnboarding(true)}
              className="inline-flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold px-8 py-4 rounded-2xl text-base shadow-lg shadow-rose-500/25 hover:shadow-rose-500/35 transition-all duration-200 hover:-translate-y-0.5"
            >
              Start gratis, nu meteen
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={18} className="text-amber-400 fill-amber-400" />
              ))}
            </div>
            <p className="text-2xl font-bold text-stone-900">Meer dan 2.400 koppels</p>
            <p className="text-stone-500 mt-1">plannen hun bruiloft met deze tool</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            {TESTIMONIALS.map(({ name, text, date }) => (
              <div key={name} className="bg-stone-50 rounded-2xl p-6 border border-stone-100">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={13} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-stone-600 text-sm leading-relaxed mb-4">"{text}"</p>
                <div>
                  <p className="font-semibold text-stone-900 text-sm">{name}</p>
                  <p className="text-stone-400 text-xs">{date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 bg-gradient-to-br from-rose-500 to-pink-600">
        <div className="max-w-2xl mx-auto text-center">
          <Heart size={40} className="text-white/30 fill-white/30 mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Jullie verhaal begint hier
          </h2>
          <p className="text-rose-100 text-lg mb-8">
            Geen wachtlijst. Geen creditcard. Geen account. Gewoon beginnen.
          </p>
          <button
            onClick={() => setShowOnboarding(true)}
            className="inline-flex items-center gap-2 bg-white text-rose-600 font-semibold px-8 py-4 rounded-2xl text-base shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-0.5"
          >
            Start nu gratis
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Heart size={15} className="text-rose-400 fill-rose-400" />
            <span className="text-stone-400 text-sm font-medium">Trouwplanner</span>
          </div>
          <p className="text-stone-500 text-xs">Gratis te gebruiken · Geen account vereist · Alle data lokaal opgeslagen</p>
        </div>
      </footer>
    </div>
  )
}
