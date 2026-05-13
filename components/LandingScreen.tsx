'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import BrandLogo from './BrandLogo'
import { AGENTS, ALL_AGENT_IDS, MANAGER_NAME, MANAGER_TITLE } from '@/lib/agents'

type Props = {
  onStartGuest: () => void
}

const MANAGER_IMG = '/agents/jeroen.png'
const AGENT_IMG: Record<string, string> = {
  brand: '/agents/sanne.png',
  content: '/agents/daan.png',
  performance: '/agents/ravi.png',
  crm: '/agents/lotte.png',
  ads: '/agents/mark.png',
  data: '/agents/yara.png',
}

export default function LandingScreen({ onStartGuest }: Props) {
  return (
    <main className="min-h-screen bg-cream-200 text-ink-700">
      {/* Top bar */}
      <header className="max-w-6xl mx-auto px-6 pt-6 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-ink-700">
          <BrandLogo size={18} className="text-clay-600" />
          <span className="font-serif text-lg tracking-tight">Marketing Sessie</span>
        </div>
        <Link
          href="/login"
          className="text-sm text-ink-500 hover:text-ink-700 transition-colors"
        >
          Inloggen
        </Link>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="grid md:grid-cols-12 gap-10 md:gap-14 items-center">
          {/* Copy */}
          <div className="md:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cream-50 border border-cream-500 text-xs text-ink-500 mb-6">
              <Sparkles size={12} className="text-clay-600" />
              <span>Een compleet AI-marketingbureau, op afroep</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl leading-[1.05] tracking-tight text-ink-800">
              Jouw eigen marketingteam,
              <br />
              <span className="text-clay-600">vanavond aan tafel.</span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-ink-600 leading-relaxed max-w-2xl">
              Stel je marketingvraag aan een Marketing Manager en zes specialisten —
              merk, content, performance, CRM, advertenties en data. Eén sessie,
              één gesprek, één plan.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <button
                onClick={onStartGuest}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-clay-500 hover:bg-clay-600 text-white font-medium shadow-sm transition-colors"
              >
                Begin een sessie
                <ArrowRight size={18} />
              </button>
              <Link
                href="/login"
                className="text-sm text-ink-600 hover:text-ink-800 underline decoration-cream-500 hover:decoration-ink-500 underline-offset-4 transition-colors"
              >
                Ik heb al een account
              </Link>
            </div>

            <p className="mt-4 text-xs text-ink-400">
              Geen account nodig · direct aan tafel
            </p>
          </div>

          {/* Team fan */}
          <div className="md:col-span-5 relative">
            <TeamFan />
          </div>
        </div>
      </section>

      {/* Specialisten */}
      <section className="max-w-6xl mx-auto px-6 pb-20 md:pb-28">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-2">
              Het bureau
            </p>
            <h2 className="font-serif text-2xl md:text-3xl text-ink-800">
              Eén manager, zes specialisten.
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Manager kaart, prominent */}
          <SpecialistCard
            img={MANAGER_IMG}
            name={MANAGER_NAME}
            title={MANAGER_TITLE}
            tagline="Eerste aanspreekpunt en eindverantwoordelijke."
            accent="text-clay-700"
            featured
          />

          {ALL_AGENT_IDS.map((id) => {
            const a = AGENTS[id]
            return (
              <SpecialistCard
                key={id}
                img={AGENT_IMG[id]}
                name={a.name}
                title={a.title}
                tagline={a.description.split('.')[0] + '.'}
                accent={a.color}
              />
            )
          })}
        </div>
      </section>

      {/* Zo werkt het */}
      <section className="bg-cream-50 border-t border-cream-500">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs uppercase tracking-[0.18em] text-ink-400 mb-2">
              Zo werkt een sessie
            </p>
            <h2 className="font-serif text-2xl md:text-3xl text-ink-800">
              In drie stappen van vraag naar plan.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <StepCard
              n="01"
              title="Kies je team"
              body="Selecteer welke specialisten je aan tafel wil. Pak het hele bureau of alleen wie je nodig hebt voor dit vraagstuk."
            />
            <StepCard
              n="02"
              title="Stel je vraag"
              body="Jeroen leidt het gesprek. De specialisten vullen aan vanuit hun eigen vakgebied, met meningen die elkaar uitdagen."
            />
            <StepCard
              n="03"
              title="Krijg je plan"
              body="Aan het einde van de sessie heb je een onderbouwd advies — geen vrijblijvend lijstje, maar een richting waar je morgen mee verder kan."
            />
          </div>

          <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-5">
            <button
              onClick={onStartGuest}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-clay-500 hover:bg-clay-600 text-white font-medium shadow-sm transition-colors"
            >
              Begin een sessie
              <ArrowRight size={18} />
            </button>
            <Link
              href="/login"
              className="text-sm text-ink-600 hover:text-ink-800 underline decoration-cream-500 hover:decoration-ink-500 underline-offset-4 transition-colors"
            >
              Ik heb al een account
            </Link>
          </div>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-8 text-xs text-ink-400 flex items-center justify-between">
        <span>© Marketing Sessie</span>
        <span className="font-serif italic">een AI-bureau</span>
      </footer>
    </main>
  )
}

