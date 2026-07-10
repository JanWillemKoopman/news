'use client'

import { gastTellingen } from '@/lib/bruiloft/derived'
import { capFirst } from '@/lib/utils'
import type { Guest, Wedding } from '@/lib/bruiloft/types'

interface GastenStatsStripProps {
  guests: Guest[]
  wedding: Wedding
}

// Eén gecondenseerde samenvattingsstrip in de stijl van TakenStatsStrip, zodat
// de gastenpagina dezelfde rustige uitstraling krijgt als de takenpagina.
function CircularProgress({ pct }: { pct: number }) {
  const r = 22
  const circumference = 2 * Math.PI * r
  const offset = circumference - (pct / 100) * circumference

  return (
    <svg width={56} height={56} className="shrink-0 -rotate-90">
      <circle cx={28} cy={28} r={r} fill="none" stroke="#e5e7eb" strokeWidth={4} />
      <circle
        cx={28}
        cy={28}
        r={r}
        fill="none"
        stroke="#be123c"
        strokeWidth={4}
        strokeOpacity={0.6}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-500"
      />
      <text
        x={28}
        y={28}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: '28px 28px', fontSize: 11, fontWeight: 500, fill: '#6b7280' }}
      >
        {pct}%
      </text>
    </svg>
  )
}

export function GastenStatsStrip({ guests, wedding }: GastenStatsStripProps) {
  const t = gastTellingen(guests, wedding.gasttypeCategorieen)
  const pct = t.totaal > 0 ? Math.round((t.bevestigd / t.totaal) * 100) : 0

  const nogTeReageren = t.nogNietUitgenodigd + t.uitgenodigd + t.geenReactie
  const subdelen = [
    t.afgemeld > 0 ? `${t.afgemeld} afgemeld` : null,
    nogTeReageren > 0 ? `${nogTeReageren} nog te reageren` : null,
  ].filter(Boolean)

  // Alleen categorieën die daadwerkelijk in gebruik zijn, zodat een nog
  // ongebruikte zelfgemaakte categorie de strip niet onnodig vult.
  const perTypeInGebruik = t.perType.filter((p) => p.totaal > 0)

  return (
    <div className="mb-6 rounded-xl border border-border bg-card shadow-sm">
      {/* Hoofdregel */}
      <div className="flex items-center gap-4 p-3">
        <CircularProgress pct={pct} />

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">RSVP-reacties</p>
          <p className="text-base font-semibold leading-tight text-foreground">
            {t.bevestigd} van {t.totaal} {t.totaal === 1 ? 'gast' : 'gasten'} bevestigd
          </p>
          {subdelen.length > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subdelen.join(' · ')}</p>
          )}
        </div>

        {/* Desktop stat-getallen */}
        <div className="hidden items-center divide-x divide-border sm:flex">
          <StatNum value={t.uitgenodigd} label="uitgenodigd" />
          {perTypeInGebruik.map((p) => (
            <StatNum key={p.type} value={p.totaal} label={capFirst(p.type)} />
          ))}
        </div>
      </div>

      {/* Mobiele stat-rij */}
      <div className="flex flex-wrap divide-x divide-border border-t border-border sm:hidden">
        <StatNumMobile value={t.uitgenodigd} label="uitgenodigd" />
        {perTypeInGebruik.map((p) => (
          <StatNumMobile key={p.type} value={p.totaal} label={capFirst(p.type)} />
        ))}
      </div>
    </div>
  )
}

function StatNum({ value, label }: { value: number; label: string }) {
  return (
    <div className="px-5 text-center">
      <p className="text-xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function StatNumMobile({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex-1 py-2.5 text-center">
      <p className="text-lg font-bold tabular-nums text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