function SpecialistCard({
  img,
  name,
  title,
  tagline,
  accent,
  featured = false,
}: {
  img: string
  name: string
  title: string
  tagline: string
  accent: string
  featured?: boolean
}) {
  return (
    <div
      className={[
        'group rounded-2xl bg-cream-50 border border-cream-500 p-5 transition-all',
        'hover:shadow-md hover:-translate-y-0.5',
        featured ? 'sm:col-span-1 ring-1 ring-clay-200' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-cream-200 border border-cream-500">
          <Image
            src={img}
            alt={name}
            fill
            sizes="48px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0">
          <div className={`font-serif text-lg leading-tight ${accent}`}>{name}</div>
          <div className="text-xs text-ink-500 truncate">{title}</div>
        </div>
      </div>
      <p className="text-sm text-ink-600 leading-snug">{tagline}</p>
    </div>
  )
}

function StepCard({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-cream-200 border border-cream-500 p-6">
      <div className="font-serif text-clay-600 text-sm mb-3">{n}</div>
      <h3 className="font-serif text-xl text-ink-800 mb-2">{title}</h3>
      <p className="text-sm text-ink-600 leading-relaxed">{body}</p>
    </div>
  )
}

function TeamFan() {
  // Decoratieve waaier: manager centraal, specialisten eromheen.
  const items: Array<{ src: string; name: string; style: string; ring: string }> = [
    { src: AGENT_IMG.brand, name: 'Sanne', style: 'top-0 left-2 -rotate-[10deg]', ring: 'ring-[#9c4a3a]/30' },
    { src: AGENT_IMG.content, name: 'Daan', style: 'top-4 right-2 rotate-[8deg]', ring: 'ring-[#a8466b]/30' },
    { src: AGENT_IMG.performance, name: 'Ravi', style: 'top-28 left-0 -rotate-[6deg]', ring: 'ring-[#4d7a4b]/30' },
    { src: AGENT_IMG.crm, name: 'Lotte', style: 'top-32 right-0 rotate-[10deg]', ring: 'ring-[#a07823]/30' },
    { src: AGENT_IMG.ads, name: 'Mark', style: 'bottom-2 left-6 -rotate-[8deg]', ring: 'ring-[#2f7373]/30' },
    { src: AGENT_IMG.data, name: 'Yara', style: 'bottom-0 right-8 rotate-[6deg]', ring: 'ring-[#7a5a8c]/30' },
  ]

  return (
    <div className="relative w-full aspect-square max-w-md mx-auto">
      {/* Achtergrond cirkel */}
      <div className="absolute inset-6 rounded-full bg-cream-50 border border-cream-500" />

      {/* Manager in het midden */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-cream-50 shadow-lg ring-2 ring-clay-300/40">
            <Image
              src={MANAGER_IMG}
              alt={MANAGER_NAME}
              width={160}
              height={160}
              className="object-cover w-full h-full"
              priority
            />
          </div>
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-clay-500 text-white text-xs font-medium shadow-sm whitespace-nowrap">
            {MANAGER_NAME} · Manager
          </div>
        </div>
      </div>

      {/* Specialisten eromheen */}
      {items.map((it) => (
        <div key={it.name} className={`absolute ${it.style}`}>
          <div className="flex flex-col items-center">
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-cream-50 shadow-md ring-2 ${it.ring}`}
            >
              <Image
                src={it.src}
                alt={it.name}
                width={96}
                height={96}
                className="object-cover w-full h-full"
              />
            </div>
            <span className="mt-1 text-[11px] font-serif text-ink-700 bg-cream-50/80 px-2 py-0.5 rounded-full border border-cream-500">
              {it.name}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
